# Fix TextEditor Preview Container - Match In-Game Dark Theme View

## Additional Context & Requirements
The TextEditor preview container should replicate the **in-game Elder Scrolls Online interface**, which uses a dark theme aesthetic. Both light and dark mode preview areas should look identical to the current dark mode appearance to accurately represent how the formatted text will appear in-game.

## Updated Problem Statement
The preview container in `src/components/TextEditor.tsx` currently:
- ✅ Dark mode: Shows background image with dark overlay - **this is correct**
- ❌ Light mode: Shows background image with light styling - **this should match dark mode**

**Goal**: Make both light and dark mode preview areas look identical to the current dark mode version since ESO uses a dark interface.

## Enhanced Solution

### Updated PreviewArea Styled Component
Replace the current `PreviewArea` styled component (around line 362) with this version that forces dark theme appearance in both modes:

```typescript
const PreviewArea = styled(Box)(({ theme }) => ({
  marginTop: '20px',
  padding: '20px',
  borderRadius: '12px',
  minHeight: '120px',
  background: 'transparent !important', // Always transparent to show background image
  backgroundColor: 'transparent !important',
  border: `1px solid rgba(255, 255, 255, 0.2)`, // Always use dark mode border (white with opacity)
  fontSize: '1rem',
  lineHeight: '1.6',
  position: 'relative',
  overflow: 'hidden',
  zIndex: 1,
  transition: 'all 0.15s ease-in-out',
  color: '#ffffff', // Always use white text to match in-game ESO interface
  
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
  
  // Add dark overlay for consistent in-game look in both modes
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)', // Dark overlay to match ESO interface
    zIndex: -1,
    pointerEvents: 'none',
  },
  
  // Text shadow for better readability - always dark shadow since we use white text
  '& span': {
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)', // Strong dark shadow for white text readability
    position: 'relative',
    zIndex: 2,
    color: 'inherit', // Inherit the white color from parent
  },
  
  // Force transparency for all child elements but maintain text color
  '& *': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
  },
  
  // Placeholder text styling (when no content)
  '& span[style*="color: #888"]': {
    color: 'rgba(255, 255, 255, 0.6) !important', // Light gray on dark for placeholder
    fontStyle: 'italic',
  },
  
  // Mobile styles
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
  },
}));
```

## Key Changes for In-Game Replication

### 1. Consistent Dark Theme Colors
- **Border**: Always use `rgba(255, 255, 255, 0.2)` (white with opacity) instead of CSS variables
- **Text Color**: Always use `#ffffff` (pure white) instead of CSS variables
- **Background**: Always transparent with dark overlay

### 2. Dark Overlay Layer
- Added `::after` pseudo-element with `rgba(0, 0, 0, 0.6)` overlay
- This creates the dark ESO interface look in both light and dark modes
- Positioned between background image and text content

### 3. Consistent Text Styling  
- **Text Shadow**: Always use dark shadow (`rgba(0, 0, 0, 0.9)`) since text is always white
- **Placeholder Text**: Custom styling for empty state to show light gray on dark background
- **Color Inheritance**: Ensure all text elements inherit the white color

### 4. Layer Order (z-index)
1. **Text content** (z-index: 2) - White text with dark shadow
2. **Dark overlay** (z-index: -1) - `::after` element for ESO look  
3. **Background image** (z-index: -1) - `::before` element with game screenshot

## Visual Result
After applying this fix, both light and dark mode preview areas will:
- ✅ Show the background image (ESO screenshot)
- ✅ Have a dark overlay matching ESO's interface
- ✅ Display white text with dark shadows for readability
- ✅ Use white borders with opacity for authenticity
- ✅ Look identical regardless of the site's theme mode

## Why This Approach
- **Authenticity**: Matches actual Elder Scrolls Online in-game text appearance
- **Consistency**: Users see exactly how their formatted text will look in-game
- **Usability**: No confusion between light/dark mode - always shows game-accurate preview
- **Immersion**: Maintains the fantasy game aesthetic regardless of site theme

## Testing Checklist
- [ ] Preview looks identical in both light and dark mode
- [ ] White text is clearly readable against dark overlay
- [ ] Background image is visible but not distracting
- [ ] Border matches ESO interface styling
- [ ] Placeholder text is appropriately styled
- [ ] Mobile responsive styling works correctly