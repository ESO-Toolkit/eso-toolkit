# Fix TextEditor.tsx Color Picker Functionality

## Problem Analysis

After analyzing the code, I found several issues with the TextEditor.tsx color picker functionality:

1. **Mobile Color Picker**: The mobile implementation is incomplete and doesn't properly use the native HTML5 color picker
2. **Desktop Pickr Integration**: The Pickr library initialization is complex and prone to failures
3. **Code Duplication**: Logic is duplicated between desktop and mobile implementations
4. **State Management**: Selection state is not properly managed when applying colors
5. **User Experience**: Missing selection validation and feedback

## Solution Overview

The reference files show a clean implementation that:
- Uses native HTML5 color picker on mobile devices
- Uses Pickr library for desktop with proper fallbacks
- Validates text selection before applying colors
- Provides consistent user feedback

## Key Changes Needed

### 1. Device Detection Simplification

```typescript
const isMobileDevice = useCallback((): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileUA || (hasTouch && isSmallScreen);
}, []);
```

### 2. Native Color Picker for Mobile

```typescript
const setupNativeColorPicker = useCallback((): void => {
  if (!isMobile) return;
  
  // Create hidden native color input
  let colorInput = document.getElementById('native-color-input') as HTMLInputElement;
  if (!colorInput) {
    colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.id = 'native-color-input';
    colorInput.value = '#ffffff';
    colorInput.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: auto;
    `;
    document.body.appendChild(colorInput);
  }
  
  colorInput.addEventListener('change', (e) => {
    const hex = (e.target as HTMLInputElement).value.replace('#', '').toUpperCase();
    if (validateSelection()) {
      applyColorToSelection(hex);
    }
  });
}, [isMobile, applyColorToSelection]);
```

### 3. Selection Validation

```typescript
const validateSelection = useCallback((): boolean => {
  const selection = getSelectedText();
  if (!selection.text || selection.text.length === 0) {
    alert('Please select some text first!');
    return false;
  }
  return true;
}, [getSelectedText]);
```

### 4. Unified Color Picker Handler

```typescript
const handleColorPickerClick = useCallback((): void => {
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
        colorInput.click();
      }
    }
  } else {
    // Desktop: Use Pickr or fallback
    if (pickrRef.current) {
      try {
        pickrRef.current.show();
      } catch (error) {
        // Fallback to native picker on desktop too
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.cssText = 'position: fixed; top: -9999px; opacity: 0;';
        document.body.appendChild(colorInput);
        
        colorInput.addEventListener('change', (e) => {
          const hex = (e.target as HTMLInputElement).value.replace('#', '').toUpperCase();
          if (validateSelection()) {
            applyColorToSelection(hex);
          }
          document.body.removeChild(colorInput);
        });
        
        colorInput.click();
      }
    }
  }
}, [isMobile, applyColorToSelection, validateSelection]);
```

### 5. Improved Pickr Initialization

```typescript
useEffect(() => {
  if (isMobile || !pickrAnchorRef.current) return;

  let mounted = true;
  
  const initPickr = async (): Promise<void> => {
    try {
      const Pickr = (await import('@simonwep/pickr')).default;
      
      if (!mounted || !pickrAnchorRef.current) return;

      const pickrInstance = Pickr.create({
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
            clear: false,
            save: true,
          },
        },
        position: 'bottom-middle',
        closeOnScroll: true,
        appClass: 'eso-pickr-app',
      });

      pickrInstance.on('save', (color: any) => {
        if (color && mounted) {
          const hexColor = color.toHEXA().toString().substring(1, 7);
          if (validateSelection()) {
            applyColorToSelection(hexColor);
          }
          pickrInstance.hide();
        }
      });

      pickrInstance.on('show', () => {
        if (mounted) {
          setTimeout(() => positionPickr(), 0);
        }
      });

      if (mounted) {
        pickrRef.current = pickrInstance;
      } else {
        pickrInstance.destroy();
      }
    } catch (error) {
      console.warn('Pickr initialization failed, using fallback');
    }
  };

  initPickr();

  return () => {
    mounted = false;
    if (pickrRef.current) {
      try {
        pickrRef.current.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
      pickrRef.current = null;
    }
  };
}, [isMobile, theme.palette.mode, validateSelection, applyColorToSelection]);
```

### 6. Enhanced Color Application Logic

```typescript
const applyColorToSelection = useCallback((colorHex: string): void => {
  const selection = getSelectedText();
  if (!selection.text) return;

  const beforeText = text.substring(0, selection.start);
  const afterText = text.substring(selection.end);
  
  // Check if already formatted
  const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
  const match = selection.text.match(colorFormatRegex);
  
  const newColoredText = match 
    ? `|c${colorHex}${match[1]}|r`  // Replace existing color
    : `|c${colorHex}${selection.text}|r`;  // Add new color
  
  const newText = beforeText + newColoredText + afterText;
  setText(newText);
  saveToHistory(newText);

  // Restore selection
  setTimeout(() => {
    if (textAreaRef.current) {
      const newStart = selection.start;
      const newEnd = newStart + newColoredText.length;
      textAreaRef.current.setSelectionRange(newStart, newEnd);
      textAreaRef.current.focus();
    }
  }, 0);
}, [text, getSelectedText, saveToHistory]);
```

## Implementation Steps

1. **Replace device detection logic** with the simplified version
2. **Add native color picker setup** for mobile devices
3. **Implement unified color picker handler** that works for both mobile and desktop
4. **Enhance Pickr initialization** with better error handling and cleanup
5. **Add selection validation** before applying colors
6. **Improve color application logic** to handle existing formatting
7. **Add proper event cleanup** to prevent memory leaks
8. **Test on both mobile and desktop** devices

## Expected Behavior

- **Mobile devices**: Tap 🎨 emoji → Native color picker opens → Select color → Applied to selected text
- **Desktop devices**: Click 🎨 emoji → Pickr color picker opens → Select color → Applied to selected text
- **Fallback**: If Pickr fails on desktop, falls back to native color picker
- **Validation**: Shows alert if no text is selected
- **Feedback**: Selected text remains highlighted after color application

## Files to Modify

1. `src/components/TextEditor.tsx` - Main component with all the fixes
2. Update imports if needed for better typing
3. Test thoroughly on mobile devices (iOS Safari, Android Chrome)
4. Test on desktop browsers (Chrome, Firefox, Safari)

This implementation will provide a robust, cross-platform color picker that gracefully handles device differences and provides consistent user experience.