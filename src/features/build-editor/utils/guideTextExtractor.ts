/**
 * guideTextExtractor — turn a fetched guide page's HTML into the plain,
 * tab-structured text that buildTextParser expects.
 *
 * The worker fetches the guide URL server-side (CORS) and returns its raw HTML;
 * this runs client-side so the parsing logic stays unit-testable. We parse with
 * the platform HTML parser (DOMParser — available in browsers and jsdom) rather
 * than regexes: it's linear and can't be made to backtrack quadratically on
 * malformed/hostile markup. Table cells become tabs and block elements become
 * newlines, which reconstructs the gear-table layout the parser keys on. Also
 * collects build-panel image URLs so image-only guides can fall back to OCR.
 */

export interface ExtractedGuide {
  title: string;
  text: string;
  /** Build-panel image URLs (for the image/OCR fallback on image-only guides). */
  images: string[];
}

/** Only consider images whose name hints they carry build data (gear/skills/CP). */
const BUILD_IMAGE_RE = /gear|skill|build|setup|champion|frontbar|backbar|\bbar\b|\bcp\b/i;

const CELL_TAGS = new Set(['TD', 'TH']);
const BLOCK_TAGS = new Set([
  'TR',
  'P',
  'DIV',
  'LI',
  'UL',
  'OL',
  'TABLE',
  'SECTION',
  'HEADER',
  'FOOTER',
  'ARTICLE',
  'BLOCKQUOTE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);

function parseHtml(html: string): Document | null {
  try {
    // A DOMParser document has no browsing context, so it is INERT: scripts don't
    // run and resource-bearing elements (img/iframe/…) issue NO network requests.
    // We only ever read attributes/textContent off it and never insert its nodes
    // into the live DOM, so fetched guide markup can't trigger subresource loads.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
    return doc;
  } catch {
    return null;
  }
}

function collectImages(doc: Document, baseUrl: string): string[] {
  const out: string[] = [];
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    if (!src) return;
    let decoded = src;
    try {
      decoded = decodeURIComponent(src);
    } catch {
      /* keep raw src */
    }
    if (!BUILD_IMAGE_RE.test(decoded)) return;
    let abs = src;
    try {
      abs = baseUrl ? new URL(src, baseUrl).href : src;
    } catch {
      /* keep the raw src */
    }
    out.push(abs);
  });
  return [...new Set(out)].slice(0, 12);
}

/** Extract build-panel image URLs (gear/skill/CP/setup) from page HTML. */
export function extractGuideImageUrls(html: string, baseUrl = ''): string[] {
  const doc = parseHtml(html);
  return doc ? collectImages(doc, baseUrl) : [];
}

/** Walk the DOM, emitting tabs between table cells and newlines at block ends.
 *  Inside a table cell, block elements (guides often wrap cell contents in a
 *  div/p for layout) must NOT inject newlines — that would split one gear row
 *  across lines and break the tab structure the parser keys on. */
function gatherText(root: Node): string {
  const parts: string[] = [];
  const visit = (node: Node, inCell: boolean): void => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3 /* text */) {
        parts.push((child.textContent ?? '').replace(/\s+/g, ' '));
      } else if (child.nodeType === 1 /* element */) {
        const tag = (child as Element).tagName;
        if (tag === 'BR') {
          parts.push(inCell ? ' ' : '\n'); // keep a cell on one line
          continue;
        }
        const isCell = CELL_TAGS.has(tag);
        visit(child, inCell || isCell);
        if (isCell) parts.push('\t');
        else if (BLOCK_TAGS.has(tag) && !inCell) parts.push('\n');
      }
    }
  };
  visit(root, false);
  return parts.join('');
}

/** Convert a guide page's HTML into parser-ready text + a build-image list. */
export function extractGuide(html: string, baseUrl = ''): ExtractedGuide {
  const doc = parseHtml(html);
  if (!doc) return { title: '', text: '', images: [] };

  // textContent here is already entity-decoded by the parser (no manual decode).
  const title = (doc.querySelector('title')?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const text = gatherText(doc.body ?? doc)
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

  return { title, text, images: collectImages(doc, baseUrl) };
}
