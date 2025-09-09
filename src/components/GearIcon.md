# GearIcon Component

The `GearIcon` component displays ESO (Elder Scrolls Online) gear/equipment icons with optional quality borders, tooltips, and interaction capabilities.

## Features

- **Quality-based styling**: Colored borders based on gear rarity (normal, fine, superior, epic, legendary, mythic)
- **Flexible sizing**: Configurable icon size in pixels
- **Tooltips**: Optional tooltips with custom content
- **Click handling**: Support for click events with hover effects
- **Rounded/Square styling**: Configurable border radius
- **Error handling**: Graceful fallback when icon URLs fail to load

## Basic Usage

```tsx
import { GearIcon } from '../components/GearIcon';

// Basic gear icon
<GearIcon gearId="12345" />

// With quality and size
<GearIcon
  gearId="12345"
  size={48}
  quality="epic"
/>

// With tooltip
<GearIcon
  gearId="12345"
  showTooltip
  tooltipContent="Epic Sword of Power"
/>

// Clickable
<GearIcon
  gearId="12345"
  onClick={(e) => console.log('Gear clicked!')}
/>
```

## Props

| Prop               | Type                  | Default           | Description                                                   |
| ------------------ | --------------------- | ----------------- | ------------------------------------------------------------- |
| `gearId`           | `number \| string`    | -                 | **Required.** The gear item ID used to construct the icon URL |
| `alt`              | `string`              | `"Gear {gearId}"` | Alt text for the icon                                         |
| `size`             | `number`              | `32`              | Size of the icon in pixels                                    |
| `className`        | `string`              | -                 | Additional CSS classes                                        |
| `style`            | `React.CSSProperties` | -                 | Additional inline styles                                      |
| `showTooltip`      | `boolean`             | `false`           | Whether to show a tooltip                                     |
| `tooltipContent`   | `React.ReactNode`     | -                 | Custom tooltip content                                        |
| `tooltipPlacement` | `string`              | `"top"`           | Tooltip placement position                                    |
| `quality`          | `Quality`             | `"normal"`        | Quality/rarity for border styling                             |
| `rounded`          | `boolean`             | `true`            | Whether the icon should be rounded                            |
| `onClick`          | `function`            | -                 | Click event handler                                           |

## Quality Types

- `normal` - White border (no border)
- `fine` - Green border
- `superior` - Blue border
- `epic` - Purple border
- `legendary` - Gold border
- `mythic` - Orange border

## Examples

### Different Qualities

```tsx
<GearIcon gearId="12345" quality="normal" />
<GearIcon gearId="12345" quality="fine" />
<GearIcon gearId="12345" quality="superior" />
<GearIcon gearId="12345" quality="epic" />
<GearIcon gearId="12345" quality="legendary" />
<GearIcon gearId="12345" quality="mythic" />
```

### With Rich Tooltip

```tsx
<GearIcon
  gearId="12345"
  quality="legendary"
  showTooltip
  tooltipContent={
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" color="primary">
        Legendary Sword
      </Typography>
      <Typography variant="body2">A powerful weapon forged in ancient times</Typography>
      <Typography variant="caption" color="text.secondary">
        Item Level: 160 | Set: Ancient Power
      </Typography>
    </Box>
  }
/>
```

### Interactive Grid

```tsx
const gearItems = [
  { id: '12345', quality: 'legendary', name: 'Sword' },
  { id: '23456', quality: 'epic', name: 'Shield' },
  { id: '34567', quality: 'superior', name: 'Armor' },
];

<Box sx={{ display: 'flex', gap: 1 }}>
  {gearItems.map((item) => (
    <GearIcon
      key={item.id}
      gearId={item.id}
      quality={item.quality}
      size={48}
      onClick={() => handleGearClick(item)}
      showTooltip
      tooltipContent={item.name}
    />
  ))}
</Box>;
```

## Storybook

To view all the component variations and interact with them, run Storybook:

```bash
npm run storybook
```

Navigate to **Components > GearIcon** to see all the examples and play with the component props.
