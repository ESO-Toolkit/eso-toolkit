import { render } from '@testing-library/react';
import React from 'react';

import { useCanonicalUrl } from '../useCanonicalUrl';

const Probe: React.FC<{ path: string | null }> = ({ path }) => {
  useCanonicalUrl(path);
  return null;
};

const canonicalHref = (): string | null =>
  document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;

const ogUrl = (): string | null =>
  document.head.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null;

beforeEach(() => {
  document.head.innerHTML =
    '<link rel="canonical" href="https://esotk.com/" />' +
    '<meta property="og:url" content="https://esotk.com/" />';
});

describe('useCanonicalUrl', () => {
  it('points the canonical at the given path with a trailing slash', () => {
    // The slash-less form 301-redirects, so a canonical without the slash
    // names a redirect rather than the page itself.
    render(<Probe path="/build-leaderboard/boss/xalvakka" />);
    expect(canonicalHref()).toBe('https://esotk.com/build-leaderboard/boss/xalvakka/');
    expect(ogUrl()).toBe('https://esotk.com/build-leaderboard/boss/xalvakka/');
  });

  it('does not double a slash the caller already supplied', () => {
    render(<Probe path="/kalpa/" />);
    expect(canonicalHref()).toBe('https://esotk.com/kalpa/');
  });

  it('leaves the shell canonical alone when passed null', () => {
    render(<Probe path={null} />);
    expect(canonicalHref()).toBe('https://esotk.com/');
  });

  it('restores the previous value on unmount', () => {
    // Otherwise a client-side navigation away leaves this page's canonical on
    // the next route, which has no canonical logic of its own.
    const { unmount } = render(<Probe path="/build-leaderboard/class/warden" />);
    expect(canonicalHref()).toBe('https://esotk.com/build-leaderboard/class/warden/');

    unmount();
    expect(canonicalHref()).toBe('https://esotk.com/');
    expect(ogUrl()).toBe('https://esotk.com/');
  });

  it('creates and then removes a canonical the shell never declared', () => {
    document.head.innerHTML = '';
    const { unmount } = render(<Probe path="/gear-sets" />);
    expect(canonicalHref()).toBe('https://esotk.com/gear-sets/');

    unmount();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
