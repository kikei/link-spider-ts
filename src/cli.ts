import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

/**
 * Parsed command-line arguments.
 */
export interface ParsedArguments {
  url: string;
  site: string;
  allowedPrefixes?: string[];
  ignoreFile?: string;
  stripFragments: boolean;
  stripParams?: string[];
}

/**
 * Sanitize directory name for file system compatibility.
 * Allows alphanumeric, Japanese characters, and some symbols.
 * @param name - Directory name to sanitize.
 * @returns Sanitized directory name.
 */
export function sanitizeDirName(name: string): string {
  return name.replace(/[^a-zA-Z0-9　-〿぀-ゟ゠-ヿ一-鿿＀-￯_-]/g, '_');
}

/**
 * Parse command-line arguments.
 * @returns Parsed arguments object.
 */
export function parseArguments(): ParsedArguments {
  return yargs(hideBin(process.argv))
    .option('url', {
      alias: 'u',
      description: 'The starting URL to crawl',
      type: 'string',
      demandOption: true,
    })
    .option('site', {
      alias: 's',
      description: 'The name of the site (for directory creation)',
      type: 'string',
      demandOption: true,
    })
    .option('allowedPrefixes', {
      alias: 'p',
      description: 'Allowed URL prefixes (host/path, no protocol)',
      type: 'array',
      string: true,
    })
    .option('ignoreFile', {
      alias: 'i',
      description: 'Path to file with ignore patterns (one per line)',
      type: 'string',
    })
    .option('stripFragments', {
      alias: 'f',
      description: 'Strip URL fragments from collected links',
      type: 'boolean',
      default: true,
    })
    .option('stripParams', {
      alias: 'q',
      description: 'Query parameters to strip from URLs',
      type: 'array',
      string: true,
    })
    .help()
    .alias('help', 'h')
    .parseSync() as ParsedArguments;
}
