Please fix the TextEditor preview container to show colored text formatting while keeping the ESO dark theme.

**Problem**: After forcing white text color (`#ffffff !important`), the ESO color formatting (like `|cFFFF00yellow text|r`) is no longer visible because the CSS is overriding all text colors to white.

**Current Issue**: 
- Background: ✅ Shows ESO background image correctly in both modes
- Text color: ❌ All text shows as white, colored formatting is invisible

**Solution Required**:

Replace the `PreviewArea` styled component with this version that preserves color formatting:

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
  color: '#ffffff', // Default white text (no !important)
  
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
  
  // Style for all spans but allow color overrides
  '& span': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)', // Strong shadow for readability
    position: 'relative',
    zIndex: 2,
    // Remove color override to allow ESO formatting colors to show
  },
  
  // Force transparency but don't override text colors
  '& *': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
    // Remove color: '#ffffff !important' to allow colored text
  },
  
  // Only style placeholder/italic text, not colored formatting
  '& span[style*="color: #888"], & span[style*="italic"]': {
    color: 'rgba(255, 255, 255, 0.7) !important',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9) !important',
  },
  
  // Ensure colored spans from ESO formatting are visible
  '& span[style*="color: #"]': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)', // Strong shadow for colored text readability
    fontWeight: '500', // Slightly bold for better visibility
  },
  
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
  },
}));
```

**Key Changes**:
1. **Removed `!important`** from default text color - allows ESO color formatting to override
2. **Removed color override** from `& *` selector - lets colored spans show their actual colors
3. **Added strong text shadow** (`rgba(0, 0, 0, 0.9)`) for colored text readability against background
4. **Added font-weight** to colored spans for better visibility
5. **Only force white color** on placeholder/italic text, not formatted text

**Result**: 
- ✅ ESO background image shows in both light/dark modes
- ✅ Default text is white for readability  
- ✅ ESO color formatting (yellow, green, red, etc.) displays correctly
- ✅ All text has strong shadows for readability against the background image

**Testing**: After applying this fix, colored text like `|cFFFF00This should be yellow|r` and `|c00FF00This should be green|r` should display in their proper colors while maintaining readability against the ESO background.