import { render } from '@testing-library/react';
import React from 'react';

import { AppShellSkeleton, getAppShellVariant } from '../../components/AppShellSkeleton';
import appShellSkeletons from '../../constants/app-shell-skeleton.json';
import { ROUTE_META } from '../../constants/routeMeta';

/**
 * The prerender script (`scripts/generate-static-routes.cjs`) bakes these same
 * strings into `<div id="root">` of every shell whose route-meta entry names a
 * `shell`. These assertions guard the two things that would silently break that
 * injection: markup the meta CSP blocks (inline <script>, whose hashes are
 * stamped before the script runs) and URLs that assume a root deploy (preview
 * builds are served from /dev-previews/pr-N/).
 */
describe('app shell skeleton', () => {
  const variants = Object.keys(appShellSkeletons) as (keyof typeof appShellSkeletons)[];

  it('has at least one variant', () => {
    expect(variants.length).toBeGreaterThan(0);
  });

  it.each(variants)('%s markup carries no script and no URL references', (variant) => {
    const { header, content } = appShellSkeletons[variant];
    const markup = `${header}${content}`;
    expect(markup).not.toMatch(/<script/i);
    expect(markup).not.toMatch(/\b(?:src|href)\s*=/i);
    expect(markup).not.toMatch(/url\(/i);
  });

  it('maps every route-meta shell to a known variant and to the runtime path map', () => {
    const shellRoutes = Object.entries(ROUTE_META).filter(([, meta]) => meta.shell);
    expect(shellRoutes.length).toBeGreaterThan(0);

    for (const [path, meta] of shellRoutes) {
      expect(Object.keys(appShellSkeletons)).toContain(meta.shell);
      expect(getAppShellVariant(path)).toBe(meta.shell);
      // A skeleton on a runtime-only route would never be emitted.
      expect(meta.prerender).toBe(true);
    }
  });

  it('returns no variant for an unrelated route', () => {
    expect(getAppShellVariant('/about')).toBeUndefined();
  });

  it('renders the header strip only when asked', () => {
    const withHeader = render(<AppShellSkeleton variant="latest-reports" withHeader />);
    expect(withHeader.container.querySelector('.ashell-header')).not.toBeNull();
    expect(withHeader.container.querySelector('.ashell--inline')).toBeNull();

    const inline = render(<AppShellSkeleton variant="latest-reports" />);
    expect(inline.container.querySelector('.ashell-header')).toBeNull();
    expect(inline.container.querySelector('.ashell--inline')).not.toBeNull();
    // The content column is what the route-level fallback must reproduce.
    expect(inline.container.querySelectorAll('.ashell-row')).toHaveLength(6);
  });

  it('paints something Chrome counts as contentful', () => {
    // FCP ignores background-coloured boxes. A skeleton of empty <div>s paints
    // (First Paint) but never becomes contentful, so FCP waits for React's
    // first text — which is exactly the regression this guards.
    const { container } = render(<AppShellSkeleton variant="latest-reports" withHeader />);
    expect(container.querySelector('.ashell-heading')?.textContent).toBe('Latest Reports');
    expect(container.querySelector('.ashell-eyebrow')?.textContent).toBe('Community');
    expect(container.querySelector('.ashell-hero-icon svg')).not.toBeNull();
  });

  it('is hidden from assistive technology', () => {
    // Deliberate: the shell is a placeholder for content that arrives moments
    // later. Exposing its heading would make a screen reader announce "Latest
    // Reports" from a node React then destroys and re-creates. The live page
    // owns the real <h1>; this copy is purely a paint.
    const { container } = render(<AppShellSkeleton variant="latest-reports" withHeader />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    // ...which is only defensible because it is not itself a heading element.
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0);
  });
});
