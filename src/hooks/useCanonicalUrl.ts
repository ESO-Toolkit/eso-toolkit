import { useEffect } from 'react';

/**
 * Production origin. Mirrors `SITE_ORIGIN` in
 * `scripts/generate-static-routes.cjs`, which stamps the same value into the
 * prerendered shells. The two cannot share a module: that script runs under
 * plain node with no bundler and cannot import TypeScript.
 *
 * Deliberately absolute even on preview deploys. Those get
 * `<meta name="robots" content="noindex, nofollow">` injected at deploy time
 * (see .github/workflows/deploy-preview.yml), and `noindex` outranks a
 * canonical, so pointing at production there is inert rather than harmful.
 */
const SITE_ORIGIN = 'https://esotk.com';

/** Applies a value and returns the undo, so unmount can put the tag back. */
const setCanonicalLink = (href: string): (() => void) => {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (existing) {
    const previous = existing.getAttribute('href');
    existing.setAttribute('href', href);
    return () => {
      if (previous === null) existing.removeAttribute('href');
      else existing.setAttribute('href', previous);
    };
  }
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = href;
  document.head.appendChild(link);
  return () => link.remove();
};

const setOgUrl = (content: string): (() => void) => {
  const meta = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  // Updated only if the shell already declares it; index.html always does, and
  // inventing og tags on routes that never had them is not this hook's job.
  if (!meta) return () => undefined;
  const previous = meta.getAttribute('content');
  meta.setAttribute('content', content);
  return () => {
    if (previous === null) meta.removeAttribute('content');
    else meta.setAttribute('content', previous);
  };
};

/**
 * Points `<link rel="canonical">` (and `og:url`) at the given app-absolute path.
 *
 * Needed because only the prerendered routes get a correct canonical stamped
 * into their shell. Everything else is served through the GitHub Pages 404
 * fallback, which hands back `index.html` with `<link rel="canonical"
 * href="https://esotk.com/" />` still on it, so every runtime-only route
 * claimed the homepage as its canonical.
 *
 * Scope, so this is not oversold: unprerendered paths answer with HTTP 404 on
 * GitHub Pages (verified in production), so they are not indexed and their
 * canonical is never evaluated. On today's hosting this hook earns its keep by
 * keeping the hydrated canonical in step with the prerendered one as you move
 * between boards client-side, and by consolidating the parameterized routes
 * that can never be prerendered. It becomes load-bearing once something serves
 * 200 for these paths.
 *
 * Pass the path a page WANTS to be indexed as, which is not always its own URL:
 * `/build-leaderboard/class/arcanist/ansuul-the-tormentor` passes the pooled
 * `/build-leaderboard/class/arcanist` so the 98 class-by-boss permutations
 * consolidate onto the 7 boards that are actually in the sitemap.
 *
 * Pass `null` to leave the shell's canonical untouched.
 *
 * Restores the previous value on unmount. Without that, client-side navigating
 * away would leave this page's canonical on the next route, which mostly has no
 * canonical logic of its own.
 *
 * @param path App-absolute path, e.g. `/build-leaderboard/boss/xalvakka`.
 */
export const useCanonicalUrl = (path: string | null): void => {
  useEffect(() => {
    if (!path) return undefined;
    // Trailing slash: the slash-less form 301-redirects, so the canonical must
    // name the destination or it points at a redirect.
    const normalized = path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`;
    const url = `${SITE_ORIGIN}${normalized}`;
    const restoreCanonical = setCanonicalLink(url);
    const restoreOgUrl = setOgUrl(url);
    return () => {
      restoreCanonical();
      restoreOgUrl();
    };
  }, [path]);
};
