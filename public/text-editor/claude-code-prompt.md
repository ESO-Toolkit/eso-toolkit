Please fix the TextEditor preview container transparency issue in `src/components/TextEditor.tsx`.

**Problem**: The preview container shows the background image in dark mode but NOT in light mode. Both modes should look identical to replicate the in-game Elder Scrolls Online interface.

**Current Issue**: 
- Dark mode: ✅ Shows ESO background image with white text (correct)
- Light mode: ❌ Shows solid background blocking the image (wrong)

**Solution Required**:
Replace the `PreviewArea` styled component (around line 362) with this fixed version:

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
  color: '#ffffff !important',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    opacity: 1,
    zIndex: -1,
    pointerEvents: 'none',
  },
  
  '& span': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)',
    position: 'relative',
    zIndex: 2,
    color: '#ffffff !important',
  },
  
  '& *': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
    color: '#ffffff !important',
  },
  
  '& span[style*="color: #888"], & span[style*="italic"]': {
    color: 'rgba(255, 255, 255, 0.7) !important',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8) !important',
  },
  
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
  },
}));
```

**Key Changes**:
1. Force white text (`#ffffff !important`) for both modes
2. Force light border (`rgba(255, 255, 255, 0.2)`) for both modes  
3. Always transparent background to show ESO image
4. Add `::before` pseudo-element for background image in both modes
5. Remove any theme-dependent styling

**Result**: Both light and dark modes will show the ESO background image clearly with white text, matching the current dark mode appearance exactly.