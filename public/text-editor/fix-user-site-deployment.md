# Fix GitHub Pages User Site Deployment

## Problem
Your site is now deployed to `bkrupa.github.io` (user GitHub Pages site) but the Vite base path is still configured for `/eso-log-aggregator/` subdirectory, causing:
- URLs to be `bkrupa.github.io/eso-log-aggregator/#/text-editor` instead of `bkrupa.github.io/#/text-editor`
- Background images not loading because they're looking for `bkrupa.github.io/eso-log-aggregator/text-editor/...`

## Solution

### Fix vite.config.ts
Remove or change the base path configuration:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Remove this line or set it to '/' for root deployment:
  // base: '/eso-log-aggregator/', // Remove this
  base: '/', // Change to root path
})
```

### Update Background Image Paths
The background images should now use absolute paths from root:

#### In TextEditor.tsx PreviewArea:
```typescript
const PreviewArea = styled(Box)(({ theme }) => ({
  // ... other styles ...
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Use absolute paths from root
    backgroundImage: `url(/text-editor/${theme.palette.mode === 'dark' ? 'text-editor-bg-dark.jpg' : 'text-editor-bg-light.jpg'})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    opacity: 0.3,
    zIndex: -1,
    pointerEvents: 'none',
  },
  
  // ... rest of styles ...
}));
```

#### In usePageBackground.ts:
```typescript
export function usePageBackground(pageClass: string, isDarkMode = false): void {
  useEffect(() => {
    // ... existing code ...
    
    // Apply background image to body based on theme
    const backgroundImage = isDarkMode
      ? 'url("/text-editor/text-editor-bg-dark.jpg")'
      : 'url("/text-editor/text-editor-bg-light.jpg")';

    document.body.style.backgroundImage = backgroundImage;
    // ... rest of existing code ...
  }, [pageClass, isDarkMode]);
}
```

### Verify File Structure
Make sure your background images are in the correct location:
```
public/
├── text-editor/
│   ├── text-editor-bg-light.jpg
│   └── text-editor-bg-dark.jpg
```

### Check GitHub Pages Settings
1. Go to your repo: Settings → Pages
2. Make sure Source is set to "Deploy from a branch"
3. Branch should be `gh-pages` or `main` (wherever your built files are)
4. Folder should be `/ (root)` or `/docs` depending on your setup

## Expected Result
After these changes:
- ✅ URLs will be `bkrupa.github.io/#/text-editor`
- ✅ Background images will load from `bkrupa.github.io/text-editor/...`
- ✅ Site will work correctly on the root domain

## If Images Still Don't Load
Check these URLs directly in your browser:
- `https://bkrupa.github.io/text-editor/text-editor-bg-light.jpg`
- `https://bkrupa.github.io/text-editor/text-editor-bg-dark.jpg`

If they return 404, the images aren't being deployed correctly to the public folder.