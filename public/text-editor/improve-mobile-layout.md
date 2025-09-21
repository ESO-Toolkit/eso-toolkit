# Improve Mobile Text Editor Layout and Background Images

## Problem
- Background images don't look good on mobile, especially in light mode
- Text editor component has padding/spacing that should be removed for full-width mobile experience

## Solution

### 1. Remove Container Padding for Full-Width Mobile

In `src/components/TextEditor.tsx`, update the `TextEditorContainer` and `EditorTool`:

```typescript
const TextEditorContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: 'transparent',
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  position: 'relative',
  
  // Remove padding on mobile for full-width
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
  
  // Mobile styles - full width, no margins/borders
  [theme.breakpoints.down('sm')]: {
    display: 'grid',
    gridTemplateRows: 'auto auto',
    gap: '16px',
    margin: '0', // Remove all margins
    padding: '16px', // Reduce padding
    borderRadius: '0', // Remove border radius for full-width
    border: 'none', // Remove border
    backdropFilter: 'blur(8px) saturate(160%)',
    background: 'var(--panel)',
    minHeight: '100vh', // Full height on mobile
    maxWidth: '100%', // Full width
  },
}));
```

### 2. Remove Container Component Margins on Mobile

Update the Container usage in the JSX:

```typescript
return (
  <TextEditorContainer>
    <Container 
      maxWidth="lg"
      sx={{
        // Remove container padding on mobile
        [theme => theme.breakpoints.down('sm')]: {
          padding: '0 !important',
          margin: '0 !important',
          maxWidth: '100% !important',
        },
      }}
    >
      <EditorTool>
        {/* ... rest of component ... */}
      </EditorTool>
    </Container>
  </TextEditorContainer>
);
```

### 3. Improve Background Images for Mobile

Add mobile-specific background image adjustments in `src/styles/text-editor-page-background.css`:

```css
/* Improve mobile background positioning */
@media (max-width: 768px) {
  body.text-editor-page {
    background-attachment: scroll !important; /* Fixed backgrounds can cause issues on mobile */
    background-position: center top !important; /* Better positioning for mobile */
    background-size: cover !important;
  }
  
  body.text-editor-page::before {
    background-attachment: scroll !important;
    background-position: center top !important;
    background-size: cover !important;
  }
  
  /* Light mode specific mobile adjustments */
  body.text-editor-page:not(.dark-mode) {
    background-position: center 20% !important; /* Adjust for better light mode visibility */
  }
  
  body.text-editor-page:not(.dark-mode)::before {
    background-position: center 20% !important;
  }
}

/* Enhance mobile text readability */
@media (max-width: 768px) {
  body.text-editor-page:not(.dark-mode) {
    /* Add subtle overlay for better text readability on mobile light mode */
    position: relative;
  }
  
  body.text-editor-page:not(.dark-mode)::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.1); /* Very light overlay for text readability */
    z-index: -1;
    pointer-events: none;
  }
}
```

### 4. Adjust PreviewArea for Better Mobile Background

Update the `PreviewArea` component for better mobile background display:

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

  // Background image with mobile optimizations
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${theme.palette.mode === 'dark' ? '/text-editor/text-editor-bg-dark.jpg' : '/text-editor/text-editor-bg-light.jpg'})`,
    backgroundSize: 'cover',
    backgroundPosition: theme.palette.mode === 'dark' ? 'center' : 'center 20%', // Better positioning for light mode
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'scroll', // Use scroll instead of fixed for better mobile performance
    opacity: 0.3,
    zIndex: -1,
    pointerEvents: 'none',
  },

  // Enhanced overlay for mobile readability
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)', // Stronger overlay for light mode
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

  // Mobile specific adjustments
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
    borderRadius: '8px',
    margin: '16px 0',
    
    // Adjust background position for mobile
    '&::before': {
      backgroundPosition: theme.palette.mode === 'dark' ? 'center' : 'center 30%',
      backgroundAttachment: 'scroll',
    },
    
    // Stronger overlay for mobile light mode
    '&::after': {
      background: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.6)',
    },
  },
}));
```

## Expected Results
- ✅ Full-width text editor on mobile with no edge spacing
- ✅ Better background image positioning for mobile devices
- ✅ Improved text readability on mobile, especially in light mode
- ✅ No borders/border-radius on mobile for seamless full-width experience
- ✅ Better performance with scroll instead of fixed backgrounds on mobile