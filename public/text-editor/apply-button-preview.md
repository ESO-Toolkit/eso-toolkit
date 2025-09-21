# React Color with Apply Button and Live Preview

## Enhanced UX: Preview Before Apply

Great idea! This will give users a much better experience by letting them preview colors before committing.

## Implementation Plan

1. **Live Preview**: Show color changes in the preview area as user moves around color picker
2. **Apply Button**: Only commit changes when user clicks "Apply"  
3. **Cancel Option**: Revert to original if user cancels
4. **Visual Feedback**: Highlight the selected text during preview

## Step 1: Enhanced State Management

**Update your state to track preview vs applied colors:**

```typescript
// Add these new states:
const [showColorPicker, setShowColorPicker] = useState(false);
const [selectedTextInfo, setSelectedTextInfo] = useState<{
  start: number;
  end: number;
  text: string;
  originalText: string; // Store original text for cancel
} | null>(null);
const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
const [previewColor, setPreviewColor] = useState<string | null>(null); // Live preview color
const [isPreviewMode, setIsPreviewMode] = useState(false);
```

## Step 2: Live Preview Logic

**Add preview functions:**

```typescript
// Create preview text with live color
const createPreviewText = useCallback((colorHex?: string): string => {
  if (!selectedTextInfo || !isPreviewMode) return text;
  
  const { start, end, originalText } = selectedTextInfo;
  const beforeText = originalText.substring(0, start);
  const afterText = originalText.substring(end);
  const selectedText = originalText.substring(start, end);
  
  if (colorHex) {
    // Apply preview color
    const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
    const match = selectedText.match(colorFormatRegex);
    const newColoredText = match 
      ? `|c${colorHex}${match[1]}|r`
      : `|c${colorHex}${selectedText}|r`;
    
    return beforeText + newColoredText + afterText;
  }
  
  return originalText;
}, [text, selectedTextInfo, isPreviewMode]);

// Handle color change for preview (not applied yet)
const handleColorPreview = (color: ColorResult): void => {
  const hexColor = color.hex.replace('#', '').toUpperCase();
  setPreviewColor(hexColor);
  
  // Don't apply to actual text yet, just store for preview
  console.log('🎨 Previewing color:', hexColor);
};

// Apply the selected color
const applyPreviewColor = (): void => {
  if (!textAreaRef.current || !selectedTextInfo || !previewColor) return;

  const textarea = textAreaRef.current;
  const { start, end } = selectedTextInfo;
  const selectedText = selectedTextInfo.originalText.substring(start, end);

  const beforeText = selectedTextInfo.originalText.substring(0, start);
  const afterText = selectedTextInfo.originalText.substring(end);
  
  // Check if already formatted
  const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
  const match = selectedText.match(colorFormatRegex);
  
  const newColoredText = match 
    ? `|c${previewColor}${match[1]}|r`
    : `|c${previewColor}${selectedText}|r`;

  const newText = beforeText + newColoredText + afterText;

  // Apply to actual text
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

  // Clean up preview state
  closeColorPicker();
  console.log('✅ Color applied:', previewColor);
};

// Cancel color selection
const cancelColorSelection = (): void => {
  // Restore original text
  if (selectedTextInfo && textAreaRef.current) {
    setText(selectedTextInfo.originalText);
    textAreaRef.current.value = selectedTextInfo.originalText;
  }
  closeColorPicker();
  console.log('❌ Color selection cancelled');
};

// Enhanced close function
const closeColorPicker = (): void => {
  setShowColorPicker(false);
  setSelectedTextInfo(null);
  setPreviewColor(null);
  setIsPreviewMode(false);
};
```

## Step 3: Enhanced Open Function

**Update the color picker opener to save original text:**

```typescript
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

  // Save original text for cancel functionality
  setSelectedTextInfo({ 
    start, 
    end, 
    text: selectedText,
    originalText: textarea.value // Store complete original text
  });

  // Position picker
  const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
  setColorPickerPosition({
    x: buttonRect.left,
    y: buttonRect.bottom + 8
  });

  setIsPreviewMode(true);
  setShowColorPicker(true);
  
  console.log('🎨 Color picker opened with preview mode');
}, []);
```

## Step 4: Enhanced Preview Rendering

**Update your renderPreview function to show live preview:**

```typescript
const renderPreview = (): JSX.Element => {
  // Use preview text if in preview mode, otherwise use actual text
  const displayText = isPreviewMode && previewColor 
    ? createPreviewText(previewColor)
    : text;

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

## Step 5: Enhanced Color Picker UI with Apply Button

**Replace your color picker JSX with this enhanced version:**

```typescript
{/* Enhanced Color Picker with Apply/Cancel */}
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
        backgroundColor: 'rgba(0, 0, 0, 0.3)'
      }}
      onClick={cancelColorSelection}
    />
    
    {/* Color Picker Container */}
    <Box
      sx={{
        position: 'fixed',
        left: Math.max(10, Math.min(colorPickerPosition.x, window.innerWidth - 250)),
        top: Math.max(10, Math.min(colorPickerPosition.y, window.innerHeight - 400)),
        zIndex: 999999,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 8px 32px rgba(0, 0, 0, 0.6)'
          : '0 8px 32px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Choose Color
        </Typography>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          Preview: "{selectedTextInfo?.text.substring(0, 20)}{selectedTextInfo?.text.length > 20 ? '...' : ''}"
        </Typography>
      </Box>
      
      {/* Sketch Picker */}
      <Box sx={{
        '& .sketch-picker': {
          backgroundColor: 'transparent !important',
          boxShadow: 'none !important',
          border: 'none !important',
        },
        '& .sketch-picker input': {
          backgroundColor: theme.palette.background.default + ' !important',
          color: theme.palette.text.primary + ' !important',
          border: `1px solid ${theme.palette.divider} !important`,
        },
        '& .sketch-picker .flexbox-fix': {
          color: theme.palette.text.secondary + ' !important',
        },
      }}>
        <SketchPicker
          color={previewColor ? `#${previewColor}` : '#ffffff'}
          onChange={handleColorPreview}
          disableAlpha={true}
          presetColors={[
            '#FFFF00', '#00FF00', '#FF0000', '#0080FF', '#FF8000', '#FF00FF',
            '#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333', '#000000'
          ]}
        />
      </Box>
      
      {/* Action Buttons */}
      <Box sx={{ 
        p: 2, 
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        gap: 1,
        justifyContent: 'flex-end'
      }}>
        <Button
          variant="outlined"
          size="small"
          onClick={cancelColorSelection}
          sx={{ minWidth: 80 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={applyPreviewColor}
          disabled={!previewColor}
          sx={{ minWidth: 80 }}
        >
          Apply
        </Button>
      </Box>
    </Box>
  </>
)}
```

## Step 6: Visual Feedback for Selected Text

**Add visual highlighting for selected text during preview:**

```typescript
// Add this useEffect to highlight selected text during preview
useEffect(() => {
  if (!textAreaRef.current) return;
  
  const textarea = textAreaRef.current;
  
  if (isPreviewMode && selectedTextInfo) {
    // Highlight selected text area
    textarea.style.boxShadow = '0 0 0 2px #3b82f6';
    textarea.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
  } else {
    // Remove highlighting
    textarea.style.boxShadow = '';
    textarea.style.backgroundColor = '';
  }
  
  return () => {
    textarea.style.boxShadow = '';
    textarea.style.backgroundColor = '';
  };
}, [isPreviewMode, selectedTextInfo]);
```

## Enhanced User Experience

✅ **Live Preview**: Colors update in real-time in the preview area  
✅ **Apply Button**: Only commits changes when user clicks "Apply"  
✅ **Cancel Option**: Restores original text if user cancels  
✅ **Visual Feedback**: Shows which text is being colored  
✅ **Header Info**: Shows preview of selected text  
✅ **Disabled State**: Apply button is disabled until color is selected  

## Workflow

1. **Select text** → Click 🎨 emoji
2. **Move around color picker** → See live preview in preview area
3. **Selected text highlighted** → Blue border around textarea
4. **Click "Apply"** → Color is committed to actual text
5. **Click "Cancel" or outside** → Reverts to original text

This creates a much more professional and user-friendly color selection experience!