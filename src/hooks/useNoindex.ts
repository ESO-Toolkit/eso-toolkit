import { useEffect } from 'react';

/**
 * Applies `<meta name="robots" content="noindex, nofollow">` while `active`.
 *
 * Extracted from `RobotsMeta` because route membership is not the only reason a
 * page must not be indexed. A profile that does not resolve renders a
 * "Player not found" body at the same URL a real profile would use, and that
 * soft 404 has to be excluded on STATE, which no path pattern can express.
 *
 * Only ever ADDS `noindex`; it never writes an affirmative "index" value. That
 * matters because preview and report deploys sed a
 * `<meta name="robots" content="noindex, nofollow">` into every shell
 * (`.github/workflows/deploy-preview.yml`), and a hook that "corrected" the tag
 * when inactive would quietly un-hide every preview build.
 *
 * Restores whatever was there before on cleanup, so leaving the page does not
 * strand this page's directive on the next one.
 */
export const useNoindex = (active: boolean): void => {
  useEffect(() => {
    if (!active) return undefined;

    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (existing) {
      const previous = existing.getAttribute('content');
      existing.setAttribute('content', 'noindex, nofollow');
      return () => {
        if (previous === null) existing.removeAttribute('content');
        else existing.setAttribute('content', previous);
      };
    }

    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [active]);
};
