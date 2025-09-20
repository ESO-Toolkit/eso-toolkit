# Fix Preview Area - Remove Internal Background, Show Page Background Through

## Problem
The current preview area has its own background image with opacity, but you want TRUE TRANSPARENCY - the preview area should be a transparent window that shows the page background image through it.

## Solution
Replace the current `PreviewArea` with this version that removes the internal background and creates true transparency:

```typescript
const PreviewArea = styled(Box)(({ theme }) => ({
  marginTop: '20px',
  padding: '20px',
  borderRadius: '12px',
  minHeight: '120px',
  
  // CRITICAL: Make container completely transparent - no internal background image
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

  // REMOVE the ::before background image - we want to see THROUGH to page background
  // NO ::before pseudo-element with background image

  // REMOVE the ::after overlay - it blocks transparency  
  // NO ::after pseudo-element with overlay

  // Text styling for readability over the page background that shows through
  '& span': {
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.9)', // Strong shadow for readability
    position: 'relative',
    zIndex: 2,
    background: 'transparent !important',
  },

  // Force all child elements to be transparent
  '& *': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
  },

  // Placeholder text styling  
  '& span[style*="color: #888"], & span[style*="italic"]': {
    color: 'rgba(255, 255, 255, 0.7) !important',
    textShadow: '0 2px 4px rgba(0, 0, 0, 1) !important',
  },

  // ESO colored text
  '& span[style*="color: #"]': {
    textShadow: '0 2px 4px rgba(0, 0, 0, 1)', // Very strong shadow for colored text
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

## What This Does Differently

### ❌ **Removes Internal Background**
- No `::before` pseudo-element with background image
- No `::after` overlay that blocks transparency
- Container is completely transparent

### ✅ **Creates True Transparency**  
- Preview area becomes a transparent "window"
- Page background (set by your debug code) shows through
- No competing internal background layers

### ✅ **Strong Text Shadows**
- `textShadow: '0 2px 4px rgba(0, 0, 0, 0.9)'` for regular text
- `textShadow: '0 2px 4px rgba(0, 0, 0, 1)'` for colored text
- Ensures text is readable over any background

## Expected Result
- Preview area will be a transparent window
- The ESO page background (from html element) will show through
- Text will be white with strong shadows for readability
- No internal background image competing with transparency

This creates actual transparency instead of a semi-transparent background image overlay.