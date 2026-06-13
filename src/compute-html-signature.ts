import crypto from 'crypto';

/**
 * Compute a content signature from the page's main text by
 * normalizing it and hashing with sha256. Numbers and whitespace
 * are collapsed so trivial diffs (dates, counters) do not change
 * the signature.
 * @param text - Extracted main text of the page.
 * @returns hex signature (sha256), or '' when text is empty.
 */
function computeHtmlSignature(text: string): string {
  if (!text) return '';

  // Normalize text to collapse trivial diffs (dates, counters,
  // spaces).
  const norm = text
    .replace(/\r\n?/g, '\n') // normalize newlines
    .replace(/\d+/g, '0') // neutralize numbers (pages/1→pages/0)
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();

  if (!norm) return '';

  // Hash with sha256 to a fixed-size signature.
  return crypto.createHash('sha256').update(norm).digest('hex');
}

export default computeHtmlSignature;
