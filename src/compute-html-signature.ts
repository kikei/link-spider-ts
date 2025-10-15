import crypto from 'crypto';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

/**
 * Extract main content with Readability and hash its normalized
 * text. Fallbacks to <body> text if Readability cannot parse.
 * Lines are wrapped to <=80 cols; comments in English.
 *
 * @param html - Raw HTML string (UTF-8 decoded).
 * @param baseUrl - Base URL (for jsdom URL context).
 * @returns hex signature (sha256), or '' on failure.
 */
function computeHtmlSignature(html: string, baseUrl?: string): string {
  if (!html) return '';

  // Build DOM; set a URL to let relative links resolve if needed.
  const dom = new JSDOM(html, {
    url: baseUrl ?? 'https://example.org',
  });
  const doc = dom.window.document;

  // Let Readability parse the document to extract main content.
  let article;
  try {
    article = new Readability(doc, {
      // tweakable options could be added here if needed
    }).parse();
  } catch {
    article = null;
  }

  // Choose text: Readability textContent or <body> fallback.
  const text =
    article && article.textContent
      ? article.textContent
      : doc.body
        ? (doc.body.textContent ?? '')
        : '';

  // Normalize text to collapse trivial diffs (dates, counters,
  // spaces).
  const norm = String(text)
    .replace(/\r\n?/g, '\n') // normalize newlines
    .replace(/\d+/g, '0') // neutralize numbers (pages/1→pages/0)
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();

  if (!norm) return '';

  // Hash with sha256 to a fixed-size signature.
  return crypto.createHash('sha256').update(norm).digest('hex');
}

export default computeHtmlSignature;
