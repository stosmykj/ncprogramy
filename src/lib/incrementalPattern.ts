/**
 * Pure helpers for incremental-column patterns.
 *
 * Kept in a plain (non-rune) module so they can be unit-tested directly and
 * shared between the runtime generator (dataProcessor) and the column dialog
 * without pulling in Svelte rune state.
 *
 * Pattern placeholders:
 * - {YY}   = 2-digit year
 * - {YYYY} = 4-digit year
 * - {MM}   = 2-digit month (01-12)
 * - {DD}   = 2-digit day (01-31)
 * - {###}  = zero-padded sequence (width = number of #)
 */

// Recognized placeholders. A pattern is only meaningful if it contains at
// least one of these wrapped in curly braces.
const INCREMENTAL_DATE_RE = /\{YYYY\}|\{YY\}|\{MM\}|\{DD\}/;
const INCREMENTAL_SEQ_RE = /\{#+\}/;

/**
 * Whether the pattern contains at least one recognized placeholder. A pattern
 * without any (e.g. `RR###` written without curly braces) would otherwise be
 * stored as-is and silently produce that literal string at generation time.
 */
export function hasValidIncrementalPlaceholder(pattern: string): boolean {
  return INCREMENTAL_DATE_RE.test(pattern) || INCREMENTAL_SEQ_RE.test(pattern);
}

/**
 * Synchronous preview of an incremental pattern, using sequence number 1.
 * Mirrors the token substitution in generateIncrementalValue so the dialog can
 * show users what their pattern will produce. Returns null when the pattern
 * contains no recognized placeholder (i.e. it would not actually increment).
 *
 * @param now injectable clock for deterministic tests; defaults to the present.
 */
export function previewIncrementalValue(pattern: string, now: Date = new Date()): string | null {
  if (!hasValidIncrementalPlaceholder(pattern)) return null;
  return pattern
    .replace(/\{YYYY\}/g, now.getFullYear().toString())
    .replace(/\{YY\}/g, now.getFullYear().toString().slice(-2))
    .replace(/\{MM\}/g, (now.getMonth() + 1).toString().padStart(2, '0'))
    .replace(/\{DD\}/g, now.getDate().toString().padStart(2, '0'))
    .replace(/\{(#+)\}/g, (_match, hashes: string) => '1'.padStart(hashes.length, '0'));
}
