# Color Picker Issues Analysis & Fixes

## Issues Identified

### 1. **Emoji Click Handler Not Opening Pickr**
**Problem:** The color picker often doesn't open when clicking the emoji because:
- Pickr initialization happens asynchronously but the click handler runs immediately
- No checks to ensure Pickr is actually ready before trying to show it
- Missing fallback handling when Pickr fails to initialize

**Current buggy code:**
```typescript
const handleColorPickerClick = useCallback((): void => {
  if (isMobile) {
    // Mobile logic works fine
  } else {
    // Desktop: Use Pickr or fallback
    if (pickrRef.current) {  // ❌ This check isn't enough
      try {
        pickrRef.current.show();  // ❌ May fail silently
      } catch (error) {
        // Fallback logic
      }
    }
  }
}, [isMobile, applyColorToSelection, validateSelection]);
```

### 2. **Text Selection Not Visible During Color Picking**
**Problem:** When the Pickr color picker opens, you can't see the selected text because:
- The textarea loses focus when Pickr opens
- No visual indication of what text is selected
- Selection gets cleared when clicking on Pickr

### 3. **Pickr Positioning Issues**
**Problem:** The `positionPickr` function has timing issues and may not position correctly

### 4. **Missing Selection Persistence**
**Problem:** Text selection is lost when the color picker opens/closes

## Complete Fix

### 1. Fix Emoji Click Handler with Better Pickr Checks

```typescript
const handleColorPickerClick = useCallback((): void => {
  console.log('Color picker clicked, isMobile:', isMobile);
  
  if (isMobile) {
    // Mobile: Use native color picker
    const colorInput = document.getElementById('native-color-input') as HTMLInputElement;
    if (colorInput) {
      try {
        if (typeof colorInput.showPicker === 'function') {
          colorInput.showPicker();
        } else {
          colorInput.click();
        }
      } catch (error) {
        console.warn('Native color picker failed:', error);
        colorInput.click();
      }
    } else {
      console.warn('Native color input not found');
    }
  } else {
    // Desktop: Use Pickr with better validation
    console.log('Attempting to open Pickr, ref exists:', !!pickrRef.current);
    
    if (pickrRef.current) {
      try {
        // Force position update before showing
        setTimeout(() => positionPickr(), 0);
        pickrRef.current.show();
        console.log('Pickr opened successfully');
      } catch (error) {
        console.warn('Pickr failed to open:', error);
        createFallbackColorPicker();
      }
    } else {
      console.warn('Pickr not initialized, creating fallback');
      createFallbackColorPicker();
    }
  }
}, [isMobile]);

// Add fallback color picker function
const createFallbackColorPicker = (): void => {
  const fallbackColorInput = document.createElement('input');
  fallbackColorInput.type = 'color';
  fallbackColorInput.value = '#ffffff';
  fallbackColorInput.style.cssText = `
    position: fixed; 
    top: -9999px; 
    opacity: 0;
    pointer-events: auto;
  `;
  document.body.appendChild(fallbackColorInput);

  fallbackColorInput.addEventListener('change', (e) => {
    const hex = (e.target as HTMLInputElement).value.replace('#', '').toUpperCase();
    if (validateSelection()) {
      applyColorToSelection(hex);
    }
    document.body.removeChild(fallbackColorInput);
  });

  try {
    if (typeof fallbackColorInput.showPicker === 'function') {
      fallbackColorInput.showPicker();
    } else {
      fallbackColorInput.click();
    }
  } catch (error) {
    console.warn('Fallback color picker failed:', error);
    fallbackColorInput.click();
  }
};
```

### 2. Add Selection Persistence and Visual Indication

```typescript
// Store selection when color picker opens
const [savedSelection, setSavedSelection] = useState<{start: number, end: number, text: string} | null>(null);

const handleColorPickerClick = useCallback((): void => {
  // Save current selection before opening picker
  const currentSelection = getSelectedText();
  if (currentSelection.text.length > 0) {
    setSavedSelection(currentSelection);
    
    // Add visual indication to textarea
    if (textAreaRef.current) {
      textAreaRef.current.style.boxShadow = '0 0 0 2px #3b82f6';
    }
  }
  
  // ... rest of color picker logic
}, [getSelectedText]);

// Enhanced apply color function that uses saved selection
const applyColorToSelection = useCallback(
  (colorHex: string): void => {
    if (!textAreaRef.current) return;

    const textarea = textAreaRef.current;
    let start: number, end: number, selectedText: string;

    // Use saved selection if available, otherwise get current
    if (savedSelection && savedSelection.text.length > 0) {
      start = savedSelection.start;
      end = savedSelection.end;
      selectedText = savedSelection.text;
      console.log('Using saved selection:', selectedText);
    } else {
      start = textarea.selectionStart;
      end = textarea.selectionEnd;
      selectedText = textarea.value.substring(start, end);
      console.log('Using current selection:', selectedText);
    }

    if (selectedText.length === 0) {
      alert('Please select some text first!');
      return;
    }

    // Clear visual indication
    textarea.style.boxShadow = '';
    setSavedSelection(null);

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

    // Restore selection to the newly colored text
    setTimeout(() => {
      const newStart = start;
      const newEnd = newStart + newColoredText.length;
      textarea.setSelectionRange(newStart, newEnd);
      textarea.focus();
    }, 0);
  },
  [debouncedSaveHistory, savedSelection]
);
```

### 3. Improve Pickr Initialization with Retry Logic

```typescript
// Enhanced Pickr initialization with retry logic
useEffect(() => {
  if (isMobile || !pickrAnchorRef.current) return;

  let mounted = true;
  let retryCount = 0;
  const maxRetries = 3;

  const initPickr = async (): Promise<void> => {
    try {
      console.log('Initializing Pickr, attempt:', retryCount + 1);
      
      // Wait for Pickr library to load
      let Pickr;
      try {
        Pickr = (await import('@simonwep/pickr')).default;
      } catch (error) {
        console.warn('Failed to import Pickr:', error);
        throw error;
      }

      if (!mounted || !pickrAnchorRef.current) return;

      // Ensure anchor element is ready
      const anchor = pickrAnchorRef.current;
      if (!anchor.isConnected) {
        throw new Error('Anchor element not in DOM');
      }

      const pickrInstance = (Pickr as any).create({
        el: anchor,
        theme: theme.palette.mode === 'dark' ? 'monolith' : 'classic',
        default: '#ffffff',
        swatches: [
          '#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333', '#000000',
          '#FFFF00', '#FFD700', '#FF0000', '#FF4500', '#FF8000', '#FFA500',
          '#00FF00', '#32CD32', '#0080FF', '#0000FF', '#8A2BE2', '#FF00FF'
        ],
        components: {
          preview: true,
          opacity: false,
          hue: true,
          interaction: {
            hex: true,
            rgba: false,
            hsla: false,
            hsva: false,
            cmyk: false,
            input: true,
            clear: false,
            save: true,
          },
        },
        position: 'bottom-middle',
        closeOnScroll: true,
        appClass: 'eso-pickr-app',
      });

      // Enhanced event handlers
      pickrInstance.on('save', (color: any) => {
        if (color && mounted) {
          const hexColor = color.toHEXA().toString().substring(1, 7);
          console.log('Color selected:', hexColor);
          applyColorToSelection(hexColor);
          pickrInstance.hide();
        }
      });

      pickrInstance.on('show', () => {
        if (mounted) {
          console.log('Pickr shown, positioning...');
          // Multiple positioning attempts for reliability
          setTimeout(() => positionPickr(), 0);
          setTimeout(() => positionPickr(), 100);
          setTimeout(() => positionPickr(), 200);
        }
      });

      pickrInstance.on('hide', () => {
        if (mounted && textAreaRef.current) {
          // Clear visual indication when closed
          textAreaRef.current.style.boxShadow = '';
          setSavedSelection(null);
          textAreaRef.current.focus();
        }
      });

      pickrInstance.on('init', () => {
        console.log('Pickr initialized successfully');
      });

      if (mounted) {
        pickrRef.current = pickrInstance;
        console.log('Pickr instance set to ref');
      } else {
        pickrInstance.destroy();
      }

    } catch (error) {
      console.warn(`Pickr initialization failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries - 1 && mounted) {
        retryCount++;
        // Exponential backoff retry
        setTimeout(() => initPickr(), Math.pow(2, retryCount) * 1000);
      } else {
        console.warn('Pickr initialization failed after all retries, will use fallback');
      }
    }
  };

  // Start initialization
  initPickr();

  return () => {
    mounted = false;
    if (pickrRef.current) {
      try {
        pickrRef.current.destroy();
        console.log('Pickr destroyed');
      } catch (error) {
        console.warn('Error destroying Pickr:', error);
      }
      pickrRef.current = null;
    }
  };
}, [isMobile, theme.palette.mode, applyColorToSelection]);
```

### 4. Enhanced Position Function

```typescript
const positionPickr = useCallback((): void => {
  const appEl = document.querySelector('.pcr-app') as HTMLElement;
  const emoji = document.getElementById('eso-native-emoji-btn');
  
  if (!emoji || !appEl) {
    console.warn('Cannot position Pickr - missing elements');
    return;
  }

  // Ensure Pickr is visible
  if (appEl.style.display === 'none') {
    console.warn('Pickr is hidden, cannot position');
    return;
  }

  const rect = emoji.getBoundingClientRect();
  const gap = 8;
  
  // Get actual Pickr dimensions
  const pickrRect = appEl.getBoundingClientRect();
  const pickrWidth = pickrRect.width || 320;
  const pickrHeight = pickrRect.height || 260;
  
  // Calculate position with better viewport handling
  let left = rect.left;
  let top = rect.bottom + gap;
  
  // Adjust horizontal position if too far right
  if (left + pickrWidth > window.innerWidth - gap) {
    left = window.innerWidth - pickrWidth - gap;
  }
  
  // Adjust horizontal position if too far left
  if (left < gap) {
    left = gap;
  }
  
  // Adjust vertical position if too far down
  if (top + pickrHeight > window.innerHeight - gap) {
    top = rect.top - pickrHeight - gap;
    // If still doesn't fit, place it in the middle
    if (top < gap) {
      top = (window.innerHeight - pickrHeight) / 2;
    }
  }

  appEl.style.position = 'fixed';
  appEl.style.left = `${left}px`;
  appEl.style.top = `${top}px`;
  appEl.style.zIndex = '99999';
  
  console.log(`Positioned Pickr at ${left}, ${top}`);
}, []);
```

### 5. Add Debug Logging for Testing

```typescript
// Add debugging to the emoji click handler
const handleEmojiClick = (): void => {
  console.log('🎨 Emoji clicked!');
  console.log('Current selection:', getSelectedText());
  handleColorPickerClick();
};
```

## Summary of Changes

1. **Better Pickr initialization** with retry logic and proper error handling
2. **Selection persistence** so you can see what text you're coloring
3. **Visual feedback** with textarea highlighting during color selection
4. **Enhanced fallback** handling when Pickr fails
5. **Improved positioning** with multiple attempts and better viewport handling
6. **Debug logging** to help troubleshoot issues

These fixes should resolve:
- ✅ Emoji not opening color picker
- ✅ Not being able to see selected text during color picking
- ✅ Inconsistent Pickr behavior
- ✅ Better mobile/desktop handling