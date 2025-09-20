# Fix Preview Area - Remove All Backgrounds for True Transparency

## Problem  
The current `PreviewArea` has its own background image (`::before`) and overlay (`::after`) pseudo-elements that prevent true transparency. You want the preview area to be a transparent window showing the page background through it.

## Solution
Replace the current `PreviewArea` styled component with this truly transparent version:

```typescript
const PreviewArea = styled(Box)(({ theme }) => ({
  marginTop: '20px',
  padding: '20px',
  borderRadius: '12px',
  minHeight: '120px',
  
  // CRITICAL: Make completely transparent - no internal backgrounds
  background: 'transparent !important',
  backgroundColor: 'transparent !important',
  
  // Border styling
  border: '1px solid rgba(255, 255, 255, 0.2)',
  fontSize: '1rem',
  lineHeight: '1.6',
  position: 'relative',
  overflow: 'hidden',
  zIndex: 1,
  transition: 'all 0.15s ease-in-out',
  color: '#ffffff',

  // NO ::before pseudo-element - we want transparency
  // NO ::after pseudo-element - we want transparency

  // Text styling for readability over page background
  '& span': {
    textShadow: '0 2px 4px rgba(0, 0, 0, 1)', // Very strong shadow for white text
    position: 'relative',
    zIndex: 2,
  },

  // Force all child elements transparent
  '& *': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
  },

  // Placeholder text styling
  '& span[style*="color: #888"], & span[style*="italic"]': {
    color: 'rgba(255, 255, 255, 0.7) !important',
    textShadow: '0 2px 4px rgba(0, 0, 0, 1) !important',
  },

  // ESO colored text with strong shadows
  '& span[style*="color: #"]': {
    textShadow: '0 2px 4px rgba(0, 0, 0, 1)',
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

## Key Changes

### ❌ **Removed Internal Backgrounds**
- **Removed** `::before` pseudo-element with background image
- **Removed** `::after` pseudo-element with overlay
- **No internal backgrounds** competing with transparency

### ✅ **True Transparency** 
- Container is completely transparent
- Acts as a "window" to see page background through
- No pseudo-elements blocking the view

### ✅ **Enhanced Text Readability**
- Very strong text shadows (`rgba(0, 0, 0, 1)`) 
- White text clearly visible over any background
- ESO color formatting preserved with shadows

## What This Achieves
- Preview area becomes a transparent container
- Page background (set by your debug useEffect on html element) shows through
- Text floats over the page background with strong shadows
- True transparency instead of layered semi-transparent backgrounds

## Expected Result
- ✅ Transparent preview area showing page background
- ✅ White text readable with strong shadows  
- ✅ ESO color formatting visible
- ✅ Calculator keeps its current semi-transparent styling
- ✅ Works in both light and dark modes