# Cache-Busting Implementation

This document describes the cache-busting system implemented for the ESO Log Aggregator web application to ensure users always receive the latest version after deployments.

## Overview

The cache-busting system ensures that when a new version is deployed, users' browsers will fetch the latest resources instead of serving cached versions. This is critical for web applications to ensure all users see the latest features and bug fixes.

## Components

### 1. Version Generation (`scripts/generate-version.js`)

This script generates version information that includes:
- Package version from `package.json`
- Git commit hash (short and full)
- Build timestamp
- Unique build ID
- Cache-busting query parameters

**When it runs:** Before every build (`prebuild` script)

**What it creates:**
- `public/version.json` - Static version file served to browsers
- `src/version.json` - Version data for development
- `src/utils/version.ts` - TypeScript constants for the application

### 2. Manifest Updates (`scripts/update-manifest.js`)

Updates the web app manifest with version information:
- Adds version to the manifest
- Updates the start URL with cache-busting parameters
- Includes build information for debugging

### 3. Cache-Busting Utilities (`src/utils/cacheBusting.ts`)

Provides utility functions for:
- Adding cache-busting parameters to URLs
- Checking if cached resources should be invalidated
- Generating cache headers
- Version comparison

### 4. React Hooks (`src/hooks/useCacheInvalidation.ts`)

React hooks for managing cache invalidation:
- `useCacheInvalidation()` - Periodically checks for new versions
- `useCacheBustedUrl()` - Adds cache-busting to URLs
- `useVersionInfo()` - Access current version information

### 5. UI Components (`src/components/UpdateNotification/`)

User interface components:
- `UpdateNotification` - Shows update notifications to users
- `VersionInfo` - Displays version information

## How It Works

### Build Process

1. **Pre-build:** Generate version information and update manifest
2. **Build:** Vite generates hashed asset names (already cache-busted)
3. **Post-build:** Version files are included in the build output

### Runtime Process

1. **App loads:** Version information is embedded in the application
2. **Periodic checks:** App periodically fetches `/version.json` to check for updates
3. **Version comparison:** If server version differs from client version, show update notification
4. **User action:** User can reload to get the latest version

### Cache Invalidation Strategies

1. **Asset-level:** Vite generates unique filenames with hashes
2. **Application-level:** Version checking with user notifications
3. **Browser-level:** Cache-control headers in HTML
4. **Manual:** Users can force refresh to clear cache

## Usage

### Adding Cache-Busting to URLs

```typescript
import { addCacheBuster } from '@/utils/cacheBusting';

const url = addCacheBuster('/api/data');
// Result: /api/data?v=010abc123def4567890
```

### Checking for Updates

```typescript
import { useCacheInvalidation } from '@/hooks/useCacheInvalidation';

function MyComponent() {
  const [state, actions] = useCacheInvalidation();
  
  if (state.hasUpdate) {
    // Show update notification
  }
}
```

### Displaying Version Info

```tsx
import { VersionInfo } from '@/components/UpdateNotification';

function Footer() {
  return (
    <div>
      <VersionInfo format="short" />
    </div>
  );
}
```

### Showing Update Notifications

```tsx
import { UpdateNotification } from '@/components/UpdateNotification';

function App() {
  return (
    <div>
      {/* Your app content */}
      <UpdateNotification />
    </div>
  );
}
```

## Configuration

### Check Interval

Default: 5 minutes. Can be customized:

```typescript
const [state, actions] = useCacheInvalidation(10 * 60 * 1000); // 10 minutes
```

### Cache Headers

The system adds appropriate cache headers:
- `Cache-Control: public, max-age=3600, must-revalidate`
- `ETag` based on build ID
- `Last-Modified` based on build time

## Development vs Production

### Development
- Uses random commit hash if git is not available
- Shows build information in manifest description
- More verbose logging

### Production
- Uses actual git commit hash
- Optimized for performance
- Clean manifest without debug info

## Deployment Integration

### GitHub Actions

The build process is integrated with GitHub Actions:

```yaml
- name: Build project
  run: npm run build
  env:
    NODE_ENV: production
    VITE_RELEASE_VERSION: ${{ github.sha }}
```

### Manual Deployment

For manual deployments, ensure environment variables are set:

```bash
export NODE_ENV=production
npm run build
```

## Files Created/Modified

### Generated Files (do not edit manually)
- `public/version.json`
- `src/version.json` 
- `src/utils/version.ts`

### Configuration Files
- Updated `package.json` scripts
- Updated `vite.config.mjs` for build-time constants
- Updated `public/index.html` with cache-control headers

### New Implementation Files
- `scripts/generate-version.js`
- `scripts/update-manifest.js`
- `scripts/clean-version.js`
- `src/utils/cacheBusting.ts`
- `src/hooks/useCacheInvalidation.ts`
- `src/components/UpdateNotification/`

## Troubleshooting

### Version files not generated
Run: `npm run clean:version && npm run prebuild`

### Updates not detected
Check browser network tab for `/version.json` requests

### Cache not clearing
Use the force reload button in the update notification

### Version mismatch in development
Ensure you've run `npm run prebuild` after pulling changes

## Best Practices

1. **Always run prebuild** before building for production
2. **Test update notifications** in development
3. **Monitor version checks** in production for errors
4. **Use semantic versioning** for clear version communication
5. **Document version changes** in release notes

## Security Considerations

- Version information doesn't expose sensitive data
- Cache-busting parameters are publicly visible (expected)
- Git commit hashes are truncated for privacy
- No authentication required for version checks
