// IMPORTANT: never HTML-escape IDENTITY / lookup-key fields on write —
// specifically `author_name` and the na/eu display names. They are matched RAW
// against the URL slug / request values in lookups (e.g. getUserProfile's
// `author_name = ? COLLATE NOCASE`), so escaping `'` → `&#x27;` (etc.) at storage
// time breaks resolution for any ESO name containing ' < > " & (e.g. "Spike'jo"
// → 404 "Player not found") and also renders as literal mojibake, since React
// already escapes on output. Escape on OUTPUT, not on store. Free-text CONTENT
// (titles, descriptions, bios, comment bodies) is still escaped via sanitize().
export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

export const sanitize = (s: string): string => escapeHtml(s.trim());

// Trim-only cleaner for free-text CONTENT that consumers escape on OUTPUT
// (titles, descriptions, bios, comment bodies, addon name/note). Storing these
// RAW avoids double-escaped mojibake (e.g. "&#x27;" shown literally) while
// staying XSS-safe: every render path escapes on output (React text nodes, MUI
// props). Use sanitize() only for fields a consumer might inject as raw HTML.
export const cleanText = (s: string): string => s.trim();
