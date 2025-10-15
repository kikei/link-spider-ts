import fs from 'fs';
import { CRAWL_DELAY_MS } from './constants';
import { prepareStartUrl, normalizeLinks, type Link } from './url-processor';
import { fetchHTML, extractLinks } from './html-fetcher';
import computeHtmlSignature from './compute-html-signature';
import KeyedSet from './KeyedSet';

/**
 * Result of a single crawl operation.
 */
export interface CrawlResult {
  links: Link[];
  signature: string | null;
}

/**
 * Parameters for crawling start.
 */
export interface CrawlingStartParams {
  url: string;
  allowedPrefixes: string[];
  ignoreList: RegExp[];
  stripFragments: boolean;
  stripParams?: string[];
  logStream: fs.WriteStream;
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

  const html = await fetchHTML({ url, logStream });
  if (!html)
    return {
      links: [],
      signature: null,
    };

  const signature = computeHtmlSignature(html);
  const links = extractLinks({
    html,
    currentUrl: url,
  });

  console.log(`Found ${links.length} links on ${url}`);
  return { links, signature };
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
 * @returns Collected set of link objects.
 */
export async function crawlingStart(
  params: CrawlingStartParams
): Promise<KeyedSet<Link>> {
  const {
    url,
    allowedPrefixes,
    ignoreList,
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
    const { links: rawLinks, signature } = await crawl({
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

    linksSet.add(curr);

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

  return linksSet;
}
