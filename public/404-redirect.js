// Preserve BrowserRouter deep links when GitHub Pages serves this 404 shell.
const path = window.location.pathname.slice(1);
const redirectPath = `/${path}${window.location.search}${window.location.hash}`;

try {
  sessionStorage.setItem('redirectPath', redirectPath);
} catch {
  // The encoded query fallback below works when storage is unavailable.
}

const redirectUrl = new URL('/', window.location.origin);
redirectUrl.searchParams.set('redirect', redirectPath);
window.location.replace(redirectUrl);
