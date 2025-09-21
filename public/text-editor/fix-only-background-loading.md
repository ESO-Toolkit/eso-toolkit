# Fix Light Mode Background Loading WITHOUT Making Components Transparent

## Problem
The previous fix made the header and text editor component transparent in light mode because we changed the `EditorTool` container background. We need to fix ONLY the page background loading issue.

## Solution - Revert EditorTool and Fix Only usePageBackground

### Step 1: Revert EditorTool Container Background
In `src/components/TextEditor.tsx`, change the `EditorTool` back to using the solid panel background:

```typescript
const EditorTool = styled(Box)(({ theme }) => ({
  maxWidth: 900,
  margin: '2rem auto 2rem auto',
  
  // REVERT TO: Use solid background again
  background: 'var(--panel)', // Put this back
  
  padding: '24px',
  borderRadius: '14px',
  border: '1px solid var(--border)',
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: 'var(--text)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 30px rgba(0, 0, 0, 0.6)'
      : '0 8px 30px rgba(0, 0, 0, 0.15)',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  position: 'relative',
  zIndex: 1,
  
  // Mobile styles
  [theme.breakpoints.down('sm')]: {
    display: 'grid',
    gridTemplateRows: 'auto auto',
    gap: '16px',
    margin: '1rem',
    backdropFilter: 'blur(8px) saturate(160%)',
    background: 'var(--panel)', // Also revert mobile
  },
}));
```

### Step 2: Fix ONLY the Page Background Loading
Replace the `usePageBackground` hook with this version that ONLY fixes the background loading:

```typescript
import { useEffect } from 'react';

export function usePageBackground(pageClass: string, isDarkMode = false): void {
  useEffect(() => {
    // Add page class
    document.body.classList.add(pageClass);
    
    // Add/remove dark mode class
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Fix the background image loading issue ONLY
    const body = document.body;
    
    // Determine background image based on theme
    const backgroundImage = isDarkMode
      ? 'url("/text-editor/text-editor-bg-dark.jpg")'
      : 'url("/text-editor/text-editor-bg-light.jpg")';
    
    // Apply background image to body only (don't touch other elements)
    body.style.backgroundImage = backgroundImage;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center';
    body.style.backgroundRepeat = 'no-repeat';
    body.style.backgroundAttachment = 'fixed';
    
    // FORCE it to apply in light mode by using setTimeout
    setTimeout(() => {
      body.style.backgroundImage = backgroundImage;
    }, 0);

    console.log('Applied background:', backgroundImage);

    return () => {
      document.body.classList.remove(pageClass);
      document.body.classList.remove('dark-mode');
      
      // Clean up ONLY body background
      body.style.backgroundImage = '';
      body.style.backgroundSize = '';
      body.style.backgroundPosition = '';
      body.style.backgroundRepeat = '';
      body.style.backgroundAttachment = '';
    };
  }, [pageClass, isDarkMode]);
}
```

## Key Points

### What We're NOT Changing:
- ❌ Don't make EditorTool transparent
- ❌ Don't make header transparent  
- ❌ Don't touch component backgrounds

### What We ARE Fixing:
- ✅ ONLY fix the page background image loading in light mode
- ✅ Keep all component backgrounds solid and normal
- ✅ Fix the timing issue that prevents light mode background from loading

## Expected Result
- ✅ Header and text editor components have solid backgrounds (not transparent)
- ✅ Page background image loads correctly in light mode on first visit
- ✅ Preview area shows background through its own transparency (not parent transparency)
- ✅ Everything works like it did in the original working version

This should fix ONLY the light mode background loading issue without making any components transparent.