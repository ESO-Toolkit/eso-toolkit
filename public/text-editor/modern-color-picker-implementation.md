# Modern Color Picker Implementation - Claude Code Instructions

## Project Overview
Replace the existing color picker implementation in `src/components/TextEditor.tsx` with a modern, accessible, mobile-friendly solution using React-Colorful and Material UI's Popper component.

## Current Repository Context
- **Repository**: bkrupa/eso-log-aggregator
- **Target File**: `src/components/TextEditor.tsx`
- **Current Implementation**: Has issues with Pickr-based color picker (canvas rendering, positioning, accessibility)
- **Theme System**: Uses Material UI with custom light/dark theme integration
- **Text Format**: ESO/WoW color format `|cFFFF00text|r` where `FFFF00` is hex color

## Requirements

### Core Functionality
1. **Hex-only color picker** using React-Colorful's `HexColorPicker`
2. **Apply/Cancel workflow** - preview colors before committing
3. **Live preview** in the preview area while selecting colors
4. **Manual hex input** field for precise color entry
5. **Text selection preservation** - maintain selected text during color picking
6. **ESO color format** - apply colors in `|cHEXCOLORtext|r` format

### User Experience Requirements
1. **Modern popover design** - anchored to emoji button, not draggable modal
2. **Smart positioning** - viewport-aware, never off-screen
3. **Mobile-first responsive** - touch-friendly on all devices
4. **Keyboard accessible** - full keyboard navigation and screen reader support
5. **Theme integration** - seamless light/dark mode adaptation
6. **Visual feedback** - clear indication of selected text during color picking

### Technical Requirements
1. **Small bundle size** - use React-Colorful (2.8KB) instead of heavier alternatives
2. **No canvas issues** - avoid Pickr's canvas rendering problems
3. **TypeScript support** - full type safety
4. **Material UI integration** - use Popper, ClickAwayListener, and theme system
5. **Accessibility compliance** - ARIA roles, keyboard navigation, focus management

## Implementation Instructions

### Step 1: Package Management
```bash
# Install React-Colorful
npm install react-colorful
npm install --save-dev @types/react-colorful

# Remove problematic packages (if they exist)
npm uninstall @simonwep/pickr react-color @types/react-color
```

### Step 2: Import Requirements
Add these imports to `TextEditor.tsx`:
```typescript
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { 
  Popper, 
  ClickAwayListener, 
  Fade,
  IconButton,
  Divider
} from '@mui/material';
```

### Step 3: State Management
Replace existing color picker state with:
```typescript
// Color picker state
const [showColorPicker, setShowColorPicker] = useState(false);
const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
const [previewColor, setPreviewColor] = useState('#FFFFFF');
const [isPreviewMode, setIsPreviewMode] = useState(false);

// Selection state
const [selectedTextInfo, setSelectedTextInfo] = useState<{
  start: number;
  end: number;
  text: string;
  originalText: string;
} | null>(null);

// Refs
const colorPickerButtonRef = useRef<HTMLButtonElement>(null);
```

### Step 4: Core Functions

#### Selection Management
```typescript
// Capture and validate text selection
const captureTextSelection = useCallback((): boolean => {
  if (!textAreaRef.current) return false;
  
  const textarea = textAreaRef.current;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  
  if (selectedText.length === 0) {
    alert('Please select some text first!');
    return false;
  }
  
  setSelectedTextInfo({
    start,
    end,
    text: selectedText,
    originalText: textarea.value
  });
  
  return true;
}, []);

// Restore text selection with visual feedback
const restoreTextSelection = useCallback((start: number, end: number) => {
  if (!textAreaRef.current) return;
  
  const textarea = textAreaRef.current;
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start, end);
    
    // Brief visual confirmation
    textarea.style.outline = '2px solid #3b82f6';
    textarea.style.outlineOffset = '2px';
    
    setTimeout(() => {
      textarea.style.outline = '';
      textarea.style.outlineOffset = '';
    }, 300);
  }, 50);
}, []);
```

#### Color Application Logic
```typescript
// Apply color to selected text
const applySelectedColor = useCallback(() => {
  if (!textAreaRef.current || !selectedTextInfo) return;
  
  const { start, end, text: selectedText } = selectedTextInfo;
  const beforeText = selectedTextInfo.originalText.substring(0, start);
  const afterText = selectedTextInfo.originalText.substring(end);
  
  // Remove existing color formatting if present
  const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
  const match = selectedText.match(colorFormatRegex);
  const cleanText = match ? match[1] : selectedText;
  
  // Apply new color in ESO format
  const hexColor = previewColor.replace('#', '').toUpperCase();
  const coloredText = `|c${hexColor}${cleanText}|r`;
  const newText = beforeText + coloredText + afterText;
  
  // Update textarea and state
  const textarea = textAreaRef.current;
  textarea.value = newText;
  setText(newText);
  debouncedSaveHistory(newText);
  
  // Close picker and restore selection
  closeColorPicker();
  
  // Restore selection to newly colored text
  setTimeout(() => {
    const newStart = start;
    const newEnd = newStart + coloredText.length;
    restoreTextSelection(newStart, newEnd);
  }, 50);
  
  console.log('✅ Color applied:', hexColor);
}, [selectedTextInfo, previewColor, debouncedSaveHistory, restoreTextSelection]);

// Cancel color selection
const cancelColorSelection = useCallback(() => {
  if (selectedTextInfo && textAreaRef.current) {
    // Restore original text and selection
    const { originalText, start, end } = selectedTextInfo;
    textAreaRef.current.value = originalText;
    setText(originalText);
    
    setTimeout(() => {
      restoreTextSelection(start, end);
    }, 50);
  }
  
  closeColorPicker();
  console.log('❌ Color selection cancelled');
}, [selectedTextInfo, restoreTextSelection]);
```

#### Picker Management
```typescript
// Open color picker
const openColorPicker = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
  if (!captureTextSelection()) return;
  
  setColorPickerAnchor(event.currentTarget);
  setPreviewColor('#FFFFFF');
  setIsPreviewMode(true);
  setShowColorPicker(true);
  
  console.log('🎨 Modern color picker opened');
}, [captureTextSelection]);

// Close color picker
const closeColorPicker = useCallback(() => {
  setShowColorPicker(false);
  setColorPickerAnchor(null);
  setSelectedTextInfo(null);
  setPreviewColor('#FFFFFF');
  setIsPreviewMode(false);
}, []);

// Handle preview color changes for live preview
const handlePreviewColorChange = useCallback((color: string) => {
  setPreviewColor(color);
  // Optional: Update live preview in preview area here
}, []);
```

### Step 5: Live Preview Integration
Update the `renderPreview` function to show live color changes:
```typescript
const renderPreview = (): JSX.Element => {
  // Use preview text if in preview mode, otherwise use actual text
  let displayText = text;
  
  if (isPreviewMode && selectedTextInfo && previewColor !== '#FFFFFF') {
    const { start, end, originalText } = selectedTextInfo;
    const beforeText = originalText.substring(0, start);
    const afterText = originalText.substring(end);
    const selectedText = originalText.substring(start, end);
    
    // Remove existing formatting and apply preview color
    const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
    const match = selectedText.match(colorFormatRegex);
    const cleanText = match ? match[1] : selectedText;
    const hexColor = previewColor.replace('#', '').toUpperCase();
    const previewColoredText = `|c${hexColor}${cleanText}|r`;
    
    displayText = beforeText + previewColoredText + afterText;
  }
  
  if (!displayText.trim()) {
    return (
      <span style={{ color: '#888', fontStyle: 'italic' }}>
        Your formatted text will appear here...
      </span>
    );
  }

  const previewText = displayText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\|c([0-9A-Fa-f]{6})(.*?)\|r/g, '<span style="color: #$1">$2</span>')
    .replace(/\n/g, '<br>');

  return <span dangerouslySetInnerHTML={{ __html: previewText }} />;
};
```

### Step 6: Modern Color Picker UI Component
Add this JSX structure for the color picker:
```typescript
{/* Modern Color Picker Popover */}
<Popper
  open={showColorPicker}
  anchorEl={colorPickerAnchor}
  placement="bottom-start"
  transition
  disablePortal={false}
  modifiers={[
    {
      name: 'flip',
      enabled: true,
      options: {
        fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
      },
    },
    {
      name: 'preventOverflow',
      enabled: true,
      options: {
        boundary: 'viewport',
        padding: 8,
      },
    },
  ]}
  sx={{ zIndex: theme.zIndex.tooltip + 100 }}
>
  {({ TransitionProps }) => (
    <Fade {...TransitionProps} timeout={200}>
      <ClickAwayListener onClickAway={cancelColorSelection}>
        <Box
          sx={{
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.6)'
              : '0 8px 32px rgba(0, 0, 0, 0.2)',
            width: 280,
            overflow: 'hidden',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="color-picker-title"
        >
          {/* Header */}
          <Box sx={{ 
            p: 2, 
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography 
              id="color-picker-title"
              variant="subtitle1" 
              sx={{ fontWeight: 600 }}
            >
              Choose Text Color
            </Typography>
            <IconButton
              size="small"
              onClick={cancelColorSelection}
              aria-label="Close color picker"
              sx={{ 
                opacity: 0.7,
                '&:hover': { opacity: 1 }
              }}
            >
              ✕
            </IconButton>
          </Box>

          {/* Selected Text Preview */}
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.text.secondary,
                bgcolor: theme.palette.background.default,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                display: 'inline-block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              "{selectedTextInfo?.text.substring(0, 30)}{selectedTextInfo?.text.length > 30 ? '...' : ''}"
            </Typography>
          </Box>

          <Divider />

          {/* Color Picker */}
          <Box sx={{ 
            p: 2,
            '& .react-colorful': {
              width: '100% !important',
              height: '180px !important',
            },
            '& .react-colorful__saturation': {
              borderRadius: '6px 6px 0 0 !important',
            },
            '& .react-colorful__hue': {
              height: '20px !important',
              borderRadius: '0 0 6px 6px !important',
            },
            '& .react-colorful__pointer': {
              width: '16px !important',
              height: '16px !important',
              border: '2px solid white !important',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3) !important',
            },
          }}>
            <HexColorPicker
              color={previewColor}
              onChange={handlePreviewColorChange}
            />
          </Box>

          {/* Hex Input */}
          <Box sx={{ px: 2, pb: 2 }}>
            <HexColorInput
              color={previewColor}
              onChange={handlePreviewColorChange}
              prefixed
              placeholder="Enter hex color"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                fontFamily: 'monospace',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '6px',
                backgroundColor: theme.palette.background.default,
                color: theme.palette.text.primary,
                outline: 'none',
              }}
              aria-label="Hex color input"
            />
          </Box>

          <Divider />

          {/* Action Buttons */}
          <Box sx={{ 
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.02)' 
              : 'rgba(0, 0, 0, 0.02)'
          }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.text.secondary,
                fontFamily: 'monospace',
                fontSize: '0.75rem'
              }}
            >
              Preview: {previewColor.toUpperCase()}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={cancelColorSelection}
                sx={{ minWidth: 70 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={applySelectedColor}
                sx={{ minWidth: 70 }}
              >
                Apply
              </Button>
            </Box>
          </Box>
        </Box>
      </ClickAwayListener>
    </Fade>
  )}
</Popper>
```

### Step 7: Update Emoji Button
Replace existing emoji button onClick handlers:
```typescript
{/* Desktop Emoji Button */}
<EmojiButton
  ref={colorPickerButtonRef}
  type="button"
  onClick={openColorPicker}
  aria-label="Choose text color"
  sx={{
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
    }
  }}
>
  🎨
</EmojiButton>

{/* Mobile Emoji Button */}
<EmojiButton
  type="button"
  onClick={openColorPicker}
  aria-label="Choose text color"
  sx={{
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
    }
  }}
>
  🎨
</EmojiButton>
```

### Step 8: Keyboard Support
Add keyboard event handling:
```typescript
// Add to existing handleKeyDown function
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'z':
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
        break;
      case 'y':
        e.preventDefault();
        redo();
        break;
      // Add color picker shortcut
      case 'k':
        e.preventDefault();
        if (colorPickerButtonRef.current) {
          colorPickerButtonRef.current.click();
        }
        break;
      default:
        break;
    }
  }
  
  // Close color picker on Escape
  if (e.key === 'Escape' && showColorPicker) {
    cancelColorSelection();
  }
};
```

### Step 9: Update Quick Color Functions
Update existing preset color functions:
```typescript
const applyQuickColor = (colorHex: string): void => {
  if (!captureTextSelection()) return;
  
  setPreviewColor(`#${colorHex}`);
  
  // Apply immediately for quick colors
  setTimeout(() => {
    applySelectedColor();
  }, 50);
};
```

## Accessibility Requirements

### ARIA Implementation
- Use `role="dialog"` and `aria-modal="true"` on color picker
- Include `aria-labelledby` pointing to picker title
- Ensure all interactive elements have `aria-label` attributes
- Support keyboard navigation with Tab and Enter/Space
- Close picker on Escape key

### Focus Management  
- Return focus to emoji button after picker closes
- Maintain logical tab order within picker
- Provide clear visual focus indicators

### Screen Reader Support
- Announce color values as they change
- Provide context about selected text being colored
- Clear instructions for keyboard users

## Mobile Optimizations

### Touch-Friendly Design
- Minimum 44px touch targets for all interactive elements
- Smooth touch interactions on color picker canvas
- Responsive layout that works on small screens

### Viewport Handling
- Use Popper's `preventOverflow` modifier to keep picker on screen
- Responsive sizing that adapts to screen width
- Prevent picker from being cut off on mobile keyboards

## Testing Checklist

### Functionality Testing
- [ ] Text selection and color application works correctly
- [ ] Live preview updates in preview area
- [ ] Apply/Cancel buttons work as expected  
- [ ] Undo/redo integration works with color changes
- [ ] Quick color preset buttons work

### Accessibility Testing
- [ ] Full keyboard navigation works
- [ ] Screen reader announces changes correctly
- [ ] Focus management works properly
- [ ] ARIA attributes are correct

### Responsive Testing
- [ ] Works correctly on mobile devices
- [ ] Picker positions correctly on all screen sizes
- [ ] Touch interactions work smoothly
- [ ] Text remains readable at all sizes

### Browser Testing
- [ ] Works in Chrome, Firefox, Safari, Edge
- [ ] No console errors
- [ ] Performance is smooth
- [ ] Theme switching works correctly

## Success Criteria

The implementation is successful when:
1. ✅ Modern, accessible color picker replaces existing implementation
2. ✅ Works flawlessly on mobile and desktop
3. ✅ Integrates seamlessly with Material UI theme
4. ✅ Provides excellent user experience with apply/cancel workflow
5. ✅ Maintains text selection and provides visual feedback
6. ✅ Supports keyboard navigation and screen readers
7. ✅ Bundle size is minimal (React-Colorful is only 2.8KB)
8. ✅ No canvas rendering or positioning issues
9. ✅ Live preview works in preview area
10. ✅ ESO color format is applied correctly

## Additional Notes

- Remove all existing Pickr-related code and CSS files
- Ensure TypeScript types are properly imported
- Test thoroughly on mobile devices
- Consider adding color history/favorites feature in future iteration
- Document keyboard shortcuts for users (Ctrl+K to open picker)

This implementation prioritizes modern UX patterns, accessibility, and mobile-first design while maintaining the ESO-themed aesthetic and functionality.