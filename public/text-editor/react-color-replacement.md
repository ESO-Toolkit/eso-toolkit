# Replace Pickr with React Color - Sketch Color Picker

## Complete Replacement Guide

Let's completely remove Pickr and replace it with React Color's Sketch component, which is much more reliable and React-friendly.

## Step 1: Install React Color

```bash
npm install react-color
npm install --save-dev @types/react-color
```

## Step 2: Remove Pickr Dependencies

**Remove these imports from TextEditor.tsx:**
```typescript
// DELETE these lines:
import '../styles/pickr-theme.css';
import '../styles/pickr-radius.css';
import '../styles/pickr-background.css';
import '@simonwep/pickr/dist/themes/classic.min.css'; // if you added this

// DELETE these types and interfaces:
interface PickrColor { ... }
interface PickrInstance { ... }
interface PickrOptions { ... }

declare global {
  interface Window {
    Pickr: unknown;
  }
}
```

## Step 3: Add React Color Import

**Add this import at the top of TextEditor.tsx:**
```typescript
import { SketchPicker, ColorResult } from 'react-color';
```

## Step 4: Replace Color Picker State

**Replace the Pickr-related state with:**
```typescript
// REMOVE these states:
// const pickrRef = useRef<PickrInstance | null>(null);
// const pickrAnchorRef = useRef<HTMLDivElement>(null);
// const [savedSelection, setSavedSelection] = useState<...>(...);
// const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

// ADD this simple state:
const [showColorPicker, setShowColorPicker] = useState(false);
const [selectedTextInfo, setSelectedTextInfo] = useState<{
  start: number;
  end: number;
  text: string;
} | null>(null);
const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
```

## Step 5: Create Simple Color Application Function

**Replace all the complex color logic with:**
```typescript
// Simple color application function
const applySelectedColor = useCallback((color: string): void => {
  if (!textAreaRef.current || !selectedTextInfo) return;

  const textarea = textAreaRef.current;
  const { start, end, text: selectedText } = selectedTextInfo;

  if (selectedText.length === 0) {
    alert('Please select some text first!');
    return;
  }

  const beforeText = textarea.value.substring(0, start);
  const afterText = textarea.value.substring(end);
  
  // Check if already formatted
  const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
  const match = selectedText.match(colorFormatRegex);
  
  const newColoredText = match 
    ? `|c${color}${match[1]}|r`
    : `|c${color}${selectedText}|r`;

  const newText = beforeText + newColoredText + afterText;

  // Update text
  textarea.value = newText;
  setText(newText);
  debouncedSaveHistory(newText);

  // Restore selection
  setTimeout(() => {
    const newStart = start;
    const newEnd = newStart + newColoredText.length;
    textarea.setSelectionRange(newStart, newEnd);
    textarea.focus();
  }, 0);

  console.log('✅ React Color applied:', color);
}, [selectedTextInfo, debouncedSaveHistory]);

// Handle color change from React Color
const handleColorChange = (color: ColorResult): void => {
  const hexColor = color.hex.replace('#', '').toUpperCase();
  applySelectedColor(hexColor);
};

// Handle color picker open
const openColorPicker = useCallback((event: React.MouseEvent): void => {
  if (!textAreaRef.current) return;

  const textarea = textAreaRef.current;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);

  if (selectedText.length === 0) {
    alert('Please select some text first!');
    return;
  }

  // Save selection info
  setSelectedTextInfo({ start, end, text: selectedText });

  // Calculate position for color picker
  const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
  setColorPickerPosition({
    x: buttonRect.left,
    y: buttonRect.bottom + 8
  });

  setShowColorPicker(true);
  console.log('🎨 React Color picker opened for:', selectedText);
}, []);

// Close color picker
const closeColorPicker = (): void => {
  setShowColorPicker(false);
  setSelectedTextInfo(null);
};
```

## Step 6: Remove All Pickr useEffects

**DELETE these entire useEffect blocks:**
- Pickr initialization useEffect
- setupNativeColorPicker useEffect  
- All Pickr positioning logic
- All emergency close handlers for Pickr

## Step 7: Update JSX - Desktop Toolbar

**Replace the ColorPickerWrapper in desktop toolbar:**
```typescript
<ColorPickerWrapper>
  <EmojiButton
    id="eso-native-emoji-btn"
    type="button"
    onClick={openColorPicker}
    aria-label="Choose custom color"
    style={{
      backgroundColor: showColorPicker ? '#3b82f6' : 'transparent',
      color: showColorPicker ? 'white' : 'inherit'
    }}
  >
    🎨
  </EmojiButton>
</ColorPickerWrapper>
```

## Step 8: Update JSX - Mobile Layout

**Replace the mobile ColorPickerWrapper:**
```typescript
<ColorPickerWrapper>
  <EmojiButton
    id="eso-native-emoji-btn-mobile"
    type="button"
    onClick={openColorPicker}
    aria-label="Choose custom color"
    style={{
      backgroundColor: showColorPicker ? '#3b82f6' : 'transparent',
      color: showColorPicker ? 'white' : 'inherit'
    }}
  >
    🎨
  </EmojiButton>
</ColorPickerWrapper>
```

## Step 9: Add React Color Picker Component

**Add this right before the closing `</EditorTool>` tag:**
```typescript
{/* React Color Picker Overlay */}
{showColorPicker && (
  <>
    {/* Backdrop */}
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999998,
        backgroundColor: 'transparent'
      }}
      onClick={closeColorPicker}
    />
    
    {/* Color Picker */}
    <Box
      sx={{
        position: 'fixed',
        left: Math.max(10, Math.min(colorPickerPosition.x, window.innerWidth - 230)),
        top: Math.max(10, Math.min(colorPickerPosition.y, window.innerHeight - 320)),
        zIndex: 999999,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      <SketchPicker
        color="#ffffff"
        onChange={handleColorChange}
        onChangeComplete={handleColorChange}
        disableAlpha={true}
        presetColors={[
          '#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333', '#000000',
          '#FFFF00', '#FFD700', '#FF0000', '#FF4500', '#FF8000', '#FFA500',
          '#00FF00', '#32CD32', '#0080FF', '#0000FF', '#8A2BE2', '#FF00FF'
        ]}
      />
    </Box>
  </>
)}
```

## Step 10: Update Quick Color Buttons

**Update the applyQuickColor function:**
```typescript
const applyQuickColor = (colorHex: string): void => {
  if (!textAreaRef.current) return;

  const textarea = textAreaRef.current;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (start === end) {
    alert('Please select some text first!');
    return;
  }

  // Set selection info and apply color directly
  setSelectedTextInfo({
    start,
    end,
    text: textarea.value.substring(start, end)
  });

  applySelectedColor(colorHex);
};
```

## Step 11: Cleanup - Remove Pickr CSS Files

**You can now delete these CSS files from your project:**
- `src/styles/pickr-theme.css`
- `src/styles/pickr-radius.css`
- `src/styles/pickr-background.css`

## Benefits of React Color

✅ **Native React integration** - No DOM manipulation issues  
✅ **Reliable rendering** - No canvas problems  
✅ **Mobile-friendly** - Works perfectly on touch devices  
✅ **Customizable** - Easy to theme and modify  
✅ **TypeScript support** - Full type definitions  
✅ **No z-index issues** - Proper React portal rendering  

## Expected Behavior

1. **Select text** in the editor
2. **Click 🎨 emoji** - Sketch color picker appears below button
3. **Click any color** - Text is immediately colored and picker closes
4. **Click outside picker** - Picker closes without applying color

This should work flawlessly compared to the problematic Pickr integration!