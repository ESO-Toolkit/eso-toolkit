# Fix TextEditor Preview Container Transparency Issue

## Problem Statement
The preview container in `src/components/TextEditor.tsx` is transparent in dark mode (showing background image through `::before` pseudo-element) but NOT transparent in light mode. This creates an inconsistent user experience where the background image is only visible in dark mode.

## Root Cause Analysis
The `PreviewArea` styled component uses Material-UI theme values that create solid backgrounds in light mode:
- `background: 'transparent !important'` - This is correct
- `border: theme.palette.divider` - This uses theme-specific colors
- `color: theme.palette.text.primary` - This uses theme-specific colors

However, the CSS files (`text-editor-page-background.css`) handle transparency using `::before` pseudo-elements and CSS variables, creating a mismatch between the component styling approach and the CSS approach.

## Solution Required

### 1. Update PreviewArea Styled Component
Replace the current `PreviewArea` styled component (around line 362) with this fixed version:

```typescript
const PreviewArea = styled(Box)(({ theme }) => ({
  marginTop: '20px',
  padding: '20px',
  borderRadius: '12px',
  minHeight: '120px',
  background: 'transparent !important', // Always transparent to show background image
  backgroundColor: 'transparent !important',
  border: `1px solid var(--border)`, // Use CSS variable instead of theme.palette.divider
  fontSize: '1rem',
  lineHeight: '1.6',
  position: 'relative',
  overflow: 'hidden',
  zIndex: 1,
  transition: 'all 0.15s ease-in-out',
  color: 'var(--text)', // Use CSS variable instead of theme.palette.text.primary
  
  // Ensure background image shows through using ::before for both modes
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
    opacity: 0.3, // Semi-transparent for text readability
    zIndex: -1,
    pointerEvents: 'none',
  },
  
  // Text shadow for better readability over background in both modes
  '& span': {
    textShadow: theme.palette.mode === 'dark' 
      ? '0 1px 2px rgba(0, 0, 0, 0.8)' 
      : '0 1px 2px rgba(255, 255, 255, 0.8)',
    position: 'relative',
    zIndex: 2,
  },
  
  // Force transparency for all child elements
  '& *': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
  },
  
  // Mobile styles
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
  },
}));
```

### 2. Import Required Background Image
Ensure the background image import is available for the `::before` pseudo-element:

```typescript
import backgroundImage from '../assets/text-editor/eso-ss-1.jpg';
```

This import should already exist at the top of the file around line 11.

## Key Changes Explained

1. **Consistent Transparency**: Use `background: transparent !important` for both light and dark modes
2. **CSS Variables**: Replace `theme.palette.divider` with `var(--border)` and `theme.palette.text.primary` with `var(--text)`
3. **Universal ::before**: Apply background image pseudo-element for both light and dark modes (not just dark mode)
4. **Text Readability**: Add theme-aware text shadows (`white` shadow for dark mode, `black` shadow for light mode)
5. **Child Element Transparency**: Force all nested elements to remain transparent
6. **Proper Layering**: Use z-index to ensure content appears above background image

## Files to Modify

### Primary File
- `src/components/TextEditor.tsx` - Update the `PreviewArea` styled component

### Supporting Files (already configured)
- `src/styles/text-editor-page-background.css` - Contains background image CSS
- `src/styles/texteditor-theme-bridge.css` - Maps Material-UI theme to CSS variables
- `src/assets/text-editor/eso-ss-1.jpg` - Background image asset

## Expected Result
After applying this fix:
- ✅ Preview container will be transparent in both light and dark modes
- ✅ Background image will be visible through the preview container in both modes
- ✅ Text will remain readable with appropriate shadows in both modes
- ✅ Consistent visual experience across theme switches

## Testing
Test the fix by:
1. Loading the text editor page
2. Switching between light and dark modes
3. Verifying the preview container shows the background image in both modes
4. Confirming text remains readable in both modes