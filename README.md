# link-spider-ts

A TypeScript web crawler for collecting all links from websites, with
automatic Japanese encoding detection.

## Features

- **TypeScript**: Fully typed, modular architecture
- **Encoding Auto-Detection**: Detects UTF-8, CP932/Shift_JIS, EUC-JP, and
  ISO-2022-JP from meta tags, Content-Type, and BOM
- **Non-HTML Skipping**: Detects and skips images, PDFs, and archives via
  media type and magic bytes
- **Keyword Filtering**: Optionally keep only pages whose content matches
  keywords, splitting results into matched and unmatched lists
- **Duplicate Detection**: Content signature-based loop prevention
- **Flexible Filtering**: URL prefix and regex-based exclusion
- **Clean Output**: Sorted list of all discovered URLs
- **Polite Crawling**: Configurable delay between requests

## Installation

```bash
git clone https://github.com/yourusername/link-spider-ts.git
cd link-spider-ts
npm install
npm run build
```

## Usage

### Basic Usage

```bash
npm start -- -u <URL> -s <site-name>
```

Example:
```bash
npm start -- -u https://example.com -s example_site
```

Output: `output/example_site/urls.txt`

### Options

- `-u, --url`: Starting URL to crawl (required)
- `-s, --site`: Site name for output directory (required)
- `-p, --allowedPrefixes`: Allowed URL prefixes (host/path)
- `-i, --ignoreFile`: Path to file with ignore patterns
- `-k, --keywordsFile`: Path to file with keywords for content filtering
- `-f, --stripFragments`: Strip URL fragments (default: true)
- `-q, --stripParams`: Query parameters to strip

### Advanced Example

```bash
npm start -- \
  -u https://blog.example.com \
  -s my_blog \
  -p blog.example.com/posts \
  -i ignore_patterns.txt \
  -q utm_source -q utm_medium
```

### Keyword Filtering

Provide a keywords file (one keyword per line; lines starting with `#` are
comments) to keep only pages whose content matches at least one keyword.
Keep keyword files under the `keywords/` directory, which is git-ignored:

```bash
npm start -- -u https://blog.example.com -s my_blog -k keywords/onsen.txt
```

Matching is case-insensitive partial matching against the page body. Matched
pages are written to `urls.txt`, and non-matching pages to `unmatched.txt`.

### Goo Blog Helper Script

For Japanese goo.ne.jp blogs:

```bash
scripts/goo-blog/goo-blog.sh -b <blog-id> -t "Blog Title"
```

## Output

Results are saved in `output/<site-name>/`:
- `urls.txt`: Sorted list of crawled HTML pages (only pages matching a
  keyword when `--keywordsFile` is used)
- `unmatched.txt`: Sorted HTML pages that did not match any keyword (only
  when `--keywordsFile` is used)
- `spider.log`: Detailed crawl log; non-HTML responses and fetch errors are
  recorded here and excluded from the lists above

## Architecture

Modular TypeScript design with clear separation of concerns:

- `cli.ts`: Command-line argument parsing
- `url-processor.ts`: URL normalization and filtering
- `html-fetcher.ts`: HTTP requests and HTML parsing
- `file-handler.ts`: File system operations
- `crawler.ts`: Main crawling logic
- `constants.ts`: Configuration constants

## Development

```bash
# Build
npm run build

# Run directly with ts-node (no build required)
npm run dev -- -u <URL> -s <site-name>

# Format code
npx prettier --write "src/**/*.ts"
```

## Requirements

- Node.js 18+
- TypeScript 5+

## License

MIT
