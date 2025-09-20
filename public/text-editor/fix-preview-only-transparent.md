# Fix Preview Area Transparency - Keep Calculator Styling

## Problem
The preview area needs to be transparent to show the ESO background, but the rest of the calculator (toolbar, text input, etc.) should keep their current semi-transparent styling. The ::before and ::after pseudo-elements are needed for proper layering since z-index isn't working.

## Solution
Replace the current `PreviewArea` styled component with this version that uses pseudo-elements correctly for transparency while keeping other elements unchanged:

```typescript
const PreviewArea = styled(Box)(({ theme }) => ({
  marginTop: '20px',
  padding: '20px',
  borderRadius: '12px',
  minHeight: '120px',
  
  // Make the container itself have no background
  background: 'transparent !important',
  backgroundColor: 'transparent !important',
  
  // Styling
  border: '1px solid rgba(255, 255, 255, 0.2)',
  fontSize: '1rem',
  lineHeight: '1.6',
  position: 'relative',
  overflow: 'hidden',
  zIndex: 1,
  transition: 'all 0.15s ease-in-out',
  color: '#ffffff',

  // Use ::before to punch a hole for transparency
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
    zIndex: -2,
    pointerEvents: 'none',
  },

  // Use ::after as the content layer (transparent but above background)
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
    zIndex: -1,
    pointerEvents: 'none',
  },

  // Text styling for readability over ESO background
  '& span': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
    position: 'relative',
    zIndex: 10,
    background: 'transparent !important',
  },

  // Force all child elements transparent
  '& *': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
  },

  // Placeholder text styling
  '& span[style*="color: #888"], & span[style*="italic"]': {
    color: 'rgba(255, 255, 255, 0.7) !important',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9) !important',
  },

  // ESO colored text
  '& span[style*="color: #"]': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
    fontWeight: '500',
  },

  // Mobile styles
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
  },
}));
```

## Key Points

### What This Does
- ✅ **Preview area only**: Makes ONLY the preview transparent to show ESO background
- ✅ **Keep other elements**: Toolbar, text input, status bar keep their current styling
- ✅ **Uses pseudo-elements**: Maintains the ::before/::after approach for proper layering
- ✅ **Forces transparency**: Multiple layers of transparency enforcement

### What This Doesn't Change
- ❌ **Don't touch**: EditorTool container styling
- ❌ **Don't touch**: Toolbar styling  
- ❌ **Don't touch**: TextInput styling
- ❌ **Don't touch**: StatusBar styling

### The Layering Strategy
1. **Page background**: ESO image (html/body level)
2. **Calculator container**: Semi-transparent panel (current styling)
3. **Preview area**: Completely transparent window
4. **Text content**: White with shadows (z-index: 10)

## Expected Result
- Calculator maintains its current semi-transparent appearance
- Only the preview area becomes transparent
- ESO background shows through preview area
- Text remains readable with strong shadows
- Works in both light and dark modes