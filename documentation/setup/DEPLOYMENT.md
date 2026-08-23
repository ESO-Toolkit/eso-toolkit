# Production Deployment

ESO Toolkit is a Vite-powered static web application. The supported production deployment is the GitHub Pages workflow in `.github/workflows/deploy.yml`; application APIs are separate Cloudflare Worker services configured through environment variables.

## Local release checks

Use Node.js 24 LTS (`.nvmrc`) and a clean, lockfile-driven install:

```bash
npm ci
npm run validate
npm run test:ci
npm run build
```

For browser confidence, run the smoke and accessibility suites with the required test data and credentials:

```bash
npm run test:smoke:e2e
npm run test:a11y
```

Do not use `npm install` to repair a failing checkout or delete `package-lock.json`; report dependency changes as a reviewed pull request.

## GitHub Pages

The deployment workflow builds the `build/` directory and publishes it through GitHub Pages. The build creates static copies for the public legal routes and includes `404.html` as the fallback for other client-side routes. After deployment, verify the exact release commit and check:

```bash
curl --fail --silent --show-error --location --head https://esotk.com/
curl --fail --silent --show-error --location https://esotk.com/privacy
curl --fail --silent --show-error --location https://esotk.com/terms
```

GitHub Pages does not honor the `_headers` convention used by some static hosts. The Vite build therefore injects a hash-based CSP `<meta>` policy and a strict referrer `<meta>` policy into the app shell as defense in depth. Meta CSP cannot enforce `frame-ancestors`, `X-Content-Type-Options: nosniff`, HSTS, or `Permissions-Policy`; configure those at the custom-domain/CDN layer or migrate the static hosting provider, and do not assume `public/_headers` is active. The generated `build/_headers` file carries the matching inline-script hash for a future header-capable deployment.

## Custom static hosting

For a host that supports history fallbacks, route unknown paths to `index.html` and serve hashed assets with long-lived immutable caching. Keep `index.html`, legal pages, manifests, robots.txt, and sitemap.xml short-lived so a deployment can update asset references safely.

Example Nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name example.com;
    root /var/www/eso-toolkit/build;
    index index.html;

    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
```

Enable HTTPS, a restrictive Content-Security-Policy, HSTS, `X-Content-Type-Options: nosniff`, clickjacking protection, an appropriate Referrer-Policy, and a restrictive Permissions-Policy at the edge. Keep the policy aligned with the actual analytics, error tracking, font, image, API, and OAuth origins used by the release.

## Release checklist

- [ ] Confirm the release SHA is on `main` and all required checks are green.
- [ ] Confirm `npm audit --omit=dev --audit-level=high` reports no production vulnerabilities.
- [ ] Confirm analytics and error tracking are disabled until consent where required.
- [ ] Confirm `privacy` and `terms` return HTTP 200 and contain the current policy text.
- [ ] Confirm source maps are not present in the public build unless intentionally protected.
- [ ] Verify metadata, manifest, robots.txt, sitemap.xml, and social preview URLs.
- [ ] Test the landing page, a report deep link, authentication redirect, mobile layout, and reduced-motion mode.
- [ ] Publish a tagged GitHub release with a changelog and known limitations.

## Troubleshooting

If a clean build fails, preserve the lockfile and run:

```bash
rm -rf node_modules
npm ci
npm run build
```

For Windows, remove only the worktree's `node_modules` directory and rerun `npm ci`. For API or OAuth failures, verify deployment environment variables and the service's own health/observability tooling; the static site does not expose `/health`, `/version`, or `/deployment` endpoints.

Security issues should follow [SECURITY.md](../../SECURITY.md), not a public issue.
