# Fix Text Selection Visual Bug - Maintain Highlight After Color Actions

## Issue Analysis

The problem is that after applying colors or opening the color picker, the textarea **loses visual selection highlighting** but the internal selection state (selectionStart/selectionEnd) remains intact. This creates confusing UX where text appears unselected but actions still work.

## Root Causes

1. **Focus loss**: Color picker interactions cause textarea to lose focus
2. **DOM manipulation**: Updating textarea.value programmatically clears visual selection
3. **Event timing**: Selection restoration happens before textarea regains focus
4. **Browser behavior**: Some browsers don't show selection when element isn't focused

## Complete Solution

### Fix 1: Force Visual Selection Restoration

**Add this enhanced selection restoration function:**

```typescript
// Enhanced selection restoration with visual feedback
const restoreTextSelection = useCallback((start: number, end: number, forceVisual: boolean = true) => {
  if (!textAreaRef.current) return;
  
  const textarea = textAreaRef.current;
  
  // Ensure textarea is focused first
  textarea.focus();
  
  // Small delay to ensure focus is established
  setTimeout(() => {
    // Set the selection range
    textarea.setSelectionRange(start, end);
    
    if (forceVisual) {
      // Force visual highlight by briefly blurring and refocusing
      textarea.blur();
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, end);
        
        // Additional visual feedback with CSS
        textarea.style.outline = '2px solid #3b82f6';
        textarea.style.outlineOffset = '2px';
        
        // Remove CSS highlight after a moment
        setTimeout(() => {
          textarea.style.outline = '';
          textarea.style.outlineOffset = '';
        }, 300);
      }, 10);
    }
  }, 10);
}, []);
```

### Fix 2: Update Apply Color Function

**Replace your applyPreviewColor function with this enhanced version:**

```typescript
const applyPreviewColor = (): void => {
  if (!textAreaRef.current || !selectedTextInfo || !previewColor) return;

  const textarea = textAreaRef.current;
  const { start, end, text: selectedText } = selectedTextInfo;
  
  // Generate the new text
  const beforeText = selectedTextInfo.originalText.substring(0, start);
  const afterText = selectedTextInfo.originalText.substring(end);
  
  const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
  const match = selectedText.match(colorFormatRegex);
  const newColoredText = match 
    ? `|c${previewColor}${match[1]}|r`
    : `|c${previewColor}${selectedText}|r`;

  const newText = beforeText + newColoredText + afterText;

  // Update text
  textarea.value = newText;
  setText(newText);
  debouncedSaveHistory(newText);

  // Calculate new selection bounds for the colored text
  const newStart = start;
  const newEnd = newStart + newColoredText.length;

  // Close color picker first
  closeColorPicker();

  // Restore selection with visual feedback
  setTimeout(() => {
    restoreTextSelection(newStart, newEnd, true);
    console.log('✅ Color applied and selection restored:', previewColor);
  }, 50);
};
```

### Fix 3: Update Quick Color Functions

**Update your applyQuickColor function:**

```typescript
const applyQuickColor = (colorHex: string): void => {
  if (!textAreaRef.current) return;

  const textarea = textAreaRef.current;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);

  if (selectedText.length === 0) {
    alert('Please select some text first!');
    return;
  }

  // Apply color formatting
  const beforeText = textarea.value.substring(0, start);
  const afterText = textarea.value.substring(end);
  const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
  const match = selectedText.match(colorFormatRegex);
  const newColoredText = match 
    ? `|c${colorHex}${match[1]}|r`
    : `|c${colorHex}${selectedText}|r`;

  const newText = beforeText + newColoredText + afterText;

  // Update text
  textarea.value = newText;
  setText(newText);
  debouncedSaveHistory(newText);

  // Calculate new selection bounds
  const newStart = start;
  const newEnd = newStart + newColoredText.length;

  // Restore selection with visual feedback
  setTimeout(() => {
    restoreTextSelection(newStart, newEnd, true);
    console.log('✅ Quick color applied and selection restored:', colorHex);
  }, 50);
};
```

### Fix 4: Enhanced Color Picker Opening

**Update your openColorPicker function to maintain selection:**

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

  // Store original selection info
  setSelectedTextInfo({ 
    start, 
    end, 
    text: selectedText,
    originalText: textarea.value
  });

  // Position picker
  const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
  setColorPickerPosition({
    x: buttonRect.left,
    y: buttonRect.bottom + 8
  });

  // Enter preview mode
  setIsPreviewMode(true);
  setShowColorPicker(true);
  
  // Maintain visual selection during picker open
  setTimeout(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
      textAreaRef.current.setSelectionRange(start, end);
      
      // Add persistent visual indicator during color picking
      textAreaRef.current.style.boxShadow = '0 0 0 2px #3b82f6';
      textAreaRef.current.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    }
  }, 100);
  
  console.log('🎨 Color picker opened, selection maintained');
}, []);
```

### Fix 5: Enhanced Close Function

**Update your closeColorPicker function:**

```typescript
const closeColorPicker = (): void => {
  // Remove visual indicators first
  if (textAreaRef.current) {
    textAreaRef.current.style.boxShadow = '';
    textAreaRef.current.style.backgroundColor = '';
  }
  
  setShowColorPicker(false);
  setSelectedTextInfo(null);
  setPreviewColor('#ffffff');
  setIsPreviewMode(false);
  
  // Ensure textarea regains focus
  setTimeout(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, 10);
};
```

### Fix 6: Cancel with Selection Restoration

**Update your cancelColorSelection function:**

```typescript
const cancelColorSelection = (): void => {
  if (selectedTextInfo && textAreaRef.current) {
    const textarea = textAreaRef.current;
    
    // Restore original text
    textarea.value = selectedTextInfo.originalText;
    setText(selectedTextInfo.originalText);
    
    // Restore original selection
    const { start, end } = selectedTextInfo;
    
    closeColorPicker();
    
    // Restore selection with visual feedback
    setTimeout(() => {
      restoreTextSelection(start, end, true);
      console.log('❌ Color selection cancelled, original selection restored');
    }, 50);
  } else {
    closeColorPicker();
  }
};
```

### Fix 7: Additional CSS for Better Visual Feedback

**Add this CSS to your texteditor-theme-bridge.css:**

```css
/* Enhanced selection visibility */
.text-editor-page textarea:focus {
  outline: none !important;
}

/* Custom selection highlighting for better visibility */
.text-editor-page textarea::selection {
  background-color: #3b82f6 !important;
  color: white !important;
}

.text-editor-page textarea::-moz-selection {
  background-color: #3b82f6 !important;
  color: white !important;
}

/* Highlight during color picking */
.text-editor-page textarea.color-picking {
  box-shadow: 0 0 0 2px #3b82f6 !important;
  background-color: rgba(59, 130, 246, 0.1) !important;
}
```

### Fix 8: Add CSS Classes Dynamically

**Add this useEffect to manage CSS classes:**

```typescript
// Manage visual states with CSS classes
useEffect(() => {
  if (!textAreaRef.current) return;
  
  const textarea = textAreaRef.current;
  
  if (isPreviewMode) {
    textarea.classList.add('color-picking');
  } else {
    textarea.classList.remove('color-picking');
  }
  
  return () => {
    textarea.classList.remove('color-picking');
  };
}, [isPreviewMode]);
```

## Expected Results

After implementing these fixes:

✅ **Visual selection maintained** - Text stays visually highlighted after color actions  
✅ **Focus management** - Textarea properly regains focus after color picker interactions  
✅ **Clear feedback** - Users can always see what text is selected  
✅ **Smooth transitions** - Brief outline highlight confirms successful color application  
✅ **Consistent behavior** - Works the same for apply, cancel, and quick color buttons  

## Testing Steps

1. **Select text** → Should see blue highlight
2. **Open color picker** → Text should remain highlighted with blue border
3. **Apply color** → Brief outline flash, then text stays selected with new color
4. **Cancel color** → Returns to original text with original selection highlighted
5. **Quick color buttons** → Same selection restoration behavior

This comprehensive fix ensures users always have clear visual feedback about their text selection state!