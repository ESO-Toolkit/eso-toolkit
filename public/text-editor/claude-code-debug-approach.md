We need to debug the actual root cause. Let's inspect what's happening with the CSS classes and background loading.

**Debug Steps First**:

Add this temporary debugging code to the TextEditor component to see what's happening:

```typescript
// Add this useEffect after the existing useEffects in TextEditor.tsx
useEffect(() => {
  console.log('=== DEBUG INFO ===');
  console.log('Theme mode:', theme.palette.mode);
  console.log('Body classes:', document.body.className);
  console.log('HTML classes:', document.documentElement.className);
  console.log('Background image import:', backgroundImage);
  
  // Check computed styles
  const bodyStyles = window.getComputedStyle(document.body);
  console.log('Body background-image:', bodyStyles.backgroundImage);
  console.log('Body background-size:', bodyStyles.backgroundSize);
  
  // Check if CSS files are loaded
  const stylesheets = Array.from(document.styleSheets);
  console.log('Loaded stylesheets:', stylesheets.length);
  
  // Force inspect the usePageBackground hook
  console.log('usePageBackground should have been called with:', 'text-editor-page', theme.palette.mode === 'dark');
}, [theme.palette.mode]);
```

**Alternative Nuclear Option - Bypass Everything**:

If debugging doesn't help, try this approach that completely bypasses the CSS system:

```typescript
// Add this useEffect to force body background regardless of CSS
useEffect(() => {
  const body = document.body;
  const html = document.documentElement;
  
  // Force remove any conflicting styles
  body.style.cssText = '';
  
  // Force add background directly with inline styles (highest specificity)
  body.style.setProperty('background-image', `url(${backgroundImage})`, 'important');
  body.style.setProperty('background-size', 'cover', 'important');
  body.style.setProperty('background-position', 'center', 'important'); 
  body.style.setProperty('background-repeat', 'no-repeat', 'important');
  body.style.setProperty('background-attachment', 'fixed', 'important');
  body.style.setProperty('background-color', 'transparent', 'important');
  
  // Also try on html element
  html.style.setProperty('background-image', `url(${backgroundImage})`, 'important');
  html.style.setProperty('background-size', 'cover', 'important');
  html.style.setProperty('background-position', 'center', 'important');
  html.style.setProperty('background-repeat', 'no-repeat', 'important');
  html.style.setProperty('background-attachment', 'fixed', 'important');
  
  // Force classes
  body.classList.add('text-editor-page');
  
  console.log('Forced background image:', backgroundImage);
  
  return () => {
    // Cleanup
    body.style.removeProperty('background-image');
    body.style.removeProperty('background-size');
    body.style.removeProperty('background-position');
    body.style.removeProperty('background-repeat');
    body.style.removeProperty('background-attachment');
    body.style.removeProperty('background-color');
    html.style.removeProperty('background-image');
    html.style.removeProperty('background-size');
    html.style.removeProperty('background-position');
    html.style.removeProperty('background-repeat');
    html.style.removeProperty('background-attachment');
    body.classList.remove('text-editor-page');
  };
}, []); // Run once on mount, no dependencies
```

**Check usePageBackground Hook**:

Also, can you check what the `usePageBackground` hook actually does? Look at `src/hooks/usePageBackground.ts` or wherever it's defined. The issue might be in that hook not applying styles correctly for light mode.

**Simplified PreviewArea** (just transparent):

```typescript
const PreviewArea = styled(Box)(() => ({
  marginTop: '20px',
  padding: '20px',
  borderRadius: '12px',
  minHeight: '120px',
  background: 'transparent',
  backgroundColor: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  fontSize: '1rem',
  lineHeight: '1.6',
  position: 'relative',
  color: '#ffffff',
  
  '& span': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
  
  '& span[style*="color: #"]': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
    fontWeight: '500',
  },
}));
```

**What the Debug Should Tell Us**:
1. Is the theme mode detection working?
2. Are the CSS classes being applied to body?
3. Is the background image import path correct?
4. Are the CSS files actually loading?
5. What computed styles are actually being applied?

Run the debug version first and let me know what the console shows. That will tell us exactly what's happening and why the background isn't loading in light mode.