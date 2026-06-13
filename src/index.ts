import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { parseArguments, sanitizeDirName } from './cli';
import { buildAllowedPrefixes } from './url-processor';
import {
  createDirectory,
  saveLinksToFile,
  saveUnmatchedLinksToFile,
  parseIgnoreFile,
} from './file-handler';
import { crawlingStart } from './crawler';
import { loadKeywords } from './content-filter';

/**
 * Main entry point for the spider application.
 */
async function main(): Promise<void> {
  const argv = parseArguments();
  const url = argv.url;
  const siteName = argv.site;
  const dirName = sanitizeDirName(siteName);
  const baseUrl = new URL(url).origin;
  const allowedPrefixes = buildAllowedPrefixes({
    baseUrl,
    rawPrefixes: argv.allowedPrefixes,
  });
  const ignoreList = argv.ignoreFile ? parseIgnoreFile(argv.ignoreFile) : [];
  const keywords = argv.keywordsFile ? loadKeywords(argv.keywordsFile) : [];
  const siteDir = createDirectory(dirName);
  const logStream = fs.createWriteStream(path.join(siteDir, 'spider.log'), {
    flags: 'a',
  });

  const { linksSet, filteredSet } = await crawlingStart({
    url,
    allowedPrefixes,
    ignoreList,
    keywords,
    stripFragments: argv.stripFragments,
    stripParams: argv.stripParams,
    logStream,
  });

  saveLinksToFile({
    dir: siteDir,
    links: Array.from(linksSet),
  });

  if (keywords.length > 0) {
    saveUnmatchedLinksToFile({
      dir: siteDir,
      links: Array.from(filteredSet),
    });
  }

  logStream.end();
}

// Execute the main function
main();
