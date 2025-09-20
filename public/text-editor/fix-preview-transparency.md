The preview area transparency is broken in the current implementation. Here's what's wrong and how to fix it:

**Problems Identified:**

1. **::after overlay blocking transparency**: The preview area has both `::before` (background image) and `::after` (overlay) pseudo-elements that prevent true transparency
2. **Direct background image on preview**: The preview shouldn't have its own background image - it should show the page background through transparency  
3. **Complex pseudo-element layering**: Multiple pseudo-elements are conflicting

**Solution - Simplify PreviewArea for True Transparency:**

Replace the current `PreviewArea` styled component with this simplified version:

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

  // Remove all pseudo-elements - let the page background show through
  // No ::before or ::after needed for true transparency

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

  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
  },
}));
```

**Key Changes:**
1. **Removed ::before pseudo-element** - No direct background image on preview
2. **Removed ::after overlay** - No blocking semi-transparent layer
3. **Simplified structure** - Just a transparent container
4. **Fixed border color** - Always white with opacity for ESO look
5. **Clean transparency** - Let the page body background show through

**Why This Works:**
- ✅ Preview area becomes truly transparent
- ✅ Page background (set by your debug code on html element) shows through
- ✅ Text remains readable with shadows
- ✅ No competing pseudo-elements
- ✅ Works in both light and dark modes

**Additional Fix - Clean Up Debug Code:**

You can also remove the complex debug useEffect since it was just for testing. The simplified approach is:

```typescript
// Replace the complex debug useEffect with this simple one:
useEffect(() => {
  const html = document.documentElement;
  const bgImage = theme.palette.mode === 'dark' 
    ? '/text-editor/text-editor-bg-dark.jpg' 
    : '/text-editor/text-editor-bg-light.jpg';

  html.style.setProperty('background-image', `url(${bgImage})`, 'important');
  html.style.setProperty('background-size', 'cover', 'important');
  html.style.setProperty('background-position', 'center', 'important');
  html.style.setProperty('background-repeat', 'no-repeat', 'important');
  html.style.setProperty('background-attachment', 'fixed', 'important');

  // Make body transparent to show html background
  document.body.style.setProperty('background', 'transparent', 'important');

  return () => {
    html.style.removeProperty('background-image');
    html.style.removeProperty('background-size'); 
    html.style.removeProperty('background-position');
    html.style.removeProperty('background-repeat');
    html.style.removeProperty('background-attachment');
    document.body.style.removeProperty('background');
  };
}, [theme.palette.mode]);
```

This will give you a truly transparent preview area that shows the ESO background image in both light and dark modes.