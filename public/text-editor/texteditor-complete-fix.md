# Complete Fix for TextEditor.tsx - Text Editing & Toolbar Issues

## Critical Issues Identified

### 1. **Missing Character Count Updates**
The `charCount` state is only updated in `handleTextChange` but never when undo/redo operations occur, causing the character counter to be out of sync.

### 2. **History Management Issues**
- The undo/redo functions update the `text` state but don't trigger `setCharCount`
- The `saveToHistory` dependency array includes `historyIndex` which can cause infinite loops
- History is saved on every text change instead of being debounced

### 3. **Text Selection Issues**
- The `getSelectedText` function depends on the `text` state instead of the actual textarea value
- This causes selection-based operations to fail when the state is out of sync

### 4. **Missing Cleanup and Event Handlers**
- No proper cleanup for event listeners
- Missing key handlers for accessibility
- No debouncing for performance

## Complete Solution

### 1. Fix Character Count Updates

```typescript
// Update character count whenever text changes
useEffect(() => {
  setCharCount(text.length);
}, [text]);

const undo = (): void => {
  if (historyIndex > 0) {
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const newText = history[newIndex];
    setText(newText);
    // Character count will be updated by the useEffect above
  }
};

const redo = (): void => {
  if (historyIndex < history.length - 1) {
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    const newText = history[newIndex];
    setText(newText);
    // Character count will be updated by the useEffect above
  }
};
```

### 2. Fix History Management

```typescript
// Debounced history saving
const debouncedSaveHistory = useCallback(
  debounce((newText: string) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      if (newHistory.length === 0 || newHistory[newHistory.length - 1] !== newText) {
        const updatedHistory = [...newHistory, newText];
        if (updatedHistory.length > maxHistory) {
          updatedHistory.shift();
        } else {
          setHistoryIndex(prev => prev + 1);
        }
        return updatedHistory;
      }
      return prev;
    });
  }, 500),
  [historyIndex, maxHistory]
);

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), wait);
  };
}
```

### 3. Fix Text Selection

```typescript
const getSelectedText = useCallback((): { text: string; start: number; end: number } => {
  if (!textAreaRef.current) return { text: '', start: 0, end: 0 };
  
  const textarea = textAreaRef.current;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // Use the actual textarea value instead of state
  const actualText = textarea.value;
  
  return {
    text: actualText.substring(start, end),
    start,
    end,
  };
}, []); // Remove text dependency

// Also fix the apply color function to use textarea value
const applyColorToSelection = useCallback(
  (colorHex: string): void => {
    if (!textAreaRef.current) return;
    
    const textarea = textAreaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
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
      ? `|c${colorHex}${match[1]}|r`
      : `|c${colorHex}${selectedText}|r`;
    
    const newText = beforeText + newColoredText + afterText;
    
    // Update both textarea and state
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
  },
  [debouncedSaveHistory]
);
```

### 4. Fix Event Handlers

```typescript
const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
  const newText = e.target.value;
  setText(newText);
  debouncedSaveHistory(newText);
};

// Add keyboard shortcuts
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
      case 'a':
        // Allow default Ctrl+A behavior
        break;
      default:
        break;
    }
  }
};
```

### 5. Fix Remove Formatting Functions

```typescript
const removeFormatFromSelection = (): void => {
  if (!textAreaRef.current) return;
  
  const textarea = textAreaRef.current;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  
  if (selectedText.length === 0) {
    alert('Please select some text first!');
    return;
  }

  const cleanText = selectedText.replace(/\|c[0-9A-Fa-f]{6}(.*?)\|r/g, '$1');
  const beforeText = textarea.value.substring(0, start);
  const afterText = textarea.value.substring(end);
  const newText = beforeText + cleanText + afterText;
  
  textarea.value = newText;
  setText(newText);
  debouncedSaveHistory(newText);
  
  // Restore cursor position
  const newCursorPos = start + cleanText.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  textarea.focus();
};

const clearFormatting = (): void => {
  if (!textAreaRef.current) return;
  
  const textarea = textAreaRef.current;
  const cleanText = textarea.value.replace(/\|c[0-9A-Fa-f]{6}(.*?)\|r/g, '$1');
  
  textarea.value = cleanText;
  setText(cleanText);
  debouncedSaveHistory(cleanText);
  textarea.focus();
};
```

### 6. Fix Copy Function

```typescript
const copyToClipboard = async (): Promise<void> => {
  if (!textAreaRef.current) return;
  
  const textToCopy = textAreaRef.current.value;
  
  try {
    await navigator.clipboard.writeText(textToCopy);
    setCopyFeedback('✓ Copied!');
    setTimeout(() => setCopyFeedback(''), 1500);
  } catch (err) {
    // Fallback for older browsers
    textAreaRef.current.select();
    document.execCommand('copy');
    setCopyFeedback('✓ Copied!');
    setTimeout(() => setCopyFeedback(''), 1500);
  }
};
```

### 7. Update the TextInput Component

```typescript
<TextInput
  ref={textAreaRef}
  id="eso-input"
  value={text}
  onChange={handleTextChange}
  onKeyDown={handleKeyDown}
  placeholder="Type your text here or paste ESO/WoW formatted text. Select text and use the buttons above to format."
  aria-describedby="char-count"
/>
```

### 8. Fix Initial State

```typescript
// Initialize with example text - fix the useEffect
useEffect(() => {
  const exampleText = `|cFFFF00What We Offer:|r

|c00FF00Progressive Raiding & Teaching:|r Whether you're a seasoned veteran or new to trials, our experienced raiders are eager to teach, share strategies, and grow together. We run regular end-game content like veteran trials, arenas, and dungeons—focusing on fun, improvement, and epic loot!

|c00FF00Fully Equipped Guild Hall:|r Dive into @PatrickFoo's Hall of the Lunar Champion, our ultimate hub featuring:
- All crafting stations for seamless gear upgrades.
- Mundus stones for build optimization.
- Target dummies to hone your DPS, healing, and tanking skills.`;

  setText(exampleText);
  setHistory([exampleText]);
  setHistoryIndex(0);
}, []); // Empty dependency array - only run once
```

## Key Changes Summary

1. **Fixed character count synchronization** - Updates automatically when text changes
2. **Fixed history management** - Proper debouncing and state updates
3. **Fixed selection handling** - Uses textarea value instead of state
4. **Added keyboard shortcuts** - Ctrl+Z/Ctrl+Y for undo/redo
5. **Fixed all toolbar functions** - Direct textarea manipulation with state sync
6. **Improved performance** - Debounced history saving
7. **Better accessibility** - Proper ARIA labels and keyboard support

These changes will restore full functionality to the text editor, making it possible to:
- Type and edit text normally
- Use undo/redo operations
- Apply colors to selected text
- Remove formatting
- Copy text to clipboard
- See accurate character counts