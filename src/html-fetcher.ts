import fs from 'fs';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import Encoding, { type Encoding as EncodingName } from 'encoding-japanese';
import { processLink, type Link } from './url-processor';

const HTML_MEDIA_TYPES = new Set(['text/html', 'application/xhtml+xml']);

const NON_HTML_MEDIA_TYPE_PREFIXES = ['image/', 'audio/', 'video/', 'font/'];

const NON_HTML_MEDIA_TYPES = new Set([
  'application/octet-stream',
  'application/pdf',
  'application/zip',
  'application/gzip',
  'application/x-gzip',
  'application/x-zip-compressed',
]);

const HTML_START_PATTERN =
  /^(<!doctype\s+html\b|<html\b|<head\b|<body\b|<meta\b|<title\b)/i;

/**
 * Detect encoding from Content-Type header, HTML meta tags, BOM, or guess.
 * @param contentType - Content-Type header value.
 * @param buffer - HTML buffer to scan for meta charset.
 * @returns Detected encoding name.
 */
function detectEncoding(contentType: string | null, buffer: Buffer): string {
  // BOM is authoritative when present.
  const bom = detectBomEncoding(buffer);
  if (bom) return bom;

  // HTML meta tags: legacy Japanese pages often carry a correct meta
  // charset even when the server header is missing or wrong.
  const metaEncoding = detectMetaEncoding(buffer);
  if (metaEncoding) return metaEncoding;

  // Content-Type header.
  const headerEncoding = detectHeaderEncoding(contentType);
  if (headerEncoding) return headerEncoding;

  // Guess legacy Japanese encodings from the raw bytes.
  const guessed = detectByEncodingJapanese(buffer);
  if (guessed) return guessed;

  // Default to UTF-8 (most modern sites).
  return 'utf-8';
}

/**
 * Scan the start of the buffer for a charset declared in meta tags.
 * @param buffer - HTML buffer.
 * @returns Normalized encoding name or null.
 */
function detectMetaEncoding(buffer: Buffer): string | null {
  // Decode as latin1 for reliable ASCII detection of the markup.
  const preview = buffer.toString('latin1', 0, Math.min(buffer.length, 2048));

  // Pattern 1: <meta charset="...">
  const charsetMatch = preview.match(/<meta\s+charset=["']?([^"'>\s]+)/i);
  if (charsetMatch) return normalizeEncoding(charsetMatch[1]);

  // Pattern 2: <meta ... content="...;charset=...">
  const contentMatch = preview.match(
    /<meta[^>]*content\s*=\s*["'][^"']*;\s*charset\s*=\s*([^"';\s]+)/i
  );
  if (contentMatch) return normalizeEncoding(contentMatch[1]);

  return null;
}

/**
 * Read charset from the Content-Type header value.
 * @param contentType - Content-Type header value.
 * @returns Normalized encoding name or null.
 */
function detectHeaderEncoding(contentType: string | null): string | null {
  if (!contentType) return null;
  const match = contentType.match(/charset=([^;]+)/i);
  return match ? normalizeEncoding(match[1]) : null;
}

/**
 * Guess the encoding from raw bytes via encoding-japanese, mapping the
 * result to a canonical name. Returns null when the guess is not a
 * usable text encoding (e.g. BINARY).
 * @param buffer - HTML buffer.
 * @returns Canonical encoding name or null.
 */
function detectByEncodingJapanese(buffer: Buffer): string | null {
  const detected = Encoding.detect(buffer);
  if (!detected) return null;
  switch (detected) {
    case 'SJIS':
      return 'cp932';
    case 'EUCJP':
      return 'euc-jp';
    case 'JIS':
      return 'iso-2022-jp';
    case 'UTF8':
    case 'ASCII':
      return 'utf-8';
    case 'UTF16':
    case 'UTF16LE':
      return 'utf-16le';
    case 'UTF16BE':
      return 'utf-16be';
    default:
      return null;
  }
}

function detectBomEncoding(buffer: Buffer): string | null {
  if (buffer.length >= 3) {
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return 'utf-8';
    }
  }
  if (buffer.length >= 2) {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return 'utf-16le';
    }
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      return 'utf-16be';
    }
  }
  return null;
}

function normalizeEncoding(encoding: string): string {
  const value = encoding.trim().toLowerCase();
  switch (value) {
    case 'shift_jis':
    case 'shift-jis':
    case 'sjis':
    case 'x-sjis':
    case 'ms932':
    case 'cp932':
      return 'cp932';
    case 'iso-2022-jp':
    case 'iso2022jp':
    case 'jis':
      return 'iso-2022-jp';
    case 'utf8':
    case 'utf-8':
      return 'utf-8';
    case 'utf16le':
    case 'utf-16le':
      return 'utf-16le';
    case 'utf16be':
    case 'utf-16be':
      return 'utf-16be';
    case 'eucjp':
    case 'euc-jp':
      return 'euc-jp';
    default:
      return value;
  }
}

function decodeWithEncodingJapanese(buffer: Buffer, encoding: string): string {
  const from = mapToEncodingJapanese(encoding);
  const converted = Encoding.convert(buffer, {
    from,
    to: 'UNICODE',
    type: 'string',
  });
  return String(converted);
}

function mapToEncodingJapanese(encoding: string): EncodingName {
  switch (encoding) {
    case 'cp932':
      return 'SJIS';
    case 'euc-jp':
      return 'EUCJP';
    case 'iso-2022-jp':
      return 'JIS';
    case 'utf-8':
      return 'UTF8';
    case 'utf-16le':
      return 'UTF16';
    case 'utf-16be':
      return 'UTF16BE';
    default:
      return 'AUTO';
  }
}

function isJapaneseEncoding(encoding: string): boolean {
  return (
    encoding === 'cp932' || encoding === 'euc-jp' || encoding === 'iso-2022-jp'
  );
}

function parseMediaType(contentType: string | null): string | null {
  if (!contentType) return null;
  const [mediaType] = contentType.split(';', 1);
  const value = mediaType?.trim().toLowerCase();
  return value || null;
}

function hasPrefix(buffer: Buffer, prefix: number[]): boolean {
  if (buffer.length < prefix.length) return false;
  return prefix.every((byte, index) => buffer[index] === byte);
}

function detectBinarySignature(buffer: Buffer): string | null {
  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return 'png';
  if (buffer.length >= 6) {
    const signature = buffer.toString('ascii', 0, 6);
    if (signature === 'GIF87a' || signature === 'GIF89a') return 'gif';
  }
  if (buffer.length >= 12) {
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    if (riff === 'RIFF' && webp === 'WEBP') return 'webp';
  }
  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-')
    return 'pdf';
  if (hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04])) return 'zip';
  return null;
}

function stripLeadingBom(buffer: Buffer): Buffer {
  if (hasPrefix(buffer, [0xef, 0xbb, 0xbf])) return buffer.subarray(3);
  if (hasPrefix(buffer, [0xff, 0xfe])) return buffer.subarray(2);
  if (hasPrefix(buffer, [0xfe, 0xff])) return buffer.subarray(2);
  return buffer;
}

function looksLikeHtml(buffer: Buffer): boolean {
  const body = stripLeadingBom(buffer);
  const preview = body
    .toString('latin1', 0, Math.min(body.length, 4096))
    .replace(/^[\x00-\x20]+/, '');

  if (!preview) return false;

  if (HTML_START_PATTERN.test(preview)) {
    return true;
  }

  if (/^<\?xml\b/i.test(preview) && /<html\b/i.test(preview)) {
    return true;
  }

  return false;
}

function isExplicitlyNonHtmlMediaType(mediaType: string | null): boolean {
  if (!mediaType) return false;
  if (NON_HTML_MEDIA_TYPES.has(mediaType)) return true;
  return NON_HTML_MEDIA_TYPE_PREFIXES.some(prefix =>
    mediaType.startsWith(prefix)
  );
}

function shouldTreatAsHtml(
  contentType: string | null,
  buffer: Buffer
): { isHtml: boolean; reason: string } {
  const mediaType = parseMediaType(contentType);
  const binarySignature = detectBinarySignature(buffer);
  if (binarySignature) {
    return {
      isHtml: false,
      reason: `binary signature: ${binarySignature}`,
    };
  }

  if (HTML_MEDIA_TYPES.has(mediaType ?? '')) {
    return {
      isHtml: true,
      reason: `html media type: ${mediaType}`,
    };
  }

  if (looksLikeHtml(buffer)) {
    return {
      isHtml: true,
      reason: mediaType
        ? `html-like body despite media type: ${mediaType}`
        : 'html-like body',
    };
  }

  if (isExplicitlyNonHtmlMediaType(mediaType)) {
    return {
      isHtml: false,
      reason: `non-html media type: ${mediaType}`,
    };
  }

  if (mediaType) {
    return {
      isHtml: false,
      reason: `unsupported media type: ${mediaType}`,
    };
  }

  return {
    isHtml: false,
    reason: 'body does not look like html',
  };
}

function decodeHtmlBuffer(buffer: Buffer, encoding: string): string {
  if (isJapaneseEncoding(encoding)) {
    return decodeWithEncodingJapanese(buffer, encoding);
  }

  try {
    return iconv.decode(buffer, encoding);
  } catch {
    return decodeWithEncodingJapanese(buffer, encoding);
  }
}

/**
 * Result of a fetch attempt: decodable HTML, a skipped non-HTML
 * response, or an error.
 */
export type FetchResult =
  | { kind: 'html'; html: string }
  | { kind: 'skipped'; reason: string }
  | { kind: 'error'; message: string };

/**
 * Fetch a URL, auto-detect encoding, and normalize CR/LF.
 * @param params
 * @param params.url - URL to fetch.
 * @param params.logStream - Stream for logging.
 * @returns Fetch result describing HTML, skip, or error.
 */
export async function fetchHTML({
  url,
  logStream,
}: {
  url: string;
  logStream: fs.WriteStream;
}): Promise<FetchResult> {
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type');
    const buf = Buffer.from(await res.arrayBuffer());
    const content = shouldTreatAsHtml(contentType, buf);

    if (!content.isHtml) {
      logStream.write(
        `Skipped non-HTML response: ${url} (${content.reason})\n`
      );
      return { kind: 'skipped', reason: content.reason };
    }

    // Detect encoding
    const encoding = detectEncoding(contentType, buf);

    // Decode HTML with detected encoding
    let html = decodeHtmlBuffer(buf, encoding);

    // Normalize CR (\r) to LF (\n) so tags aren't overwritten
    html = html.replace(/\r\n?/g, '\n');

    logStream.write(`Fetched: ${url} (encoding: ${encoding})\n`);
    return { kind: 'html', html };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStream.write(`Error fetching ${url}: ${message}\n`);
    return { kind: 'error', message };
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
