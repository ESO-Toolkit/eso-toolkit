# Restore Original Preview Area Light Mode Opacity

## Problem
The mobile improvements changed the preview area `::after` overlay opacity from the original `rgba(255, 255, 255, 0.4)` to `rgba(255, 255, 255, 0.5)` and `rgba(255, 255, 255, 0.6)` on mobile, affecting the appearance.

## Solution - Restore Original Preview Area Styling

In `src/components/TextEditor.tsx`, update the `PreviewArea` component back to the original opacity values:

```typescript
const PreviewArea = styled(Box)(({ theme }) => ({
  marginTop: '20px',
  padding: '20px',
  borderRadius: '12px',
  minHeight: '120px',
  background: 'transparent !important',
  backgroundColor: 'transparent !important',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.2)'
      : '1px solid rgba(0, 0, 0, 0.1)',
  fontSize: '1rem',
  lineHeight: '1.6',
  position: 'relative',
  overflow: 'hidden',
  zIndex: 1,
  transition: 'all 0.15s ease-in-out',
  color: '#ffffff',

  // Background image - keep original settings
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${theme.palette.mode === 'dark' ? '/text-editor/text-editor-bg-dark.jpg' : '/text-editor/text-editor-bg-light.jpg'})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center', // Back to original center positioning
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed', // Back to original fixed
    opacity: 0.3, // Keep original 30% opacity
    zIndex: -1,
    pointerEvents: 'none',
  },

  // RESTORE ORIGINAL OVERLAY - this was changed
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // RESTORE ORIGINAL: 0.2 for dark, 0.4 for light
    background: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)',
    zIndex: -1,
    pointerEvents: 'none',
  },

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

  // Mobile styles - keep mobile layout improvements but restore original opacity
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
    borderRadius: '8px',
    margin: '16px 0',
    
    // Keep mobile background improvements but restore original overlay
    '&::before': {
      backgroundAttachment: 'scroll', // Keep scroll for mobile performance
      backgroundPosition: 'center', // Keep center positioning
    },
    
    // RESTORE ORIGINAL OVERLAY on mobile too
    '&::after': {
      background: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)',
    },
  },
}));
```

## Key Changes
- ✅ **Restored `::after` overlay opacity**: Back to original `rgba(255, 255, 255, 0.4)` for light mode
- ✅ **Keep mobile layout improvements**: Full-width, no margins, etc.
- ✅ **Keep mobile performance improvements**: `backgroundAttachment: 'scroll'` on mobile
- ✅ **Original preview area appearance**: Same as before mobile changes

## What Was Changed Back
- **Light mode overlay**: `rgba(255, 255, 255, 0.4)` (was changed to 0.5/0.6)
- **Dark mode overlay**: `rgba(0, 0, 0, 0.2)` (keep original)
- **Background positioning**: Back to `center` (was changed to `center 20%`)
- **Background attachment**: `fixed` on desktop, `scroll` on mobile only

This restores the original preview area color and opacity while keeping the mobile layout improvements!