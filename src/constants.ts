/**
 * File extensions that can be crawled for links.
 */
export const CRAWLABLE_EXTENSIONS = [
  '.html',
  '.htm',
  '.asp',
  '.php',
  '.aspx',
  '.jsp',
  '/',
  '',
];

/**
 * File extensions to exclude from crawling.
 */
export const EXCLUDED_EXTENSIONS: string[] = [];

/**
 * Delay between HTTP requests in milliseconds.
 */
export const CRAWL_DELAY_MS = 1000;
