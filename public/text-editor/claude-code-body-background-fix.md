The issue is with the page background CSS, not the preview container itself. The body background image isn't loading in light mode.

**Problem**: The ESO background image on the page body doesn't appear in light mode until you switch to dark mode first. This affects the entire page, not just the preview container.

**Root Cause**: The issue is in `text-editor-page-background.css` or the `usePageBackground` hook. The CSS rules or JavaScript that sets the body background are not triggering properly for light mode on initial load.

**Solution - Fix the Page Background Loading**:

Add this CSS rule to `src/styles/text-editor-page-background.css` to force background image in both modes:

```css
/* Force background image for both light and dark mode */
body.text-editor-page,
body.text-editor-page.dark-mode,
body.text-editor-page:not(.dark-mode) {
  background-image: url('/images/eso-ss-1.jpg') !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  background-attachment: fixed !important;
  background-color: transparent !important;
}

/* Ensure the ::before pseudo-element works in both modes */
body.text-editor-page::before,
body.text-editor-page.dark-mode::before,
body.text-editor-page:not(.dark-mode)::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/images/eso-ss-1.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  opacity: 1 !important;
  z-index: -1;
  pointer-events: none;
}
```

**Alternative - Fix the JavaScript Hook**:

If the CSS doesn't work, the issue might be in the `usePageBackground` hook. Modify the `usePageBackground` call in TextEditor.tsx:

```typescript
// In TextEditor.tsx, modify this line:
usePageBackground('text-editor-page', theme.palette.mode === 'dark');

// To this - force background for both modes:
usePageBackground('text-editor-page', true); // Always apply background

// Or add a useEffect to force it:
useEffect(() => {
  // Force add the background class regardless of theme
  document.body.classList.add('text-editor-page');
  
  // Force background image directly on body
  document.body.style.backgroundImage = `url(${backgroundImage})`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundAttachment = 'fixed';
  
  return () => {
    document.body.classList.remove('text-editor-page');
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundRepeat = '';
    document.body.style.backgroundAttachment = '';
  };
}, []); // Empty dependency array - run once on mount
```

**Simplified Preview Area** (remove the background color from text):

```typescript
const PreviewArea = styled(Box)(({ theme }) => ({
  marginTop: '20px',
  padding: '20px',
  borderRadius: '12px',
  minHeight: '120px',
  background: 'transparent !important',
  backgroundColor: 'transparent !important',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  fontSize: '1rem',
  lineHeight: '1.6',
  position: 'relative',
  overflow: 'hidden',
  zIndex: 1,
  transition: 'all 0.15s ease-in-out',
  color: '#ffffff',
  
  '& span': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    position: 'relative',
    zIndex: 2,
    // Remove background color from text
  },
  
  '& *': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
  },
  
  '& span[style*="color: #888"], & span[style*="italic"]': {
    color: 'rgba(255, 255, 255, 0.7) !important',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9) !important',
  },
  
  '& span[style*="color: #"]': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
    fontWeight: '500',
  },
  
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
  },
}));
```

**What This Fixes**:
- ✅ Forces body background image to load in both light and dark mode
- ✅ Ensures CSS rules apply regardless of initial theme
- ✅ Removes background color from preview text
- ✅ Makes the page background work immediately on light mode load

**Testing**:
1. Load page directly in light mode - background should appear immediately
2. Refresh in light mode - should still work
3. Preview container should show transparent with white text over the body background