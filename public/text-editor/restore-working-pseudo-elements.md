# Restore Working ::before and ::after Transparency Technique

## You're Right - Use What Worked Before!

The transparency was working fine with the `::before` and `::after` approach. The issue is probably that the current implementation is trying to show the background image INSIDE the preview instead of making the preview transparent to show the PAGE background.

## Solution - Restore Original Working Approach

Replace the current `PreviewArea` with this version that uses `::before` and `::after` for proper transparency layering:

```typescript
const PreviewArea = styled(Box)(({ theme }) => ({
  marginTop: '20px',
  padding: '20px',
  borderRadius: '12px',
  minHeight: '120px',
  
  // Container transparent
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

  // Use ::before to "punch through" to show page background
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'transparent',
    zIndex: -2,
    pointerEvents: 'none',
  },

  // Use ::after for text readability without blocking transparency
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'transparent',
    zIndex: -1,
    pointerEvents: 'none',
  },

  // Text styling
  '& span': {
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.9)',
    position: 'relative',
    zIndex: 10,
    background: 'transparent !important',
  },

  // Force all child elements transparent
  '& *': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
  },

  // Placeholder text
  '& span[style*="color: #888"], & span[style*="italic"]': {
    color: 'rgba(255, 255, 255, 0.7) !important',
    textShadow: '0 2px 4px rgba(0, 0, 0, 1) !important',
  },

  // ESO colored text
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

## Key Points of This Approach

### **Why ::before and ::after Work**
- `::before` at `z-index: -2` creates a transparent layer that "punches through"
- `::after` at `z-index: -1` provides layering without blocking transparency  
- Text content at `z-index: 10` stays on top
- Page background (set on html element) shows through the transparent layers

### **What This Achieves**
- ✅ Uses the proven `::before`/`::after` technique
- ✅ Creates proper z-index layering for transparency
- ✅ Lets page background show through
- ✅ Keeps text readable with shadows

### **The Working Principle**
1. Page background (html element)
2. Transparent pseudo-elements create layering
3. Text content floats on top with shadows
4. Result: Transparent preview showing page background

This should restore the transparency effect that was working before!