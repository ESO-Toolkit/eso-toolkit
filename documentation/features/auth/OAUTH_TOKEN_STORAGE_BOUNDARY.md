# OAuth Token Storage Boundary

ESO Logs OAuth access and refresh tokens are stored only in `sessionStorage` for
the active browser tab. If Web Storage is unavailable, the application keeps the
credential in module memory for the lifetime of the loaded page. The application
never reads a token from `localStorage`; any legacy `access_token` or
`refresh_token` value encountered during normal token access is removed without
being used.

This prevents a credential from being restored in a new tab or after the browser
session ends. It also means users must authenticate again after closing the tab
or browser, and browser profiles with disabled session storage cannot retain a
session after a reload.

This is a client-only boundary, not a substitute for a backend-for-frontend.
An attacker who can execute script in the authenticated tab can still access the
tab-scoped token and act as that user until the token expires or is revoked.
Existing PKCE, OAuth state validation, destination validation, and strict
cross-window origin checks reduce exposure but cannot eliminate that residual
XSS threat. A future BFF with `HttpOnly`, `Secure`, `SameSite` session cookies
would be required to keep OAuth credentials out of JavaScript entirely.
