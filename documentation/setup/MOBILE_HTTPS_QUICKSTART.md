# Mobile HTTPS Dev Server — Quick Start

Test the app on your phone against your local dev server, including OAuth login.

---

## Background

The PKCE OAuth login flow uses the browser's **Web Crypto API** (`window.crypto.subtle`).
Browsers block this API on plain HTTP origins — except `localhost`. So:

| Context | HTTP works? |
|---|---|
| `http://localhost:3000` (desktop) | ✅ Yes |
| `http://192.168.x.x:3000` (phone) | ❌ No — crypto blocked |
| `https://192.168.x.x:3001` (phone, after cert install) | ✅ Yes |

The dev server solves this by running **Vite HTTPS on port 3001** and an **HTTP proxy on port 3000** that forwards everything to it. Your desktop always uses plain HTTP; your phone uses HTTPS.

---

## One-Time Setup (per machine)

### 1. Start the server with HTTPS enabled

Open an **Administrator** PowerShell (right-click → Run as Administrator) and run:

```powershell
$env:VITE_HTTPS="true"; npm run dev
```

> **Why admin?** On first run, `mkcert` installs a trusted CA certificate into the Windows certificate store. This requires elevated permissions. You only need to do this once — subsequent runs work in a normal terminal.

Accept the UAC prompt when it appears. You should see:

```
  ➜  HTTP dev proxy  (desktop):  http://localhost:3000/
  ➜  CA install page (phone):    http://192.x.x.x:3000/install-ca
  ➜  HTTPS (phone, after cert):  https://192.x.x.x:3001/
  ➜  Local:   https://localhost:3001/
  ➜  Network: https://192.168.50.x:3001/
```

### 2. Install the CA certificate on your phone

On your phone, navigate to (replace with your actual LAN IP):

```
http://192.168.50.x:3000/install-ca
```

This page serves a **Download Certificate** button. The cert is embedded as a data URI to bypass Chrome's "can't download securely" block.

**Android:**
1. Tap **Download Certificate**
2. Open the downloaded `.crt` file
3. **Settings → Security → Install a certificate → CA certificate**
4. Confirm the warning and install

**iOS / iPadOS:**
1. Tap **Download Certificate** — tap **Allow** when prompted
2. **Settings → General → VPN & Device Management** → install the profile
3. **Settings → General → About → Certificate Trust Settings** → toggle full trust for *mkcert*

### 3. Open the app on your phone

```
https://192.168.50.x:3001
```

No cert warning. OAuth login works. HMR hot-reload works.

---

## Day-to-Day Usage

After the one-time setup, a normal (non-admin) terminal works fine:

```powershell
$env:VITE_HTTPS="true"; npm run dev
```

| Device | URL |
|---|---|
| Desktop Chrome | `http://localhost:3000` |
| Phone | `https://192.168.50.x:3001` |
| Phone — cert install page | `http://192.168.50.x:3000/install-ca` |

Normal dev (no phone needed):

```powershell
npm run dev
```

This starts HTTP-only on `http://localhost:3000` with no HTTPS overhead.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `The operation was canceled by the user` | UAC prompt was dismissed | Re-run in Administrator PowerShell |
| `CA file not found` | Server not started with `VITE_HTTPS=true` yet | Start with the flag so mkcert generates the cert |
| `This site can't provide a secure connection` | Phone visiting HTTP port at HTTPS port or vice versa | Check you're using the right port (3000 for HTTP, 3001 for HTTPS) |
| `Login redirect failed: Web Crypto API unavailable` | Phone accessing the HTTP URL | Use the HTTPS URL (`https://...3001`) instead |
| Download fails with "can't download securely" | Chrome blocking HTTP file download | The page embeds the cert as a `data:` URI — this should not happen; try refreshing |

---

## What Was Changed

### `vite.config.mjs`
- Added `vite-plugin-mkcert` (generates a trusted local CA + cert)
- When `VITE_HTTPS=true`:
  - Vite HTTPS server runs on `PORT+1` (default 3001)
  - A plain Node.js HTTP server runs on `PORT` (default 3000) that:
    - Reverse-proxies all requests to the HTTPS Vite server (including WebSocket HMR upgrades)
    - Serves `/install-ca` — an HTML page with the CA cert embedded as a `data:` URI download
    - Serves `/mkcert-ca.crt` — the raw cert file with correct MIME type

### `src/features/auth/auth.ts`
- `startPKCEAuth` now wraps the redirect in a `try/catch` and shows an `alert` with the error and the URL that was attempted if the redirect fails
- `generateCodeChallenge` now checks for `window.crypto?.subtle` before use and throws a descriptive error explaining the HTTPS requirement and listing workarounds

### `package.json`
- Added `vite-plugin-mkcert` as a dev dependency
