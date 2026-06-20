/**
 * decodeHtmlEntities — reverse of the server-side `escapeHtml` used by
 * roster-hub-api when sanitizing user-provided text (titles, descriptions,
 * display names, tags). The server stores text with HTML entities encoded
 * (e.g. `Spike&#x27;s Trial` ) as defense-in-depth against stored XSS, but
 * React already escapes text nodes on render — so entity-encoded text would
 * otherwise display literally to users (e.g. `Spike&#x27;s` instead of
 * `Spike's`).
 *
 * Only the five entities produced by the server `escapeHtml` are decoded,
 * matching the server's allow-list exactly so no additional entities leak
 * through.
 */
export function decodeHtmlEntities(input: string | null | undefined): string {
  // External data stores (e.g. D1 columns) can legitimately hold NULL even
  // where the TS types claim a string, so tolerate non-strings rather than
  // throwing on `null.replace`.
  if (typeof input !== 'string') return '';
  return input
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}
