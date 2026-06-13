import fs from 'fs';

/**
 * Load keywords from file.
 * Lines starting with # are comments, empty lines are ignored.
 * @param filePath - Path to keywords file.
 * @returns Array of keywords.
 */
export function loadKeywords(filePath: string): string[] {
  const txt = fs.readFileSync(filePath, 'utf-8');
  return txt
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

/**
 * Check if the given text contains any of the specified keywords.
 * Case-insensitive partial matching.
 * @param text - Page text to search.
 * @param keywords - Non-empty list of keywords to match.
 * @returns Object with match result and matched keywords.
 */
export function matchKeywords(
  text: string,
  keywords: string[]
): { matched: boolean; matchedKeywords: string[] } {
  const lowerText = text.toLowerCase();
  const matchedKeywords = keywords.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );

  return {
    matched: matchedKeywords.length > 0,
    matchedKeywords,
  };
}
