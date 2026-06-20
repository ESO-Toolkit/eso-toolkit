/**
 * guideTextExtractor — turn a fetched guide page's HTML into the plain,
 * tab-structured text that buildTextParser expects.
 *
 * The worker fetches the guide URL server-side (CORS) and returns its raw HTML;
 * this runs client-side so the parsing logic stays unit-testable. Table cells
 * become tabs and block elements become newlines, which reconstructs the
 * gear-table layout the parser keys on. Also collects build-panel image URLs so
 * image-only guides can fall back to OCR.
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decode the HTML entities that appear in guide text (named + numeric). */
function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export interface ExtractedGuide {
  title: string;
  text: string;
  /** Build-panel image URLs (for the image/OCR fallback on image-only guides). */
  images: string[];
}

/** Extract build-panel image URLs (gear/skill/CP/setup) from page HTML. */
export function extractGuideImageUrls(html: string, baseUrl = ''): string[] {
  const out: string[] = [];
  const re = /<img\b[^>]*?\bsrc=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[1];
    let decoded: string;
    try {
      decoded = decodeURIComponent(src);
    } catch {
      decoded = src;
    }
    if (!/gear|skill|build|setup|champion|frontbar|backbar|\bbar\b|\bcp\b/i.test(decoded)) continue;
    let abs = src;
    try {
      abs = baseUrl ? new URL(src, baseUrl).href : src;
    } catch {
      /* keep the raw src */
    }
    out.push(abs);
  }
  return [...new Set(out)].slice(0, 12);
}

/** Convert a guide page's HTML into parser-ready text + a build-image list. */
export function extractGuide(html: string, baseUrl = ''): ExtractedGuide {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const title = decodeEntities(
    (cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim(),
  );

  let s = cleaned
    // Table cells → tabs (reconstructs gear-table columns the parser keys on).
    .replace(/<\/(td|th)>\s*<(td|th)\b[^>]*>/gi, '\t')
    .replace(/<(td|th)\b[^>]*>/gi, '')
    .replace(/<\/(td|th)>/gi, '\t')
    // Block boundaries → newlines.
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(tr|p|div|li|h[1-6]|section|header|article)>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);

  const text = s
    .split('\n')
    .map((line) =>
      line
        .replace(/[ \t]*\t[ \t]*/g, '\t') // tidy spaces around tabs
        .replace(/\t{2,}/g, '\t')
        .replace(/ {2,}/g, ' ')
        .replace(/^\t+|\t+$/g, '')
        .trim(),
    )
    .filter((l) => l.length > 0)
    .join('\n');

  return { title, text, images: extractGuideImageUrls(cleaned, baseUrl) };
}
