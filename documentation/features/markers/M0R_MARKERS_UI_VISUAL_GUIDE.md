# M0R Markers Import UI - Visual Guide

## UI Layout

### Collapsed State (Default)
```
┌────────────────────────────────────────────────────────────────┐
│ Fight Replay - 3D View                                         │
│ vAS - Olms HM - Duration: 420s                                 │
├────────────────────────────────────────────────────────────────┤
│  M0R Markers Import                                         ▼  │
│  Paste a M0RMarkers string to display markers in the arena    │
└────────────────────────────────────────────────────────────────┘
│                                                                │
│                    [3D Arena View]                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Expanded State (After Click)
```
┌────────────────────────────────────────────────────────────────┐
│ Fight Replay - 3D View                                         │
│ vAS - Olms HM - Duration: 420s                                 │
├────────────────────────────────────────────────────────────────┤
│  M0R Markers Import                                         ▲  │
│  Paste a M0RMarkers string • 384 characters loaded            │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ M0RMarkers String                                        │ │
│  │ <1000]0]63360:75410:61450]1A,1A...]                      │ │
│  │                                                          │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│  384 characters ready to load                                  │
│                                                                │
│  [ Load Markers ]  [ Clear ]  ✓ Markers loaded in arena       │
└────────────────────────────────────────────────────────────────┘
│                                                                │
│                    [3D Arena View]                             │
│                  [With Markers Visible]                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
FightReplay
├── Typography (Title: "Fight Replay - 3D View")
├── Typography (Fight Info)
├── Paper (M0R Markers Import Panel)
│   ├── Box (Header - Clickable)
│   │   ├── Box
│   │   │   ├── Typography (Title: "M0R Markers Import")
│   │   │   └── Typography (Subtitle with character count if loaded)
│   │   └── IconButton (ExpandMore/ExpandLess)
│   └── Collapse (Expandable Content)
│       └── Box (Padding Container)
│           ├── TextField (Multi-line input)
│           │   ├── Label: "M0RMarkers String"
│           │   ├── Placeholder: "Paste M0RMarkers encoded string..."
│           │   └── HelperText: Character count or format hint
│           └── Box (Action Buttons)
│               ├── Button ("Load Markers" - primary, disabled when empty)
│               ├── Button ("Clear" - secondary, disabled when empty)
│               └── Typography (Success indicator - conditional)
└── FightReplay3D (prop: morMarkersString)
    └── ...arena rendering...
```

## Styling Details

### Paper Component
- **Elevation**: 1 (subtle shadow)
- **Margin Bottom**: 2 spacing units
- **Overflow**: Hidden (for smooth collapse animation)

### Header Box
- **Padding**: 2 spacing units
- **Display**: Flex (space-between for icon placement)
- **Cursor**: Pointer (indicates clickability)
- **Hover**: Background color changes to action.hover

### Typography
- **Title**: variant="subtitle1", fontWeight="medium"
- **Subtitle**: variant="caption", color="text.secondary"

### TextField
- **Full Width**: Takes entire panel width
- **Multiline**: 3 rows
- **Variant**: Outlined (standard Material-UI border)
- **Font**: Monospace for encoded strings
- **Font Size**: 0.875rem (smaller for data density)

### Helper Text
- **Dynamic**: Shows character count when populated
- **Format Guide**: Shows format example when empty
- **Color**: text.secondary (gray)

## Interaction Flow

1. **Initial Load**
   - Panel collapsed by default
   - No performance impact on arena

2. **User Clicks Header**
   - Panel expands smoothly (Collapse animation)
   - TextField becomes visible
   - Focus automatically moves to input (optional enhancement)

3. **User Pastes String**
   - Real-time state update (onChange)
   - Character count updates immediately
   - String passed to FightReplay3D

4. **Arena Updates**
   - MorMarkers component receives new string
   - useMemo triggers decode
   - Markers render in 3D scene

5. **User Clicks Header Again**
   - Panel collapses
   - String remains in state (markers stay visible)
   - Clean UI with more screen space for arena

## Accessibility

### Keyboard Navigation
- Tab: Focus on header
- Enter/Space: Toggle expand/collapse
- Tab: Focus on TextField when expanded

### Screen Readers
- Header announces "M0R Markers Import" as clickable
- TextField has proper label association
- Helper text provides additional context
- IconButton has accessible name (expand/collapse)

## Color Palette

### Light Theme
- **Background**: Paper background (white/light gray)
- **Text**: Primary text (dark gray/black)
- **Secondary**: text.secondary (medium gray)
- **Hover**: action.hover (light blue/gray)
- **Border**: divider color (light gray)

### Dark Theme
- **Background**: Paper background (dark gray)
- **Text**: Primary text (white/light gray)
- **Secondary**: text.secondary (medium gray)
- **Hover**: action.hover (lighter dark gray)
- **Border**: divider color (dark gray)

## Responsive Behavior

### Desktop (>1200px)
- Full width panel
- 3 rows for TextField
- Comfortable padding

### Tablet (768px - 1200px)
- Full width panel
- 3 rows for TextField
- Slightly reduced padding

### Mobile (<768px)
- Full width panel
- May increase to 4-5 rows for better mobile input
- Touch-optimized click targets
- Virtual keyboard friendly

## Animation Details

### Collapse Transition
- **Duration**: ~300ms (Material-UI default)
- **Easing**: ease-in-out
- **Property**: height (smooth vertical expansion)

### Icon Rotation
- **Change**: ExpandMore ↔ ExpandLess
- **Instant**: No rotation animation
- **Clear**: Visual indicator of state

### Hover Effect
- **Duration**: ~200ms
- **Property**: background-color
- **Subtle**: Doesn't distract from content

## Size Reference

### Collapsed Height
- ~80px (header only, 2 text lines + padding)

### Expanded Height
- ~200px (header + 3-row textarea + helper text)

### Character Limit
- No hard limit enforced
- Typical strings: 200-500 characters
- Large presets: up to 2000+ characters
- TextField scrolls automatically if needed
