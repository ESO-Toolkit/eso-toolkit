# Fix Light Mode Background Image Loading Issue

## Problem
Background image shows in dark mode but NOT in light mode unless you switch to dark mode first. This is the same issue we debugged earlier - the `usePageBackground` hook isn't applying the background properly in light mode on initial load.

## Solution - Fix usePageBackground Hook

### Update usePageBackground Hook
In `src/hooks/usePageBackground.ts`, replace with this version that forces background in both modes:

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

    // FORCE background image for both modes with direct DOM manipulation
    const html = document.documentElement;
    const body = document.body;
    
    // Determine background image based on theme
    const backgroundImage = isDarkMode
      ? '/text-editor/text-editor-bg-dark.jpg'
      : '/text-editor/text-editor-bg-light.jpg';
    
    // Force apply to HTML element (highest priority)
    html.style.setProperty('background-image', `url(${backgroundImage})`, 'important');
    html.style.setProperty('background-size', 'cover', 'important');
    html.style.setProperty('background-position', 'center', 'important');
    html.style.setProperty('background-repeat', 'no-repeat', 'important');
    html.style.setProperty('background-attachment', 'fixed', 'important');
    
    // Make body transparent to show HTML background
    body.style.setProperty('background', 'transparent', 'important');
    body.style.setProperty('background-color', 'transparent', 'important');

    // Also apply fallback to body
    body.style.setProperty('background-image', `url(${backgroundImage})`, 'important');
    body.style.setProperty('background-size', 'cover', 'important');
    body.style.setProperty('background-position', 'center', 'important');
    body.style.setProperty('background-repeat', 'no-repeat', 'important');
    body.style.setProperty('background-attachment', 'fixed', 'important');

    console.log('Applied background image:', backgroundImage);

    return () => {
      document.body.classList.remove(pageClass);
      document.body.classList.remove('dark-mode');
      
      // Cleanup
      html.style.removeProperty('background-image');
      html.style.removeProperty('background-size');
      html.style.removeProperty('background-position');
      html.style.removeProperty('background-repeat');
      html.style.removeProperty('background-attachment');
      
      body.style.removeProperty('background');
      body.style.removeProperty('background-color');
      body.style.removeProperty('background-image');
      body.style.removeProperty('background-size');
      body.style.removeProperty('background-position');
      body.style.removeProperty('background-repeat');
      body.style.removeProperty('background-attachment');
    };
  }, [pageClass, isDarkMode]);
}
```

## Alternative - Add Nuclear Option in TextEditor

If the hook fix doesn't work, add this useEffect directly in the TextEditor component:

```typescript
// Add this useEffect in TextEditor.tsx after the existing ones
useEffect(() => {
  const html = document.documentElement;
  const body = document.body;
  
  // Force background image based on current theme
  const bgImage = theme.palette.mode === 'dark'
    ? '/text-editor/text-editor-bg-dark.jpg'
    : '/text-editor/text-editor-bg-light.jpg';

  // Nuclear option - force background with highest specificity
  html.style.setProperty('background-image', `url(${bgImage})`, 'important');
  html.style.setProperty('background-size', 'cover', 'important');
  html.style.setProperty('background-position', 'center', 'important');
  html.style.setProperty('background-repeat', 'no-repeat', 'important');
  html.style.setProperty('background-attachment', 'fixed', 'important');
  
  // Make body transparent
  body.style.setProperty('background', 'transparent', 'important');

  console.log('Force applied background:', bgImage);

  return () => {
    html.style.removeProperty('background-image');
    html.style.removeProperty('background-size');
    html.style.removeProperty('background-position');
    html.style.removeProperty('background-repeat');
    html.style.removeProperty('background-attachment');
    body.style.removeProperty('background');
  };
}, [theme.palette.mode]); // Re-run when theme changes
```

## Expected Result
- ✅ Background image loads immediately in light mode (no need to switch to dark first)
- ✅ Background image switches correctly when changing themes
- ✅ Preview area transparency works in both modes
- ✅ Works on both local development and GitHub Pages

This should fix the light mode background image loading issue that we debugged earlier!