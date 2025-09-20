Please fix the TextEditor background image loading issue in light mode.

**Problem**: The ESO background image only shows in light mode AFTER first switching to dark mode. If you load the page directly in light mode, the background image is invisible.

**Root Cause**: This is likely a CSS variable initialization or background image loading order issue. The background image path or CSS variables aren't being properly set when the page loads directly in light mode.

**Debugging Steps**:
1. Check if `backgroundImage` import is resolving correctly in light mode
2. Verify CSS variables are being set properly on initial light mode load
3. Ensure the `::before` pseudo-element is being created in light mode

**Solution Required**:

Replace the `PreviewArea` styled component with this version that ensures background image loads in both modes:

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
  
  // Force background image with fallback paths
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Try multiple background image paths as fallbacks
    backgroundImage: [
      `url(${backgroundImage})`,
      `url('/images/eso-ss-1.jpg')`,
      `url('/src/assets/text-editor/eso-ss-1.jpg')`,
      `url('./assets/text-editor/eso-ss-1.jpg')`
    ].join(', '),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    opacity: 1,
    zIndex: -1,
    pointerEvents: 'none',
    // Force the pseudo-element to exist
    display: 'block',
    width: '100%',
    height: '100%',
  },
  
  // Alternative: Also set background on the container itself as fallback
  backgroundImage: `url(${backgroundImage})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed',
  
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

**Alternative Solution - Force CSS Class**:

If the above doesn't work, try this approach that forces a CSS class:

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
  
  // Force the element to always behave like dark mode for background
  '&': {
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
    }
  },
  
  // Rest of styles...
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

**Additional Check**:
Also verify that the `backgroundImage` import at the top of the file is correct:
```typescript
import backgroundImage from '../assets/text-editor/eso-ss-1.jpg';
```

**What This Should Fix**:
- ✅ Background image loads immediately in light mode
- ✅ No need to switch to dark mode first
- ✅ Consistent behavior on page refresh
- ✅ Multiple fallback paths for image loading
- ✅ Fallback background on container itself

**Testing**:
1. Load page directly in light mode - should see background immediately
2. Refresh page in light mode - should still see background
3. Switch between modes - should work in both directions