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
 * Save links to urls.txt file.
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
  const filePath = path.join(dir, 'urls.txt');
  console.log('Saving links to:', filePath);
  const urls = links.flatMap(link => (link.url ? [link.url] : [])).sort();
  fs.writeFileSync(filePath, urls.join('\n'), 'utf-8');
  console.log(`Links saved to: ${filePath}`);
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
