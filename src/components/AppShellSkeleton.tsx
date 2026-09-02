import React from 'react';

import appShellSkeletons from '../constants/app-shell-skeleton.json';

/**
 * React twin of the skeleton `scripts/generate-static-routes.cjs` bakes into the
 * prerendered shells.
 *
 * Both sides read the SAME markup strings from `app-shell-skeleton.json`, so
 * they cannot drift. That matters because the app mounts with `createRoot`, not
 * `hydrateRoot`: React wipes the container on its first commit, so whatever the
 * first commit renders replaces the painted skeleton immediately. If that first
 * commit were the generic spinner, the user would get skeleton -> spinner ->
 * content (two swaps, worse than one). Rendering the identical markup instead
 * makes the first commit a visual no-op.
 *
 * `dangerouslySetInnerHTML` is deliberate and safe here: the input is a static
 * build-time constant checked into the repo, never user data, and it is the only
 * way to guarantee byte-identical output on both sides. The markup contains no
 * <script> (the meta CSP's inline-script hashes are stamped before the prerender
 * step runs, so an injected script would be blocked) and no url()/src references
 * (preview builds are served from a non-root base the prerender script does not
 * rewrite).
 *
 * The markup carries the page's real heading text and an inline <svg> because
 * Chrome's First Contentful Paint does not count background-coloured boxes: a
 * skeleton of empty <div>s paints but never fires FCP, so the metric waits for
 * React's first text regardless of how early the shell appears.
 *
 * That text stays behind `aria-hidden` and is deliberately NOT a heading
 * element. It is a placeholder for content arriving moments later, so
 * announcing it would mean a screen reader reads "Latest Reports" from a node
 * React immediately destroys and re-creates; the live page owns the real <h1>.
 *
 * Styling lives in `src/index.css` — see the `.ashell` block there.
 */

export type AppShellVariant = keyof typeof appShellSkeletons;

/**
 * App-relative route -> shell variant. Must stay in sync with the `shell` keys
 * in `src/constants/route-meta.json`; `AppShellSkeleton.test.tsx` asserts it.
 */
const APP_SHELL_VARIANT_BY_PATH: Readonly<Record<string, AppShellVariant>> = {
  '/latest-reports': 'latest-reports',
};

/** Resolve a shell variant for a base-relative pathname, if one exists. */
export const getAppShellVariant = (pathname: string): AppShellVariant | undefined =>
  APP_SHELL_VARIANT_BY_PATH[pathname];

interface AppShellSkeletonProps {
  variant: AppShellVariant;
  /**
   * Include the header strip. True only above `AppLayout` (the PersistGate
   * fallback), which paints before the real `HeaderBar` exists; the route-level
   * Suspense fallback renders inside `AppLayout` and would double it.
   */
  withHeader?: boolean;
}

export const AppShellSkeleton: React.FC<AppShellSkeletonProps> = ({
  variant,
  withHeader = false,
}) => {
  const markup = appShellSkeletons[variant];
  return (
    <div
      className={withHeader ? 'ashell' : 'ashell ashell--inline'}
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: withHeader ? `${markup.header}${markup.content}` : markup.content,
      }}
    />
  );
};
