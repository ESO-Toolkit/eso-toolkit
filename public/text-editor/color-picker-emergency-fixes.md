# Critical Color Picker Fixes - Positioning & Selection Issues

## New Issues Found

### 1. **Color Picker Off-Screen (Right Side)**
**Problem:** The positioning calculation is pushing Pickr too far right
**Root Cause:** The positioning logic is using `rect.left` instead of properly centering or aligning to the emoji button

### 2. **Can't Close Color Picker**
**Problem:** Pickr is positioned off-screen so users can't reach the close/save buttons
**Root Cause:** Missing close event handlers and improper z-index stacking

### 3. **No Highlighted Text Visible**
**Problem:** The selection highlighting isn't working
**Root Cause:** CSS changes aren't visible or are being overridden

## Immediate Fixes

### 1. Fix Positioning - Keep Pickr On Screen

```typescript
const positionPickr = useCallback((): void => {
  const appEl = document.querySelector('.pcr-app') as HTMLElement;
  const emoji = document.getElementById('eso-native-emoji-btn');
  
  if (!emoji || !appEl) {
    console.warn('Cannot position Pickr - missing elements');
    return;
  }

  const rect = emoji.getBoundingClientRect();
  const gap = 12;
  
  // Force Pickr to be visible first
  appEl.style.display = 'block';
  appEl.style.visibility = 'visible';
  
  // Get Pickr dimensions (use defaults if not measured yet)
  const pickrWidth = 320;  // Standard Pickr width
  const pickrHeight = 280; // Standard Pickr height
  
  // Calculate position - CENTER the picker below the emoji
  let left = rect.left + (rect.width / 2) - (pickrWidth / 2);
  let top = rect.bottom + gap;
  
  // Keep within viewport bounds
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Adjust horizontal position
  if (left < gap) {
    left = gap; // Too far left
  } else if (left + pickrWidth > viewportWidth - gap) {
    left = viewportWidth - pickrWidth - gap; // Too far right
  }
  
  // Adjust vertical position  
  if (top + pickrHeight > viewportHeight - gap) {
    // Try positioning above the emoji
    top = rect.top - pickrHeight - gap;
    
    // If still doesn't fit, place in center of screen
    if (top < gap) {
      top = (viewportHeight - pickrHeight) / 2;
      left = (viewportWidth - pickrWidth) / 2;
    }
  }

  // Apply positioning with important flags
  appEl.style.position = 'fixed';
  appEl.style.left = `${Math.max(0, left)}px`;
  appEl.style.top = `${Math.max(0, top)}px`;
  appEl.style.zIndex = '999999';
  appEl.style.maxWidth = 'none';
  appEl.style.maxHeight = 'none';
  
  console.log(`✅ Positioned Pickr at ${left}, ${top} (viewport: ${viewportWidth}x${viewportHeight})`);
}, []);
```

### 2. Add Close Functionality

```typescript
// Enhanced Pickr initialization with close handlers
useEffect(() => {
  if (isMobile || !pickrAnchorRef.current) return;

  let mounted = true;

  const initPickr = async (): Promise<void> => {
    try {
      const Pickr = (await import('@simonwep/pickr')).default;
      
      if (!mounted || !pickrAnchorRef.current) return;

      const pickrInstance = (Pickr as any).create({
        el: pickrAnchorRef.current,
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
            clear: true,  // ✅ Enable clear button
            save: true,
          },
        },
        position: 'bottom-middle',
        closeOnScroll: true,
        appClass: 'eso-pickr-app',
      });

      // Color selection handler
      pickrInstance.on('save', (color: any) => {
        if (color && mounted) {
          const hexColor = color.toHEXA().toString().substring(1, 7);
          console.log('✅ Color selected:', hexColor);
          applyColorToSelection(hexColor);
          pickrInstance.hide();
        }
      });

      // Clear/cancel handler
      pickrInstance.on('clear', () => {
        console.log('❌ Color picker cancelled');
        pickrInstance.hide();
        restoreSelection();
      });

      // Show handler
      pickrInstance.on('show', () => {
        if (mounted) {
          console.log('👁️ Pickr opening...');
          // Position with multiple attempts
          setTimeout(() => positionPickr(), 10);
          setTimeout(() => positionPickr(), 100);
          setTimeout(() => positionPickr(), 250);
          
          // Add escape key handler
          const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              console.log('⚡ Escape pressed, closing Pickr');
              pickrInstance.hide();
              document.removeEventListener('keydown', handleEscape);
            }
          };
          document.addEventListener('keydown', handleEscape);
        }
      });

      // Hide handler
      pickrInstance.on('hide', () => {
        if (mounted) {
          console.log('👋 Pickr closed');
          restoreSelection();
        }
      });

      if (mounted) {
        pickrRef.current = pickrInstance;
        console.log('✅ Pickr initialized successfully');
      } else {
        pickrInstance.destroy();
      }

    } catch (error) {
      console.error('❌ Pickr initialization failed:', error);
    }
  };

  initPickr();

  return () => {
    mounted = false;
    if (pickrRef.current) {
      try {
        pickrRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying Pickr:', error);
      }
      pickrRef.current = null;
    }
  };
}, [isMobile, theme.palette.mode, applyColorToSelection]);
```

### 3. Fix Selection Highlighting

```typescript
// Add selection state
const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
const [savedSelection, setSavedSelection] = useState<{start: number, end: number, text: string} | null>(null);

// Enhanced selection highlighting
const highlightSelectedText = (): void => {
  if (!textAreaRef.current) return;
  
  const textarea = textAreaRef.current;
  const selection = getSelectedText();
  
  if (selection.text.length > 0) {
    // Save selection
    setSavedSelection(selection);
    setIsColorPickerOpen(true);
    
    // Add visual highlighting with stronger styles
    textarea.style.boxShadow = '0 0 0 3px #3b82f6, inset 0 0 0 2px #60a5fa';
    textarea.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    textarea.style.transition = 'all 0.2s ease';
    
    console.log('✨ Highlighted selection:', selection.text);
  }
};

const restoreSelection = (): void => {
  if (!textAreaRef.current) return;
  
  const textarea = textAreaRef.current;
  
  // Remove highlighting
  textarea.style.boxShadow = '';
  textarea.style.backgroundColor = '';
  setIsColorPickerOpen(false);
  
  // Restore selection if saved
  if (savedSelection) {
    setTimeout(() => {
      textarea.setSelectionRange(savedSelection.start, savedSelection.end);
      textarea.focus();
      console.log('🔄 Restored selection');
    }, 100);
  }
  
  setSavedSelection(null);
};

// Updated color picker click handler
const handleColorPickerClick = useCallback((): void => {
  console.log('🎨 Color picker clicked');
  
  // Validate selection first
  const selection = getSelectedText();
  if (selection.text.length === 0) {
    alert('Please select some text first!');
    return;
  }
  
  // Highlight the selection
  highlightSelectedText();
  
  if (isMobile) {
    // Mobile logic (unchanged)
    const colorInput = document.getElementById('native-color-input') as HTMLInputElement;
    if (colorInput) {
      try {
        if (typeof colorInput.showPicker === 'function') {
          colorInput.showPicker();
        } else {
          colorInput.click();
        }
      } catch (error) {
        colorInput.click();
      }
    }
  } else {
    // Desktop: Use Pickr
    if (pickrRef.current) {
      try {
        console.log('📱 Opening Pickr...');
        pickrRef.current.show();
      } catch (error) {
        console.error('❌ Failed to open Pickr:', error);
        createFallbackColorPicker();
      }
    } else {
      console.warn('⚠️ Pickr not ready, using fallback');
      createFallbackColorPicker();
    }
  }
}, [isMobile, getSelectedText]);

// Updated apply color function
const applyColorToSelection = useCallback(
  (colorHex: string): void => {
    if (!textAreaRef.current) return;

    const textarea = textAreaRef.current;
    let start: number, end: number, selectedText: string;

    // Use saved selection if available
    if (savedSelection && savedSelection.text.length > 0) {
      start = savedSelection.start;
      end = savedSelection.end;
      selectedText = savedSelection.text;
      console.log('🎯 Using saved selection:', selectedText);
    } else {
      start = textarea.selectionStart;
      end = textarea.selectionEnd;
      selectedText = textarea.value.substring(start, end);
      console.log('🎯 Using current selection:', selectedText);
    }

    if (selectedText.length === 0) {
      alert('No text selected!');
      restoreSelection();
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

    // Update text
    textarea.value = newText;
    setText(newText);
    debouncedSaveHistory(newText);

    // Restore and highlight the newly colored text
    setTimeout(() => {
      const newStart = start;
      const newEnd = newStart + newColoredText.length;
      textarea.setSelectionRange(newStart, newEnd);
      textarea.focus();
      restoreSelection(); // Clean up highlighting
      console.log('✅ Color applied successfully');
    }, 0);
  },
  [debouncedSaveHistory, savedSelection]
);
```

### 4. Add Emergency Close Button (CSS)

Add this to your CSS files to ensure there's always a way to close:

```css
/* Emergency close for Pickr */
.pcr-app::before {
  content: "×";
  position: absolute;
  top: -10px;
  right: -10px;
  width: 24px;
  height: 24px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  z-index: 1000001;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.pcr-app::before:hover {
  background: #dc2626;
  transform: scale(1.1);
}

/* Ensure Pickr stays on screen */
.pcr-app {
  max-width: 320px !important;
  max-height: 400px !important;
  overflow: visible !important;
}
```

### 5. Add Click Handler for Emergency Close

```typescript
// Add click handler for emergency close
useEffect(() => {
  const handlePickrClose = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.pcr-app::before')) {
      if (pickrRef.current) {
        pickrRef.current.hide();
      }
    }
  };

  document.addEventListener('click', handlePickrClose);
  return () => document.removeEventListener('click', handlePickrClose);
}, []);
```

## Quick Test Steps

1. **Select some text** in the editor
2. **Click the 🎨 emoji** - should see blue highlighting around textarea
3. **Color picker should appear** centered below emoji and stay on screen
4. **Press Escape or click outside** to close
5. **Selected text should be visible** with blue highlight during color picking

These fixes should resolve:
- ✅ **Positioning issues** - Picker stays on screen
- ✅ **Can't close** - Multiple close methods (Escape, clear button, emergency close)
- ✅ **Selection visibility** - Blue highlighting during color picking
- ✅ **Better UX** - Clear feedback and reliable behavior