# Complete React-Colorful Integration with Apply Button - Claude Code Prompt

## Objective
Replace the existing React Color implementation in TextEditor.tsx with react-colorful, featuring a modern hex-only color picker with apply/cancel functionality that matches the site's Material UI theme in both light and dark modes.

## Requirements

### Core Functionality
- **Hex-only color picker** using react-colorful's HexColorPicker
- **Apply/Cancel buttons** - only commit changes when user clicks Apply
- **Live preview** in the preview area while user selects colors
- **Hex input field** for manual color entry
- **Theme integration** - automatically adapts to Material UI light/dark mode
- **Mobile responsive** - works on all screen sizes
- **Selection highlighting** - visual feedback showing which text is being colored

### Visual Design Requirements
- **Modern aesthetic** matching the existing TextEditor component design
- **Consistent with Material UI theme** (colors, typography, spacing)
- **Backdrop blur effects** similar to existing UI components
- **Smooth animations** and transitions
- **Professional appearance** with proper shadows and borders
- **ESO game theme colors** in preset swatches

## Current Implementation Context

### Existing Component Structure
The TextEditor.tsx component currently has:
- Material UI theme integration with `useTheme()`
- Custom styled components using `styled()` from '@mui/material/styles'
- CSS variables bridged from Material UI theme in `texteditor-theme-bridge.css`
- Desktop and mobile responsive layouts
- Color picker triggered by emoji button (🎨)

### Current State Management
The component currently uses these states that should be maintained/adapted:
- `text` - main text content
- `charCount` - character counter
- `textAreaRef` - reference to textarea element
- `debouncedSaveHistory` - for undo/redo functionality

### Existing Color Logic
Current color application format:
- ESO/WoW format: `|cFFFF00text|r` where `FFFF00` is the hex color
- Preview area renders this format as HTML: `<span style="color: #FFFF00">text</span>`

## Implementation Instructions

### Step 1: Package Installation
```bash
npm install react-colorful
npm install --save-dev @types/react-colorful
npm uninstall react-color @types/react-color
```

### Step 2: Import Replacement
Replace existing react-color imports with:
```typescript
import { HexColorPicker, HexColorInput } from 'react-colorful';
```

### Step 3: State Management
Create these states for the new color picker:
```typescript
const [showColorPicker, setShowColorPicker] = useState(false);
const [selectedTextInfo, setSelectedTextInfo] = useState<{
  start: number;
  end: number;
  text: string;
  originalText: string;
} | null>(null);
const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
const [previewColor, setPreviewColor] = useState<string>('#ffffff');
const [isPreviewMode, setIsPreviewMode] = useState(false);
```

### Step 4: Core Functions Required

#### Live Preview Function
Create a function that generates preview text with the selected color without modifying the actual text state.

#### Apply Color Function
Apply the selected color to the actual text and update history.

#### Cancel Function
Restore original text and close picker.

#### Open Color Picker Function
Save current selection, position the picker, and enter preview mode.

### Step 5: UI Component Design Specifications

#### Color Picker Container
- **Position**: Fixed positioning, smart viewport edge detection
- **Background**: Material UI `theme.palette.background.paper`
- **Border**: `1px solid theme.palette.divider`
- **Border radius**: 12px to match existing components
- **Shadow**: Dynamic based on theme mode
  - Dark mode: `0 12px 48px rgba(0, 0, 0, 0.7)`
  - Light mode: `0 12px 48px rgba(0, 0, 0, 0.2)`
- **Backdrop filter**: `blur(12px) saturate(180%)` matching existing components
- **Min width**: 280px
- **Max width**: 320px

#### Header Section
- **Background**: Subtle background tint using `rgba(255, 255, 255, 0.02)` for dark mode
- **Typography**: Material UI `subtitle2` for title, `caption` for selected text preview
- **Padding**: 16px
- **Border bottom**: `1px solid theme.palette.divider`
- **Selected text preview**: Show first 30 characters with monospace font

#### Color Picker Section
- **HexColorPicker**: Full width, minimum 200px height
- **Custom styling**: Remove default borders and backgrounds, integrate with theme
- **HexColorInput**: 
  - Background: `theme.palette.background.default`
  - Color: `theme.palette.text.primary`
  - Border: `1px solid theme.palette.divider`
  - Font family: Material UI theme font
  - Placeholder: "Enter hex color"

#### Preset Colors Section
- **Colors**: ESO-themed color palette
  - Primary ESO colors: #FFFF00, #00FF00, #FF0000, #0080FF, #FF8000, #FF00FF
  - Neutral colors: #FFFFFF, #CCCCCC, #999999, #666666, #333333, #000000
  - Additional: #FFD700, #FF4500, #FFA500, #32CD32, #8A2BE2
- **Layout**: Grid with 6 colors per row
- **Styling**: 24px squares with 2px border, hover effects

#### Action Buttons Section
- **Background**: Matching header background tint
- **Layout**: Flexbox with space-between
- **Left side**: Current color indicator with hex value
- **Right side**: Cancel and Apply buttons
- **Cancel button**: Material UI outlined variant
- **Apply button**: Material UI contained variant, disabled when no color selected
- **Styling**: Match existing button styles in the component

#### Backdrop
- **Position**: Fixed fullscreen
- **Background**: `rgba(0, 0, 0, 0.4)`
- **Click behavior**: Close picker and cancel changes
- **Z-index**: 999998 (below picker)

### Step 6: Integration Points

#### Emoji Button Updates
Update both desktop and mobile emoji buttons to trigger the new color picker with proper event handling for positioning.

#### Preview Area Integration  
Modify the `renderPreview` function to show live color changes during preview mode without affecting the actual text.

#### Selection Highlighting
Add visual feedback to the textarea during color selection (border and background tint).

### Step 7: Responsive Behavior

#### Mobile Adaptations
- **Full width on mobile**: Max width 100vw - 20px
- **Position adjustment**: Always keep 10px from screen edges
- **Touch-friendly**: Minimum 44px touch targets
- **Simplified layout**: Stack elements vertically on small screens

#### Desktop Behavior
- **Smart positioning**: Position relative to emoji button
- **Viewport bounds**: Never position off-screen
- **Keyboard support**: Escape to close, Enter to apply

### Step 8: Animation and Transitions

#### Entrance Animation
- **Scale in**: Transform from 0.95 to 1.0
- **Opacity**: Fade in from 0 to 1
- **Duration**: 200ms ease-out

#### Color Transitions
- **Preview updates**: Smooth color transitions in preview area
- **Button states**: Smooth disabled/enabled transitions

### Step 9: Accessibility Requirements

#### ARIA Labels
- Color picker: "Choose text color"
- Hex input: "Enter hex color value"
- Apply button: "Apply selected color"
- Cancel button: "Cancel color selection"

#### Keyboard Navigation
- **Tab order**: Picker → Hex input → Preset colors → Cancel → Apply
- **Escape key**: Close and cancel
- **Enter key**: Apply selected color

### Step 10: Error Handling

#### Invalid Hex Input
- Validate hex input format
- Show error state for invalid values
- Prevent apply when invalid

#### Selection Validation
- Ensure text is selected before opening picker
- Handle empty selection gracefully
- Maintain selection state during preview

## Expected File Changes

### Primary Files
- `src/components/TextEditor.tsx` - Main implementation
- `src/styles/texteditor-theme-bridge.css` - Additional CSS variables if needed

### Testing Requirements
- **Light/Dark mode switching** - Verify theme adaptation
- **Mobile responsive** - Test on various screen sizes  
- **Apply/Cancel functionality** - Verify state management
- **Live preview** - Confirm preview updates without affecting actual text
- **Keyboard navigation** - Test all accessibility features

## Success Criteria

The implementation is successful when:
1. ✅ Color picker opens with modern, themed appearance
2. ✅ Live preview shows in preview area while selecting colors
3. ✅ Apply button commits changes, Cancel button reverts
4. ✅ Hex input field allows manual color entry
5. ✅ Works perfectly in both light and dark themes
6. ✅ Responsive design works on all screen sizes
7. ✅ Visual feedback shows selected text during color picking
8. ✅ Smooth animations and professional appearance
9. ✅ No bundle size increase (react-colorful is smaller than react-color)
10. ✅ Maintains existing undo/redo functionality

Please implement this complete solution, ensuring all styling matches the existing component's modern aesthetic and Material UI integration.