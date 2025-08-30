# ESO Log Aggregator - UI Components

## BossAvatar Component

The `BossAvatar` component provides a standardized way to display boss avatars from Elder Scrolls Online trials and dungeons throughout the application.

### Features

- **Comprehensive Boss Coverage**: Includes avatars for all major trial and dungeon bosses
- **Alias Support**: Handles multiple name variations for the same boss (e.g., "Lord Falgravn" vs "Falgravn")
- **Instance Number Handling**: Automatically strips instance numbers (e.g., "Z'maja #1" → "Z'maja")
- **Material-UI Integration**: Built on MUI's Avatar component with consistent styling
- **TypeScript Support**: Full type safety with proper interfaces

### Usage

```tsx
import { BossAvatar } from '../features/report_details/BossAvatar';

// Basic usage
<BossAvatar bossName="Z'maja" size={64} />

// With custom styling
<BossAvatar
  bossName="Rakkhat"
  size={48}
  sx={{ border: '2px solid gold' }}
/>

// Handles aliases and variations
<BossAvatar bossName="Saint Olms the Just" />  // Same as...
<BossAvatar bossName="Saint Olms" />           // ...this

// Strips instance numbers automatically
<BossAvatar bossName="Z'maja #1" />  // Displays Z'maja avatar
```

### Props

| Prop       | Type             | Default | Description                     |
| ---------- | ---------------- | ------- | ------------------------------- |
| `bossName` | `string`         | -       | Name of the boss (required)     |
| `size`     | `number`         | `32`    | Avatar size in pixels           |
| `sx`       | `SxProps<Theme>` | `{}`    | Material-UI sx prop for styling |

### Supported Bosses

The component supports bosses from all major ESO trials:

- **Kyne's Aegis**: Lord Falgravn, Captain Vrol, Yandir the Butcher
- **Rockgrove**: Oaxiltso, Basks-in-Snakes, Xalvakka, Ash Titan, Flame-Herald Bahsei
- **Cloudrest**: Shade of Galenwe, Shade of Relequen, Shade of Siroria, Z'maja
- **Dreadsail Reef**: Bow Breaker, Lylanar and Turlassil, Reef Guardian, Sail Ripper, Tideborn Taleria
- **Halls of Fabrication**: Hunter-Killer Fabricant, Pinnacle Factotum, Archcustodian, Assembly General
- **Lucent Citadel**: Cavot Agnan, Dariel Lemonds, Xoryn, Zilyseet, Orphic Shattered Shard
- **Asylum Sanctorium**: Saint Felms the Bold, Saint Llothis the Pious, Saint Olms the Just
- **Sanctum Ophidia**: Ozara, Possessed Manticora, Stonebreaker, The Serpent
- **Maw of Lorkhaj**: Zhaj'hassa the Forgotten, Rakkhat, The Twins
- **Hel Ra Citadel**: Ra Kotu, The Warrior, The Yokedas
- **Aetherian Archive**: Foundation Stone Atronach, Lightning Storm Atronach, The Mage, Varlariel
- **Ossein Cage**: Blood Drinker Thisa, Hall of Fleshcraft, Jynorah and Skorkhif, Overfiend Kazpian, Red Witch Gedna Relvel, Tortured Ranyu

### API Reference

#### `getBossAvatarSrc(bossName: string): string | null`

Utility function that returns the avatar image source for a given boss name, or `null` if not found.

```tsx
import { getBossAvatarSrc } from '../features/report_details/BossAvatar';

const avatarSrc = getBossAvatarSrc("Z'maja");
if (avatarSrc) {
  // Boss has an avatar
}
```

---

## ClassIcon Component

The `ClassIcon` component provides a standardized way to display ESO class icons throughout the application.

### Features

- **All ESO Classes**: Supports all 7 current ESO classes
- **Case Insensitive**: Handles different case variations automatically
- **Customizable Styling**: Flexible styling options with sensible defaults
- **Lightweight**: Simple img element with optimized ES module imports
- **TypeScript Support**: Full type safety with proper interfaces

### Usage

```tsx
import { ClassIcon } from '../components/ClassIcon';

// Basic usage
<ClassIcon className="dragonknight" size={24} />

// Small icon for inline use
<ClassIcon className="templar" size={12} />

// Custom styling
<ClassIcon
  className="sorcerer"
  size={32}
  style={{
    border: '1px solid gold',
    borderRadius: '4px'
  }}
/>

// Custom alt text
<ClassIcon
  className="nightblade"
  size={16}
  alt="Nightblade Class Icon"
/>
```

### Props

| Prop        | Type                  | Default                           | Description                |
| ----------- | --------------------- | --------------------------------- | -------------------------- |
| `className` | `string`              | -                                 | ESO class name (required)  |
| `size`      | `number`              | `12`                              | Icon size in pixels        |
| `alt`       | `string`              | `className`                       | Alt text for accessibility |
| `style`     | `React.CSSProperties` | `{ opacity: 0.8, flexShrink: 0 }` | CSS styles                 |

### Supported Classes

- **Dragonknight**: Tank and DPS class with fire-based abilities
- **Templar**: Healing and support class with light-based magic
- **Warden**: Nature-based class with frost and animal abilities
- **Nightblade**: Stealth and assassination class with shadow magic
- **Sorcerer**: Magical DPS class with lightning and daedric summoning
- **Necromancer**: Death magic class with corpse-based abilities
- **Arcanist**: Cosmic magic class with Crux and rune abilities

### API Reference

#### `getClassIconSrc(className: string): string | null`

Utility function that returns the icon image source for a given class name, or `null` if not found.

```tsx
import { getClassIconSrc } from '../components/ClassIcon';

const iconSrc = getClassIconSrc('dragonknight');
if (iconSrc) {
  // Class has an icon
}
```

### Case Handling

The component automatically handles different case variations:

```tsx
// All of these work the same way:
<ClassIcon className="dragonknight" />
<ClassIcon className="Dragonknight" />
<ClassIcon className="DRAGONKNIGHT" />
<ClassIcon className="DragonKnight" />
```

---

## Development

### Asset Management

Both components use Vite's ES module imports for optimal bundling:

```tsx
// Proper ES module imports
import dkIcon from '@/assets/Class Icons/dragonknight.png';
import zmajaAvatar from "@/assets/Cloudrest/Boss Avatars/z'maja.png";
```

This approach ensures:

- **Tree shaking**: Unused assets aren't included in the bundle
- **Type safety**: TypeScript knows these are string URLs
- **Build optimization**: Vite can optimize and hash asset filenames
- **Development efficiency**: Hot reloading works correctly

### Testing

Both components have comprehensive test suites covering:

- **Functionality**: Core component behavior and edge cases
- **Props**: All prop combinations and default values
- **Accessibility**: Screen reader compatibility and ARIA attributes
- **Coverage**: All supported bosses/classes are tested
- **API**: Utility functions are thoroughly tested

Run tests with:

```bash
npm test BossAvatar.test.tsx
npm test ClassIcon.test.tsx
```

### Storybook

Interactive Storybook stories are available for both components:

```bash
npm run storybook
```

Stories include:

- **Basic Examples**: Default usage patterns
- **Size Variations**: Different size demonstrations
- **Edge Cases**: Error handling and boundary conditions
- **Styling Examples**: Custom styling demonstrations
- **Complete Showcases**: All available options displayed

### Performance Considerations

- **Lazy Loading**: Assets are only loaded when components are used
- **Memoization**: Consider wrapping in `React.memo()` for lists with many icons
- **Bundle Size**: ES module imports ensure optimal tree shaking
- **Caching**: Browser caching works effectively with hashed asset names

### Migration Notes

These components replace the previous inline asset handling approach:

#### Before:

```tsx
// Old approach - dynamic imports, large mapping objects
const CLASS_ICON_MAP = {
  dragonknight: '/assets/dk-white.png',
  templar: '/assets/templar.png',
  // ...50+ more imports
};

<img src={CLASS_ICON_MAP[className]} width={12} height={12} />;
```

#### After:

```tsx
// New approach - clean component API
<ClassIcon className={className} size={12} />
```

### Contributing

When adding new bosses or classes:

1. **Add Asset**: Place the image file in the appropriate assets directory
2. **Import Asset**: Add ES module import at the top of the component file
3. **Update Mapping**: Add the mapping in the component's lookup object
4. **Add Aliases**: Include any common name variations
5. **Update Tests**: Add test cases for the new additions
6. **Update Stories**: Include in the Storybook demonstrations

### Best Practices

- **Consistent Sizing**: Use standard sizes (12px for inline, 24px for lists, 48px+ for featured)
- **Accessible Alt Text**: Provide meaningful alt text for screen readers
- **Performance**: Use React.memo() for components that render many icons
- **Styling**: Prefer the `sx` prop for Material-UI integration when available
