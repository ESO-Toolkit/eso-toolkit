# Restore Working Preview Area - Simple Revert

## Problem
The debug code broke the preview area and now there's no background image showing. We need to revert to the exact working version.

## Solution - Complete Revert to Known Working State

### Step 1: Remove Any Debug Code
Remove any debug useEffect or style injection code you added.

### Step 2: Use Exact Working PreviewArea from PR #344
Replace the entire `PreviewArea` styled component with this exact working version:

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

  // Add background image to show through transparent preview area
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${theme.palette.mode === 'dark' ? '/text-editor/text-editor-bg-dark.jpg' : '/text-editor/text-editor-bg-light.jpg'})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    opacity: 0.3,
    zIndex: -1,
    pointerEvents: 'none',
  },

  // Add semi-transparent overlay for better text readability in light mode
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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

  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
  },
}));
```

### Step 3: Clean Up Any Injected Styles
Add this useEffect to clean up any style elements that might be interfering:

```typescript
// Clean up any injected styles
useEffect(() => {
  // Remove any debug style elements
  const debugStyles = document.querySelectorAll('#preview-area-override, [id*="preview"], [id*="debug"]');
  debugStyles.forEach(element => element.remove());
  
  // Remove any inline styles that might be interfering
  const previewElement = document.getElementById('eso-preview');
  if (previewElement) {
    previewElement.removeAttribute('style');
  }
}, []);
```

### Step 4: Keep Mobile Layout Improvements (Optional)
If you want to keep the mobile full-width layout, keep these changes to the container components but ONLY change the layout, not the preview area:

```typescript
const TextEditorContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: 'transparent',
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  position: 'relative',
  
  // Mobile full-width
  [theme.breakpoints.down('sm')]: {
    paddingTop: 0,
    paddingBottom: 0,
  },
}));

const EditorTool = styled(Box)(({ theme }) => ({
  maxWidth: 900,
  margin: '2rem auto 2rem auto',
  background: 'var(--panel)',
  padding: '24px',
  borderRadius: '14px',
  border: '1px solid var(--border)',
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: 'var(--text)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 30px rgba(0, 0, 0, 0.6)'
      : '0 8px 30px rgba(0, 0, 0, 0.15)',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  position: 'relative',
  zIndex: 1,
  
  // Mobile full-width
  [theme.breakpoints.down('sm')]: {
    display: 'grid',
    gridTemplateRows: 'auto auto',
    gap: '16px',
    margin: '0',
    padding: '16px',
    borderRadius: '0',
    border: 'none',
    backdropFilter: 'blur(8px) saturate(160%)',
    background: 'var(--panel)',
    minHeight: '100vh',
    maxWidth: '100%',
  },
}));
```

## Expected Result
- ✅ Preview area should show background image again
- ✅ Original opacity values restored (0.3 for image, 0.4 for light mode overlay)
- ✅ Mobile layout improvements maintained (if you choose Step 4)
- ✅ No more broken styling

This should get your preview area working again with the original appearance!