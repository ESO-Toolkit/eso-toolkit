# Fix GitHub Pages Background Image Paths for Subdirectory Deployment

## Problem
Your site is deployed to `bkrupa.github.io/eso-log-aggregator` (subdirectory), but the background images use absolute paths like `/text-editor/text-editor-bg-light.jpg` which resolve to:
- ❌ `bkrupa.github.io/text-editor/...` (wrong - 404 error)
- ✅ Should be: `bkrupa.github.io/eso-log-aggregator/text-editor/...`

## Solution 1: Add Base Path to Image URLs

### Fix the PreviewArea Component
In `src/components/TextEditor.tsx`, update the background image paths to include the base path:

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
    // ADD BASE PATH to image URLs
    backgroundImage: `url(${process.env.PUBLIC_URL || ''}/text-editor/${theme.palette.mode === 'dark' ? 'text-editor-bg-dark.jpg' : 'text-editor-bg-light.jpg'})`,
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

### Fix the usePageBackground Hook
In `src/hooks/usePageBackground.ts`, update the background image paths:

```typescript
export function usePageBackground(pageClass: string, isDarkMode = false): void {
  useEffect(() => {
    // ... existing code ...
    
    // Apply background image to body based on theme with base path
    const basePath = process.env.PUBLIC_URL || '';
    const backgroundImage = isDarkMode
      ? `url("${basePath}/text-editor/text-editor-bg-dark.jpg")`
      : `url("${basePath}/text-editor/text-editor-bg-light.jpg")`;

    document.body.style.backgroundImage = backgroundImage;
    // ... rest of existing code ...
  }, [pageClass, isDarkMode]);
}
```

### Fix CSS Files
In `src/styles/text-editor-page-background.css`, update all image paths:

```css
/* Update all instances like this */
body.text-editor-page:not(.dark-mode) {
  background-image: url('./text-editor/text-editor-bg-light.jpg') !important;
  /* ... other styles ... */
}

body.text-editor-page.dark-mode {
  background-image: url('./text-editor/text-editor-bg-dark.jpg') !important;
  /* ... other styles ... */
}

/* Update all ::before pseudo-elements */
body.text-editor-page::before {
  background-image: url('./text-editor/text-editor-bg-light.jpg');
  /* ... other styles ... */
}

body.text-editor-page.dark-mode::before {
  background-image: url('./text-editor/text-editor-bg-dark.jpg');
}

/* And any other image references... */
```

## Solution 2: Use Vite Base Configuration (Recommended)

### Update vite.config.ts
Add the base path configuration:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/eso-log-aggregator/', // Add this line for GitHub Pages subdirectory
})
```

### Then use absolute paths normally
With the Vite base config, you can keep the original absolute paths:

```typescript
// In PreviewArea component
backgroundImage: `url(/text-editor/${theme.palette.mode === 'dark' ? 'text-editor-bg-dark.jpg' : 'text-editor-bg-light.jpg'})`,

// In usePageBackground hook  
const backgroundImage = isDarkMode
  ? 'url("/text-editor/text-editor-bg-dark.jpg")'
  : 'url("/text-editor/text-editor-bg-light.jpg")';
```

## Solution 3: Move Images to src/assets and Import

### Move images from public to src/assets
Move the images from `public/text-editor/` to `src/assets/text-editor/`

### Import and use them
```typescript
// At top of TextEditor.tsx
import bgDark from '../assets/text-editor/text-editor-bg-dark.jpg';
import bgLight from '../assets/text-editor/text-editor-bg-light.jpg';

// In PreviewArea component
backgroundImage: `url(${theme.palette.mode === 'dark' ? bgDark : bgLight})`,
```

## Recommended Approach
Use **Solution 2** (Vite base configuration) as it's the cleanest and most standard approach for GitHub Pages subdirectory deployments. This ensures all assets work correctly both locally and on GitHub Pages.

After implementing any solution, redeploy to GitHub Pages and the background images should load correctly at `bkrupa.github.io/eso-log-aggregator`.