# Debug and Force Fix Preview Area Opacity Issue

## Problem
The preview area opacity changes aren't taking effect. This could be due to CSS caching, specificity issues, or the changes not being applied correctly.

## Debug Steps

### Step 1: Check What's Actually Applied
Add this temporary debug code to see what's happening:

```typescript
// Add this useEffect in TextEditor.tsx to debug preview area styles
useEffect(() => {
  const previewElement = document.getElementById('eso-preview');
  if (previewElement) {
    const beforeStyles = window.getComputedStyle(previewElement, '::before');
    const afterStyles = window.getComputedStyle(previewElement, '::after');
    
    console.log('=== PREVIEW AREA DEBUG ===');
    console.log('Theme mode:', theme.palette.mode);
    console.log('::before opacity:', beforeStyles.opacity);
    console.log('::before background-image:', beforeStyles.backgroundImage);
    console.log('::after background:', afterStyles.background);
    console.log('::after background-color:', afterStyles.backgroundColor);
  }
}, [theme.palette.mode]);
```

### Step 2: Force Override with Inline Styles
If the styled component isn't working, try this direct approach:

```typescript
// Add this useEffect to force the preview area styling
useEffect(() => {
  const previewElement = document.getElementById('eso-preview');
  if (previewElement) {
    // Create style element with ultra-high specificity
    const styleElement = document.createElement('style');
    styleElement.id = 'preview-area-override';
    
    const isLight = theme.palette.mode === 'light';
    const afterBackground = isLight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.2)';
    
    styleElement.textContent = `
      #eso-preview::after {
        content: "" !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: ${afterBackground} !important;
        z-index: -1 !important;
        pointer-events: none !important;
      }
      
      #eso-preview::before {
        content: "" !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background-image: url(${isLight ? '/text-editor/text-editor-bg-light.jpg' : '/text-editor/text-editor-bg-dark.jpg'}) !important;
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-attachment: fixed !important;
        opacity: 0.3 !important;
        z-index: -2 !important;
        pointer-events: none !important;
      }
    `;
    
    // Remove existing override if present
    const existing = document.getElementById('preview-area-override');
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(styleElement);
    console.log('Applied preview area override for', theme.palette.mode, 'mode');
    
    return () => {
      const element = document.getElementById('preview-area-override');
      if (element) {
        element.remove();
      }
    };
  }
}, [theme.palette.mode]);
```

### Step 3: Alternative - Simplified PreviewArea Component
If nothing else works, replace the entire PreviewArea with this simplified version:

```typescript
const PreviewArea = styled(Box)(() => ({
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

  // Mobile styles
  '@media (max-width: 768px)': {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
  },
}));

// Then add pseudo-elements with useEffect instead of CSS-in-JS
useEffect(() => {
  const previewElement = document.getElementById('eso-preview');
  if (previewElement) {
    const isLight = theme.palette.mode === 'light';
    
    // Remove existing styles
    previewElement.style.removeProperty('--before-bg');
    previewElement.style.removeProperty('--after-bg');
    
    // Set CSS custom properties
    previewElement.style.setProperty('--before-bg', `url(${isLight ? '/text-editor/text-editor-bg-light.jpg' : '/text-editor/text-editor-bg-dark.jpg'})`);
    previewElement.style.setProperty('--after-bg', isLight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.2)');
    
    console.log('Set preview styles for', theme.palette.mode, 'mode');
  }
}, [theme.palette.mode]);
```

And add this CSS to handle the pseudo-elements:

```css
/* Add to text-editor-page-background.css */
#eso-preview::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: var(--before-bg);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  opacity: 0.3;
  z-index: -2;
  pointer-events: none;
}

#eso-preview::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--after-bg);
  z-index: -1;
  pointer-events: none;
}
```

## What to Try First
1. **Add the debug code** and check what the console shows
2. **Try the force override** useEffect (Step 2) - this should definitely work
3. **Hard refresh** the page (Ctrl+F5) to clear any CSS caching

Let me know what the debug console shows!