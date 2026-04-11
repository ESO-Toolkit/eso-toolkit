/**
 * TransitionLink
 *
 * Wraps react-router's <Link> with native View Transitions API support.
 * See useViewTransitionNavigate.ts for details on the BrowserRouter constraints.
 */

import React from 'react';
import { Link, type LinkProps, useNavigate } from 'react-router-dom';

import type { ViewTransitionType } from '../hooks/useViewTransitionNavigate';

interface TransitionLinkProps extends Omit<LinkProps, 'viewTransition'> {
  vtType?: ViewTransitionType;
}

function waitForDomCommit(): Promise<void> {
  return new Promise<void>((resolve) => {
    const root = document.getElementById('root');
    if (!root) {
      resolve();
      return;
    }

    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const observer = new MutationObserver(() => {
      observer.disconnect();
      done();
    });

    observer.observe(root, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      done();
    }, 50);
  });
}

export const TransitionLink: React.FC<TransitionLinkProps> = ({
  vtType,
  onClick,
  to,
  ...props
}) => {
  const navigate = useNavigate();

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      e.preventDefault();
      onClick?.(e);

      if (!('startViewTransition' in document)) {
        navigate(to);
        return;
      }

      const doNavigate = (): Promise<void> => {
        navigate(to);
        return waitForDomCommit();
      };

      try {
        (
          document as unknown as {
            startViewTransition: (opts: { update: () => Promise<void>; types?: string[] }) => void;
          }
        ).startViewTransition({
          update: doNavigate,
          types: vtType ? [vtType] : [],
        });
      } catch {
        (
          document as unknown as {
            startViewTransition: (cb: () => Promise<void>) => void;
          }
        ).startViewTransition(doNavigate);
      }
    },
    [vtType, onClick, navigate, to],
  );

  return <Link to={to} onClick={handleClick} {...props} />;
};
