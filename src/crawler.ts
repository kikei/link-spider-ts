import fs from 'fs';
import { CRAWL_DELAY_MS } from './constants';
import { prepareStartUrl, normalizeLinks, type Link } from './url-processor';
import { fetchHTML, extractLinks } from './html-fetcher';
import { extractMainText } from './extract-main-text';
import computeHtmlSignature from './compute-html-signature';
import { matchKeywords } from './content-filter';
import KeyedSet from './KeyedSet';

/**
 * Result of a single crawl operation.
 */
export interface CrawlResult {
  links: Link[];
  signature: string | null;
  text: string;
  fetched: boolean;
}

/**
 * Parameters for crawling start.
 */
export interface CrawlingStartParams {
  url: string;
  allowedPrefixes: string[];
  ignoreList: RegExp[];
  keywords: string[];
  stripFragments: boolean;
  stripParams?: string[];
  logStream: fs.WriteStream;
}

/**
 * Aggregated output of a full crawl run.
 */
export interface CrawlOutput {
  linksSet: KeyedSet<Link>;
  filteredSet: KeyedSet<Link>;
}

/**
 * Crawl single URL and extract links.
 * @param params
 * @param params.url - URL to crawl.
 * @param params.logStream - Log stream.
 * @returns Crawl result with links and signature.
 */
export async function crawl({
  url,
  logStream,
}: {
  url: string;
  logStream: fs.WriteStream;
}): Promise<CrawlResult> {
  logStream.write(`Crawling: ${url}\n`);
  console.log(`Crawling: ${url}`);

  const result = await fetchHTML({ url, logStream });
  if (result.kind !== 'html')
    return {
      links: [],
      signature: null,
      text: '',
      fetched: false,
    };

  // Extract main text once; reuse for signature and keyword match.
  const text = extractMainText({ html: result.html, baseUrl: url });
  const signature = computeHtmlSignature(text);
  const links = extractLinks({
    html: result.html,
    currentUrl: url,
  });

  console.log(`Found ${links.length} links on ${url}`);
  return { links, signature, text, fetched: true };
}

/**
 * Log crawling progress to console.
 * @param params
 * @param params.count - Current iteration count.
 * @param params.visited - Set of visited URLs.
 * @param params.toVisitSet - Queue of URLs to visit.
 * @param params.linksSet - Set of collected links.
 */
export function logProgress({
  count,
  visited,
  toVisitSet,
  linksSet,
}: {
  count: number;
  visited: Set<string>;
  toVisitSet: KeyedSet<Link>;
  linksSet: KeyedSet<Link>;
}): void {
  const total = visited.size + toVisitSet.size();
  const rate = count / (total || 1);
  console.log(
    [
      'Progress: ',
      `collected: ${linksSet.size()}, `,
      `visited: ${visited.size}, `,
      `remaining: ${toVisitSet.size()} `,
      `${count}/${total} (${(rate * 100).toFixed(2)}%)`,
    ].join('')
  );
}

/**
 * Filter and enqueue links based on allowed prefixes and ignore list.
 * @param params
 * @param params.newLinks - Links from crawl.
 * @param params.visited - Set of visited URLs.
 * @param params.toVisitSet - Queue for upcoming crawls.
 * @param params.allowedPrefixes - Allowed host/path prefixes.
 * @param params.ignoreList - Patterns to ignore.
 * @param params.logStream - Log stream.
 */
export function filterAndQueueLinks({
  newLinks,
  visited,
  toVisitSet,
  allowedPrefixes,
  ignoreList,
  logStream,
}: {
  newLinks: Link[];
  visited: Set<string>;
  toVisitSet: KeyedSet<Link>;
  allowedPrefixes: string[];
  ignoreList: RegExp[];
  logStream: fs.WriteStream;
}): void {
  newLinks.forEach(link => {
    const url = link.url;
    const noProto = url.replace(/^[a-z]+:\/\//i, '');
    const allowed = allowedPrefixes.some(pref => noProto.startsWith(pref));
    const ignored = ignoreList.some(re => re.test(url));

    logStream.write(
      [
        `Link: ${url}`,
        `crawlable: ${link.isCrawlable}`,
        `visited: ${visited.has(url)}`,
        `allowed: ${allowed}`,
        `ignored: ${ignored}`,
      ].join(', ')
    );

    if (link.isCrawlable && !visited.has(url) && allowed && !ignored) {
      toVisitSet.add(link);
    }
  });
}

/**
 * Start crawling from initial URL, following allowed prefixes.
 * @param params - Crawling parameters.
 * @returns Crawling result with matched and filtered links.
 */
export async function crawlingStart(
  params: CrawlingStartParams
): Promise<CrawlOutput> {
  const {
    url,
    allowedPrefixes,
    ignoreList,
    keywords,
    stripFragments,
    stripParams,
    logStream,
  } = params;

  // Initialize visited links
  const visited = new Set<string>();

  // Initialize content signatures to avoid duplicates
  const seenSig = new Set<string>();

  // Initialize collected links
  const linksSet = new KeyedSet<Link>({ keyExtractor: l => l.url });
  const filteredSet = new KeyedSet<Link>({ keyExtractor: l => l.url });

  // Links to crawl
  const toVisitSet = new KeyedSet<Link>({ keyExtractor: l => l.url });

  // Start crawling from the base URL
  const startUrl = prepareStartUrl({ url, stripFragments, stripParams });
  toVisitSet.add({ url: startUrl, isCrawlable: true });

  let count = 0;
  while (toVisitSet.size() > 0) {
    const curr = toVisitSet.pop();
    if (!curr) break;
    const curUrl = curr.url;

    logProgress({ count, visited, toVisitSet, linksSet });
    count++;

    visited.add(curUrl);
    const {
      links: rawLinks,
      signature,
      text,
      fetched,
    } = await crawl({
      url: curUrl,
      logStream,
    });

    console.debug(
      `Signature for ${curUrl}:`,
      signature,
      'seen:',
      signature ? seenSig.has(signature) : false
    );

    // Detect duplicate content loops
    if (signature && seenSig.has(signature)) {
      logStream.write(`Duplicate content signature, skip: ${curUrl}\n`);
      console.log('Skip duplicate content:', curUrl);
      continue;
    }
    if (signature) seenSig.add(signature);

    // Classify only pages whose response was decodable HTML. Non-HTML
    // responses and fetch errors are logged in fetchHTML and excluded
    // from both urls.txt and unmatched.txt. Keyword matching applies
    // only when a keywords file was provided.
    if (fetched) {
      if (keywords.length === 0) {
        linksSet.add(curr);
      } else {
        const { matched, matchedKeywords } = matchKeywords(text, keywords);
        if (matched) {
          linksSet.add(curr);
          logStream.write(`Keywords matched: ${matchedKeywords.join(', ')}\n`);
          console.log(
            `Keywords matched on ${curUrl}: ${matchedKeywords.join(', ')}`
          );
        } else {
          filteredSet.add(curr);
          logStream.write(`Keywords not matched\n`);
          console.log(`Keywords not matched on ${curUrl}`);
        }
      }
    }

    const newLinks = normalizeLinks({
      rawLinks,
      stripFragments,
      stripParams,
    });
    filterAndQueueLinks({
      newLinks,
      visited,
      toVisitSet,
      allowedPrefixes,
      ignoreList,
      logStream,
    });

    await new Promise(r => setTimeout(r, CRAWL_DELAY_MS));
  }

  return { linksSet, filteredSet };
}
