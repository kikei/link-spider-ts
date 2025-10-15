import path from 'path';
import { URL } from 'url';
import { CRAWLABLE_EXTENSIONS, EXCLUDED_EXTENSIONS } from './constants';

/**
 * Link object with URL and crawlability flag.
 */
export interface Link {
  url: string;
  isCrawlable: boolean;
}

/**
 * Normalize URL by stripping fragments and specified query params.
 * @param url - URL to normalize.
 * @param stripFragments - Remove URL fragment if true.
 * @param stripParams - Query parameters to strip.
 * @returns Normalized URL string.
 */
export function normalizeUrl(
  url: string,
  stripFragments: boolean,
  stripParams?: string[]
): string {
  const u = new URL(url);
  if (stripFragments) {
    u.hash = '';
  }
  if (Array.isArray(stripParams)) {
    stripParams.forEach(param => u.searchParams.delete(param));
  }
  return u.href;
}

/**
 * Prepare start URL by normalizing it.
 * @param params
 * @param params.url - URL to prepare.
 * @param params.stripFragments - Remove fragments.
 * @param params.stripParams - Params to strip.
 * @returns Normalized URL.
 */
export function prepareStartUrl({
  url,
  stripFragments,
  stripParams,
}: {
  url: string;
  stripFragments: boolean;
  stripParams?: string[];
}): string {
  return normalizeUrl(url, stripFragments, stripParams);
}

/**
 * Normalize array of links using normalizeUrl.
 * @param params
 * @param params.rawLinks - Links to normalize.
 * @param params.stripFragments - Remove fragments.
 * @param params.stripParams - Params to strip.
 * @returns Normalized links.
 */
export function normalizeLinks({
  rawLinks,
  stripFragments,
  stripParams,
}: {
  rawLinks: Link[];
  stripFragments: boolean;
  stripParams?: string[];
}): Link[] {
  return rawLinks.map(l => ({
    url: normalizeUrl(l.url, stripFragments, stripParams),
    isCrawlable: l.isCrawlable,
  }));
}

/**
 * Process raw link value to absolute URL and decide crawlability.
 * @param params
 * @param params.rawValue - Raw href/src attribute.
 * @param params.currentUrl - Base URL for resolution.
 * @returns Link object or null if invalid.
 */
export function processLink({
  rawValue,
  currentUrl,
}: {
  rawValue: string;
  currentUrl: string;
}): Link | null {
  try {
    const abs = new URL(rawValue, currentUrl).href;
    const ext = path.extname(new URL(abs).pathname).toLowerCase();
    if (EXCLUDED_EXTENSIONS.includes(ext)) return null;
    return {
      url: abs,
      isCrawlable: CRAWLABLE_EXTENSIONS.includes(ext) || abs.endsWith('/'),
    };
  } catch {
    return null;
  }
}

/**
 * Build list of allowed URL prefixes without protocol.
 * If rawPrefixes is empty, use baseUrl host.
 * @param params
 * @param params.baseUrl - Origin URL to derive host.
 * @param params.rawPrefixes - Additional prefixes without protocol.
 * @returns Unique prefixes (host/path), no protocol/trailing slash.
 */
export function buildAllowedPrefixes({
  baseUrl,
  rawPrefixes,
}: {
  baseUrl: string;
  rawPrefixes?: string[];
}): string[] {
  const set = new Set<string>();

  // If no raw prefixes provided, default to base host
  if (!Array.isArray(rawPrefixes) || rawPrefixes.length === 0) {
    set.add(new URL(baseUrl).host);
  }

  // Add and normalize each raw prefix
  if (Array.isArray(rawPrefixes)) {
    rawPrefixes.forEach(p => {
      const trimmed = p
        .trim()
        .replace(/^[a-z]+:\/\//i, '')
        .replace(/\/$/, '');
      if (trimmed) set.add(trimmed);
    });
  }

  return Array.from(set);
}
