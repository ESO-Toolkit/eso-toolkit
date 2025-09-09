# Cache-Busting Quick Start Guide

This guide shows you how to use the cache-busting features in your ESO Log Aggregator deployment.

## Overview

The cache-busting system ensures users always get the latest version of your application after deployments. It works automatically with your existing build process.

## Basic Usage

### 1. Building with Cache-Busting

```bash
# Build for production (includes cache-busting)
npm run build

# Or run prebuild manually to generate version files
npm run prebuild
```

### 2. Show Update Notifications

The `UpdateNotification` component is automatically included in the main App. It will:

- Check for new versions every 5 minutes
- Show a notification when updates are available
- Allow users to reload and get the latest version

### 3. Display Version Information

```tsx
import { VersionInfo } from '@/components/UpdateNotification';

// Show version in footer or about section
<VersionInfo format="short" />          // "v0.1.0 (abc123)"
<VersionInfo format="full" />           // Full version with build time
<VersionInfo format="badge" />          // Compact badge style
```

### 4. Check for Updates Programmatically

```tsx
import { useCacheInvalidation } from '@/hooks/useCacheInvalidation';

function MyComponent() {
  const [state, actions] = useCacheInvalidation();

  if (state.hasUpdate) {
    return (
      <div>
        New version available: {state.serverVersion}
        <button onClick={actions.forceReload}>Update Now</button>
      </div>
    );
  }

  return <div>Current version: {state.currentVersion}</div>;
}
```

### 5. Add Cache-Busting to URLs

```tsx
import { useCacheBustedUrl } from '@/hooks/useCacheInvalidation';

function DataComponent() {
  const apiUrl = useCacheBustedUrl('/api/data');
  // URL becomes: /api/data?v=010abc123def4567890
}
```

## How It Works

1. **Build Time**: Version information is generated with git commit and timestamp
2. **Runtime**: App periodically checks `/version.json` for new versions
3. **Detection**: If server version differs from client version, shows notification
4. **Update**: Users can reload to get the latest version with cleared cache

## Configuration

### Change Update Check Interval

```tsx
// Check every 10 minutes instead of 5
const [state, actions] = useCacheInvalidation(10 * 60 * 1000);
```

### Customize Update Notification

```tsx
<UpdateNotification
  showVersionInfo={false} // Hide version details
  position={{
    vertical: 'top',
    horizontal: 'center',
  }}
  customActions={<Button onClick={customAction}>Learn More</Button>}
/>
```

## Files Generated

The build process creates these files automatically:

- `public/version.json` - Version info served to browsers
- `src/utils/version.ts` - TypeScript constants for your app
- Updated `public/manifest.json` - Web app manifest with version

## Scripts

```bash
npm run prebuild        # Generate version files
npm run build          # Full build with cache-busting
npm run clean:version   # Remove generated version files
```

## Deployment

### GitHub Actions (Already Configured)

The existing GitHub Actions workflow automatically includes cache-busting.

### Manual Deployment

```bash
# Ensure version files are generated
npm run prebuild

# Build for production
npm run build

# Deploy the build/ directory
```

## Troubleshooting

### "No updates detected"

- Check browser Network tab for `/version.json` requests
- Ensure version files were generated: `ls public/version.json`

### "Version files not found"

- Run: `npm run clean:version && npm run prebuild`

### "Update notification not showing"

- Check console for version check errors
- Verify `UpdateNotification` is included in your component tree

## Production Considerations

- Version checks happen automatically and silently fail if network issues occur
- Users can dismiss update notifications
- Cache clearing only affects application cache, not browser cache
- The system works offline and gracefully handles network failures

## Security

- Version information doesn't expose sensitive data
- Git commit hashes are public information
- No authentication required for version checks
- Cache-busting parameters are expected to be publicly visible
