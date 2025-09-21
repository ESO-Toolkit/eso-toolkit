# Fix GitHub Pages Blank White Screen Issue

## Problem
Site shows blank white screen after merge and deployment to GitHub Pages. This usually indicates a build error, routing issue, or asset loading problem.

## Debug Steps

### Step 1: Check Browser Console
1. Go to `https://bkrupa.github.io/eso-log-aggregator/`
2. Open Developer Tools (F12)
3. Check the **Console** tab for JavaScript errors
4. Check the **Network** tab for failed requests (404s, etc.)

### Step 2: Check GitHub Actions Build
1. Go to your repo → **Actions** tab
2. Look at the latest workflow run
3. Check if the build succeeded or failed
4. Look for any errors in the build logs

### Step 3: Test Locally
Run these commands locally to see if the build works:
```bash
npm run build
npm run preview
```

## Common Causes & Solutions

### Issue 1: Build Errors from Linting/TypeScript
**Check**: Did the linting/TypeScript fixes break something?

**Fix**: Look for these in the build logs:
- TypeScript errors
- Import/export issues
- Missing dependencies

### Issue 2: Routing Issues
**Check**: Are you using React Router with hash routing?

**Fix**: Ensure your router is configured for GitHub Pages:
```typescript
// Make sure you're using HashRouter for GitHub Pages
import { HashRouter } from 'react-router-dom';

// In your main App component
<HashRouter>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/text-editor" element={<TextEditor />} />
  </Routes>
</HashRouter>
```

### Issue 3: Asset Loading Issues
**Check**: Are CSS files or other assets failing to load?

**Fix**: Verify your `vite.config.ts` has correct base path:
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/eso-log-aggregator/', // For repo pages
  // OR
  base: '/', // For user pages (bkrupa.github.io)
})
```

### Issue 4: Index.html Issues
**Check**: Did the build generate a proper `index.html`?

**Fix**: Ensure your `dist/index.html` contains:
- Proper script tags
- CSS links
- No broken asset references

## Quick Fixes to Try

### Fix 1: Check Vite Config Base Path
Based on your URL `bkrupa.github.io/eso-log-aggregator/`, you need:
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: '/eso-log-aggregator/',
})
```

### Fix 2: Force Rebuild and Redeploy
1. Make a small change (add a space to a comment)
2. Commit and push
3. Let GitHub Actions rebuild

### Fix 3: Check Router Configuration
Ensure you're using the right router:
```typescript
// For GitHub Pages subdirectory, use HashRouter
import { HashRouter as Router } from 'react-router-dom';

function App() {
  return (
    <Router>
      {/* Your routes */}
    </Router>
  );
}
```

## Debug Commands
Run these locally to debug:
```bash
# Check if build works
npm run build

# Check for TypeScript errors
npm run typecheck

# Check for linting errors
npm run lint

# Test production build locally
npm run preview
```

## What to Check
1. **Browser console errors** - Most important
2. **GitHub Actions build logs** - Check for build failures
3. **Network tab** - Look for 404s on assets
4. **vite.config.ts base path** - Should match your deployment URL

Let me know what you find in the browser console and GitHub Actions logs!