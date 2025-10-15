import fs from 'fs';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import { processLink, type Link } from './url-processor';

/**
 * Fetch HTML, decode from CP932, normalize CR/LF.
 * @param params
 * @param params.url - URL to fetch.
 * @param params.logStream - Stream for logging.
 * @returns HTML string or null on error.
 */
export async function fetchHTML({
  url,
  logStream,
}: {
  url: string;
  logStream: fs.WriteStream;
}): Promise<string | null> {
  try {
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());

    // Always decode as CP932 (handles Shift_JIS pages)
    let html = iconv.decode(buf, 'cp932');

    // Normalize CR (\r) to LF (\n) so tags aren't overwritten
    html = html.replace(/\r\n?/g, '\n');

    logStream.write(`Fetched: ${url}\n`);
    return html;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStream.write(`Error fetching ${url}: ${message}\n`);
    return null;
  }
}

/**
 * Extract links from HTML using cheerio.
 * Processes a, frame, and iframe elements.
 * @param params
 * @param params.html - HTML content.
 * @param params.currentUrl - Base URL for resolution.
 * @returns Array of link objects.
 */
export function extractLinks({
  html,
  currentUrl,
}: {
  html: string;
  currentUrl: string;
}): Link[] {
  const $ = cheerio.load(html);
  const out: Link[] = [];

  $('a, frame, iframe').each((_, el) => {
    const attr = el.name === 'a' ? 'href' : 'src';
    const raw = $(el).attr(attr);
    if (!raw) return;

    const link = processLink({ rawValue: raw, currentUrl });
    if (!link) return;

    out.push(link);
  });

  return out;
}
