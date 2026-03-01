# Allowed OAuth Redirect URIs

These are the redirect URIs registered with the ESO Logs OAuth application.
When adding or removing URIs, update both this file **and** the OAuth provider settings.

## Registered URIs

```
http://192.168.0.156:3000/oauth-redirect
http://192.168.0.156/oauth-redirect
http://localhost:3000/oauth-redirect
http://localhost:3001/oauth-redirect
http://localhost:3002/oauth-redirect
http://localhost:3003/oauth-redirect
http://localhost:3004/oauth-redirect
http://localhost:3005/oauth-redirect
http://localhost:3006/oauth-redirect
http://localhost:3007/oauth-redirect
http://localhost:3008/oauth-redirect
http://localhost:3009/oauth-redirect
https://esotk.com/oauth-redirect
```

## Comma-separated (for OAuth provider field)

```
http://192.168.0.156:3000/oauth-redirect,http://192.168.0.156/oauth-redirect,http://localhost:3000/oauth-redirect,http://localhost:3001/oauth-redirect,http://localhost:3002/oauth-redirect,http://localhost:3003/oauth-redirect,http://localhost:3004/oauth-redirect,http://localhost:3005/oauth-redirect,http://localhost:3006/oauth-redirect,http://localhost:3007/oauth-redirect,http://localhost:3008/oauth-redirect,http://localhost:3009/oauth-redirect,https://esotk.com/oauth-redirect
```

## Notes

- Ports `3000–3009` cover all common Vite dev-server ports to avoid manual reconfiguration during local development.
- `192.168.0.156` entries are for LAN access from other devices on the local network.
- `https://esotk.com` is the production domain.
