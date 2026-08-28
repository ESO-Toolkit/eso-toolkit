// Preserve BrowserRouter deep links when GitHub Pages serves this 404 shell.
const path = window.location.pathname.slice(1);
const redirectPath = `/${path}${window.location.search}${window.location.hash}`;
const normalizedPath = window.location.pathname.replace(/\/+$/, '');
const isPrivateSupportHandoff = normalizedPath.endsWith('/kalpa/support');

try {
  sessionStorage.setItem('redirectPath', redirectPath);
} catch {
  // The encoded query fallback below works when storage is unavailable.
}

const redirectUrl = new URL('/', window.location.origin);
// A query string is visible to intermediaries, browser history, and referrers.
// The Kalpa handoff fragment can contain the user's reviewed report, so only
// restore it through same-tab sessionStorage. If storage is blocked, fail
// closed by restoring the support page without its fragment.
redirectUrl.searchParams.set(
  'redirect',
  isPrivateSupportHandoff ? `/${path}${window.location.search}` : redirectPath,
);
window.location.replace(redirectUrl);
