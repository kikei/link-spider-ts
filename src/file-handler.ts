import fs from 'fs';
import path from 'path';
import type { Link } from './url-processor';

/**
 * Create directory for crawl output.
 * Creates under output/ directory.
 * @param dirName - Directory name to create.
 * @returns Absolute path to the directory.
 */
export function createDirectory(dirName: string): string {
  const outputDir = path.resolve('output', dirName);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Directory created: ${outputDir}`);
  } else {
    console.log(`Directory already exists: ${outputDir}`);
  }
  return outputDir;
}

/**
 * Save a sorted list of link URLs to a file in the given directory.
 * @param params
 * @param params.dir - Directory to save file in.
 * @param params.fileName - Output file name.
 * @param params.links - Links to save.
 */
function saveUrlsToFile({
  dir,
  fileName,
  links,
}: {
  dir: string;
  fileName: string;
  links: Link[];
}): void {
  const filePath = path.join(dir, fileName);
  const urls = links.flatMap(link => (link.url ? [link.url] : [])).sort();
  fs.writeFileSync(filePath, urls.join('\n'), 'utf-8');
  console.log(`Saved ${urls.length} links to: ${filePath}`);
}

/**
 * Save matched links to urls.txt file.
 * @param params
 * @param params.dir - Directory to save file in.
 * @param params.links - Links to save.
 */
export function saveLinksToFile({
  dir,
  links,
}: {
  dir: string;
  links: Link[];
}): void {
  saveUrlsToFile({ dir, fileName: 'urls.txt', links });
}

/**
 * Save unmatched (non-matching) links to unmatched.txt file.
 * @param params
 * @param params.dir - Directory to save file in.
 * @param params.links - Unmatched links to save.
 */
export function saveUnmatchedLinksToFile({
  dir,
  links,
}: {
  dir: string;
  links: Link[];
}): void {
  saveUrlsToFile({ dir, fileName: 'unmatched.txt', links });
}

/**
 * Parse ignore file into array of RegExp patterns.
 * Lines starting with # are treated as comments.
 * @param filePath - Path to ignore file.
 * @returns Array of regular expression patterns.
 */
export function parseIgnoreFile(filePath: string): RegExp[] {
  const txt = fs.readFileSync(filePath, 'utf-8');
  return txt
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(pat => new RegExp(pat));
}
