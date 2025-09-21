# Revert usePageBackground Hook Completely and Use Simple Fix

## Problem
The `usePageBackground` hook changes are making components transparent. We need to revert it completely and use a different approach for the light mode background issue.

## Solution - Revert Hook and Use Direct Fix in Component

### Step 1: Revert usePageBackground Hook to Original
In `src/hooks/usePageBackground.ts`, revert to the simple original version:

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

    // Apply background image to body based on theme
    const backgroundImage = isDarkMode
      ? 'url("/text-editor/text-editor-bg-dark.jpg")'
      : 'url("/text-editor/text-editor-bg-light.jpg")';

    document.body.style.backgroundImage = backgroundImage;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';

    return () => {
      document.body.classList.remove(pageClass);
      document.body.classList.remove('dark-mode');
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    };
  }, [pageClass, isDarkMode]);
}
```

### Step 2: Force Light Mode Background in TextEditor Component
Add this simple fix directly in the TextEditor component to force light mode background:

```typescript
// Add this useEffect in TextEditor.tsx AFTER the usePageBackground call
useEffect(() => {
  // Simple fix for light mode background loading
  if (theme.palette.mode === 'light') {
    const body = document.body;
    // Force light mode background image
    setTimeout(() => {
      body.style.backgroundImage = 'url("/text-editor/text-editor-bg-light.jpg")';
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center';
      body.style.backgroundRepeat = 'no-repeat';
      body.style.backgroundAttachment = 'fixed';
    }, 100); // Small delay to ensure it applies
  }
}, [theme.palette.mode]);
```

### Step 3: Ensure EditorTool Has Solid Background
Make sure the `EditorTool` component has the solid background:

```typescript
const EditorTool = styled(Box)(({ theme }) => ({
  maxWidth: 900,
  margin: '2rem auto 2rem auto',
  background: 'var(--panel)', // Ensure this is here
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
  
  [theme.breakpoints.down('sm')]: {
    display: 'grid',
    gridTemplateRows: 'auto auto',
    gap: '16px',
    margin: '1rem',
    backdropFilter: 'blur(8px) saturate(160%)',
    background: 'var(--panel)', // Also ensure mobile has solid background
  },
}));
```

## What This Does
- ✅ Reverts the hook to not mess with component transparency
- ✅ Keeps all components solid and opaque
- ✅ Only adds a small fix for light mode background loading
- ✅ Uses setTimeout to ensure light mode background applies

This should restore solid component backgrounds while fixing the light mode issue!