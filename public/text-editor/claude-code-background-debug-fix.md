The background image issue in light mode suggests a deeper CSS conflict. Let's try a different approach.

**Problem**: Background image only shows in light mode after visiting dark mode first. Multiple fallback paths didn't work.

**Likely Root Cause**: The issue is probably in the CSS files, not the React component. The `text-editor-page-background.css` or `texteditor-theme-bridge.css` might be interfering with light mode.

**New Approach - Remove CSS Dependencies**:

Replace the `PreviewArea` styled component with this version that bypasses the CSS file conflicts entirely:

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
  
  // Skip ::before approach - use direct background instead
  backgroundImage: `url(${backgroundImage})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'scroll', // Changed from 'fixed' which can cause issues
  
  // Add a semi-transparent overlay for text readability
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.3)', // Light overlay for text readability
    zIndex: 1,
    pointerEvents: 'none',
  },
  
  '& span': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    position: 'relative',
    zIndex: 2,
  },
  
  '& *': {
    position: 'relative',
    zIndex: 2,
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

**Alternative - Debug First**:

If you want to debug what's happening, try this temporary version that logs the background image path:

```typescript
const PreviewArea = styled(Box)(({ theme }) => {
  // Debug logging
  console.log('PreviewArea render - theme mode:', theme.palette.mode);
  console.log('Background image path:', backgroundImage);
  
  return {
    marginTop: '20px',
    padding: '20px',
    borderRadius: '12px',
    minHeight: '120px',
    background: `url(${backgroundImage}) center/cover no-repeat, transparent`,
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
      background: 'rgba(0, 0, 0, 0.3)',
      padding: '2px 4px',
      borderRadius: '2px',
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
  };
});
```

**Additional Investigation**:

Also check if there's a CSS rule in `text-editor-page-background.css` that's overriding the preview area in light mode. Look for rules like:

```css
/* This might be the problem */
body.text-editor-page:not(.dark-mode) .css-something {
  background: white !important;
}
```

**If Nothing Works - Nuclear Option**:

Try adding an `id` to force specificity:

```typescript
<PreviewArea id="eso-preview-force-bg">{renderPreview()}</PreviewArea>
```

And use this styling:

```typescript
const PreviewArea = styled(Box)(({ theme }) => ({
  '&#eso-preview-force-bg': {
    backgroundImage: `url(${backgroundImage}) !important`,
    backgroundSize: 'cover !important',
    backgroundPosition: 'center !important',
    backgroundRepeat: 'no-repeat !important',
  },
  // ... rest of styles
}));
```

**What to Check**:
1. Look at browser dev tools - is the background-image CSS property being applied?
2. Check the Network tab - is the image file loading?
3. Look for CSS conflicts in the Computed styles
4. Try the debug version to see console logs