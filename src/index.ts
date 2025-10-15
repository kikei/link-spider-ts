import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { parseArguments, sanitizeDirName } from './cli';
import { buildAllowedPrefixes } from './url-processor';
import {
  createDirectory,
  saveLinksToFile,
  parseIgnoreFile,
} from './file-handler';
import { crawlingStart } from './crawler';

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
  const siteDir = createDirectory(dirName);
  const logStream = fs.createWriteStream(path.join(siteDir, 'spider.log'), {
    flags: 'a',
  });

  const linksSet = await crawlingStart({
    url,
    allowedPrefixes,
    ignoreList,
    stripFragments: argv.stripFragments,
    stripParams: argv.stripParams,
    logStream,
  });

  saveLinksToFile({
    dir: siteDir,
    links: Array.from(linksSet),
  });
  logStream.end();
}

// Execute the main function
main();
