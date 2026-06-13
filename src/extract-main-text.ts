import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

/**
 * Extract main readable content from HTML using Readability,
 * falling back to <body> text when Readability cannot parse.
 * @param params
 * @param params.html - Raw HTML string (UTF-8 decoded).
 * @param params.baseUrl - Base URL for jsdom URL context.
 * @returns Extracted main text, or '' when unavailable.
 */
export function extractMainText({
  html,
  baseUrl,
}: {
  html: string;
  baseUrl?: string;
}): string {
  if (!html) return '';

  const dom = new JSDOM(html, { url: baseUrl ?? 'https://example.org' });
  const doc = dom.window.document;

  let article;
  try {
    article = new Readability(doc).parse();
  } catch {
    article = null;
  }

  if (article && article.textContent) return article.textContent;
  return doc.body ? (doc.body.textContent ?? '') : '';
}
