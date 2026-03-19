---
name: ui-updates
description: Make UI changes that stay visually consistent with the modern glassmorphism design system. Use this when creating or updating React components, styling, layouts, or visual elements to ensure they match the application's theme, color palette, typography, and interaction patterns.
---

You are making UI changes to the ESO Log Aggregator application. Every component, style, and visual element you create or modify **must** match the established design system documented below. Do not invent new patterns — follow what already exists.

---

## Design System Overview

The app uses a **modern glassmorphism** aesthetic — blurred translucent panels, gradient overlays, subtle inset highlights, and smooth transitions. It is **not** fantasy/game-themed. The look is clean, tech-oriented, and polished.

**Stack**: React 19+, MUI v7, Emotion (`styled()` + `sx`), Chart.js via `react-chartjs-2`.

---

## Theme Source

The theme is defined in `src/ReduxThemeProvider.tsx` (~943 lines). It uses `createTheme()` inside a `useMemo` that depends on `darkMode` and a dynamic `tokens` object. **Always read this file** before making significant styling changes — it is the single source of truth.

Dark mode state is managed via Redux (`uiSlice.darkMode`) and persisted to `localStorage` key `eso-logs-dark-mode`.

---

## Color Palette (Design Tokens)

Use these exact token values. They are also exposed as CSS custom properties (`--bg`, `--panel`, `--text`, `--accent`, etc.) via `GlobalStyles`.

| Token    | Dark Mode   | Light Mode  | Usage                        |
|----------|-------------|-------------|------------------------------|
| `bg`     | `#0b1220`   | `#f8fafc`   | Page background              |
| `panel`  | `#0f172a`   | `#ffffff`   | Card/Paper background        |
| `panel2` | `#0d1430`   | `#f8fafc`   | Secondary panel background   |
| `text`   | `#e5e7eb`   | `#1e293b`   | Primary text                 |
| `muted`  | `#94a3b8`   | `#64748b`   | Secondary/caption text       |
| `accent` | `#38bdf8`   | `#0f172a`   | Primary accent (sky blue)    |
| `accent2`| `#00e1ff`   | `#1e293b`   | Secondary accent (cyan)      |
| `ok`     | `#22c55e`   | `#059669`   | Success states               |
| `warn`   | `#ff9800`   | `#f97316`   | Warning states               |
| `danger` | `#ef4444`   | `#dc2626`   | Error/danger states          |
| `border` | `#1f2937`   | `#bcd9ff`   | Borders and dividers         |

### Role Colors

Defined in `src/utils/roleColors.ts`. Use `useRoleColors()` hook to access them — never hardcode role colors.

| Role   | Dark       | Light (solid) | Light (gradient)                                    |
|--------|------------|---------------|-----------------------------------------------------|
| DPS    | `#ff8b61`  | `#ff5722`     | `linear-gradient(135deg, #ff9246 36%, #ff3400e6 100%)` |
| Healer | `#b970ff`  | `#7c3aed`     | `linear-gradient(135deg, #9333ea, #c084fc)`           |
| Tank   | `#62baff`  | `#0891b2`     | `linear-gradient(135deg, #0ea5e9, #38bdf8)`           |

### Semantic Colors

- **Success**: `#22c55e` (dark) / `#059669` (light)
- **Warning**: `#ff9800` (dark) / `#f97316` (light)
- **Danger**: `#ef4444` (dark) / `#dc2626` (light)

---

## Typography

| Element       | Font Family                          | Weight | Notes                         |
|---------------|--------------------------------------|--------|-------------------------------|
| Body text     | `Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, 'Helvetica Neue', Arial` | 400 | Default for all body content |
| Headings h1–h6| `Space Grotesk, Inter, system-ui`   | 600    | Used for all headings         |
| Stat numbers  | Same as body                        | —      | Add `fontVariantNumeric: 'tabular-nums'` or className `u-tabular` |

**Do not** use fantasy or game-themed fonts. The design is modern and clean.

---

## Styling Approach (Priority Order)

1. **`styled()` from `@mui/material/styles`** — For complex, reusable styled components:
   ```tsx
   import { styled } from '@mui/material/styles';

   const StyledPanel = styled(Paper)<{ variant?: 'primary' | 'secondary' }>(({ theme, variant }) => ({
     background: theme.palette.mode === 'dark'
       ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
       : theme.palette.background.paper,
     backdropFilter: 'blur(10px)',
     borderRadius: 14,
     border: `1px solid ${theme.palette.divider}`,
     transition: 'all 0.3s ease',
   }));
   ```

2. **`sx` prop** — For one-off or layout styling on MUI components:
   ```tsx
   <Box sx={{ display: 'flex', gap: 2, p: 2, mb: 3 }}>
   <Typography variant="h6" sx={{ fontWeight: 600 }}>
   ```

3. **Theme `components` overrides** — Already set globally in `ReduxThemeProvider.tsx`. Leverage them; don't fight them.

**Never use**: `makeStyles` (legacy), CSS Modules, or plain `.css` files (except for rare third-party bridge cases).

Use `alpha()` from `@mui/material/styles` for semi-transparent colors:
```tsx
import { alpha } from '@mui/material/styles';
backgroundColor: alpha(theme.palette.primary.main, 0.08),
```

---

## Glassmorphism Recipe

This is the defining visual style. Apply it to panels, cards, and elevated surfaces:

```tsx
{
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
    : theme.palette.background.paper,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 14,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 30px rgba(0, 0, 0, 0.25)'
    : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
}
```

### Gradient Patterns

| Context       | Gradient                                                                                   |
|---------------|--------------------------------------------------------------------------------------------|
| Paper/Card    | `linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)`                |
| Button        | `linear-gradient(135deg, ${accent}, ${accent2})`                                           |
| Accordion     | `linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)` |
| MetricPill    | 3-stop `135deg` gradients with `0.25→0.15→0.08` opacity ramps                             |

---

## Border Radius Values

| Element          | Radius |
|------------------|--------|
| Global default   | `10px` (via `shape.borderRadius`) |
| Paper / Card     | `14px` |
| Buttons          | `8px`  |
| Inputs           | `8px`  |
| Accordion        | `12px` |
| Glossy chips     | `28px` |
| Dialog corners   | `24px` (bottom) |

---

## Shadows

| Context         | Dark                                                                                | Light                                                                               |
|-----------------|-------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| Paper/Card      | `0 8px 30px rgba(0, 0, 0, 0.25)`                                                  | `0 4px 12px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.03)`                   |
| Card hover      | `0 10px 40px rgba(0,0,0,0.3), 0 0 60px rgba(56,189,248,0.08)`                     | —                                                                                   |
| Glossy chips    | `0 8px 32px 0 rgba(0,0,0,0.37), inset 0 1px 0 rgba(255,255,255,0.2)`              | —                                                                                   |

---

## Animation & Transitions

### Standard Transitions

| Context                | Duration & Easing                                  |
|------------------------|-----------------------------------------------------|
| Background/color/border| `0.15s ease-in-out`                                 |
| Card/Accordion hover   | `all 0.3s ease`                                     |
| Input focus            | `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`            |
| Tab crossfade          | 150ms fade-out → 50ms pause → fade-in              |
| Page transitions       | 50ms `opacity` ease-out (minimal)                   |

### Hover Effects

- **Lift**: `transform: 'translateY(-2px)'` or `translateY(-3px)`
- **Scale**: `transform: 'scale(1.05)'` or `scale(1.1)` (for small elements)
- **Glow**: `box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25)` (use `.u-hover-glow` class)

### Keyframe Animations

Available inline via `sx` `@keyframes`:
- `float`: `translateY(0) → translateY(-4px)` — 3s ease-in-out infinite
- `spin`: `rotate(0deg) → rotate(360deg)` — 2s linear infinite
- `fadeIn`, `fadeInShimmer`, `pulse` — staggered opacity/transform
- `legendaryGlow` — animated box-shadow pink↔blue shift, 3s

### Utility CSS Classes

| Class           | Effect                                                    |
|-----------------|-----------------------------------------------------------|
| `.u-hover-glow` | Accent glow on hover                                      |
| `.u-focus-ring`  | 2px solid accent outline on `:focus-visible`              |
| `.u-fade-in`     | Opacity fade-in animation                                  |
| `.u-fade-in-up`  | Fade-in with upward slide                                 |
| `.u-hover-lift`  | Translate-Y lift on hover                                 |
| `.u-tabular`     | `fontVariantNumeric: 'tabular-nums'` for stat numbers     |

All animations respect `prefers-reduced-motion: reduce`.

---

## Responsive Design

### Breakpoint Access

**In `sx` props** (preferred for simple cases):
```tsx
sx={{
  px: { xs: 2, sm: 4 },
  display: { xs: 'none', md: 'flex' },
  fontSize: { xs: '1.5rem', md: '2rem' },
}}
```

**In `styled()` components**:
```tsx
[theme.breakpoints.down('sm')]: {
  flexDirection: 'column',
  padding: theme.spacing(1),
},
```

**With `useMediaQuery` hook**:
```tsx
import { useMediaQuery, useTheme } from '@mui/material';

const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
```

### Desktop/Mobile Pattern

Show different layouts per breakpoint using `display`:
```tsx
{/* Desktop only */}
<Box sx={{ display: { xs: 'none', md: 'flex' } }}>...</Box>

{/* Mobile only */}
<Box sx={{ display: { xs: 'flex', md: 'none' } }}>...</Box>
```

---

## Layout Patterns

### App Shell

```tsx
<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
  <HeaderBar />
  <Container maxWidth="md" sx={{ flex: 1 }}>
    <Outlet />
  </Container>
  <Footer />
</Box>
```

### Preferred Layout Components

- **`Box`** with flexbox — dominant layout primitive
- **`Stack`** — for linear arrangements with spacing
- **`Container`** — for max-width page content
- **`Paper`** / **`Card`** — for elevated content panels
- **`Accordion`** — for collapsible sections
- **`Dialog`** — for modals

**`Grid`** is used rarely — prefer flexbox via `Box`.

---

## Common Reusable Components

Always check if one of these existing components fits your need before creating a new one:

| Component              | Location                                  | Purpose                                         |
|------------------------|-------------------------------------------|--------------------------------------------------|
| `MetricPill`           | `src/components/MetricPill.tsx`           | Glassmorphism stat badge (intents: success/warning/danger/info/neutral; variants: solid/outline/mono) |
| `StatChecklist`        | `src/components/StatChecklist.tsx`        | Toggleable checklist card for buff/source tracking |
| `DataGrid`             | `src/components/DataGrid/DataGrid.tsx`    | Full table with `@tanstack/react-table` (sorting, filtering, pagination) |
| `SkillTooltip`         | `src/components/SkillTooltip.tsx`         | ESO skill tooltip card with icon and stats        |
| `GearDetailsPanel`     | `src/components/GearDetailsPanel.tsx`     | Player gear inspection dialog                    |
| `MarketingBadge`       | `src/components/MarketingBadge.tsx`       | Floating gradient badge for marketing text       |
| `OneLineAutoFit`       | `src/components/OneLineAutoFit.tsx`       | Auto-scaling text to fit container width         |
| `AnimatedTabContent`   | `src/components/AnimatedTabContent.tsx`   | Crossfade tab content with perspective transform |
| `ThemeToggle`          | `src/components/ThemeToggle.tsx`          | Dark/light mode toggle button                    |
| `ClassIcon`            | `src/components/ClassIcon.tsx`            | ESO class icon                                   |
| `GearIcon`             | `src/components/GearIcon.tsx`             | Equipment icon                                   |
| `WorkInProgressDisclaimer` | `src/components/WorkInProgressDisclaimer.tsx` | Info alert banner for WIP features          |

---

## Icons

Use **`@mui/icons-material`** exclusively. Import individually for tree-shaking:
```tsx
import { ExpandMore, Refresh, Person, Settings } from '@mui/icons-material';
// OR
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
```

For custom icons, define inline SVG functional components with a `size` prop (see `LandingPage.tsx` for examples).

---

## Import Conventions

**Path aliases available** (prefer relative imports in component code; aliases mainly in tests):
- `@/` → `src/`
- `@components/` → `src/components/`
- `@utils/` → `src/utils/`
- `@store/` → `src/store/`
- `@features/` → `src/features/`
- `@types/` → `src/types/`
- `@graphql/` → `src/graphql/`

**MUI imports**: Both barrel and direct imports are acceptable:
```tsx
import { Box, Typography, Paper } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
```

**No barrel files**: Import components directly by file path.

---

## Hooks for Styling

| Hook                      | Location                              | Returns                                                  |
|---------------------------|---------------------------------------|----------------------------------------------------------|
| `usePersistentDarkMode()` | `src/hooks/usePersistentDarkMode.ts`  | `{ darkMode, toggleDarkMode, setDarkMode, syncWithSystem }` |
| `useRoleColors()`         | `src/hooks/useRoleColors.ts`          | Theme-aware role colors + helpers: `getColor()`, `getPlayerColor()`, `getGradientColor()`, `getTableBackground()`, `getAccordionBackground()`, `getAccordionStyles()`, `getProgressBarBackground()`, `getProgressBarStyles()` |
| `usePageBackground()`     | `src/hooks/usePageBackground.ts`      | Applies full-page background image to `document.body`     |

---

## Chart.js Styling

```tsx
import { Chart as ChartJS, CategoryScale, LinearScale, ... } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, ...);
```

Conventions:
- **Disable animations**: `animation: { duration: 0 }`
- **Interaction**: `interaction: { intersect: false, mode: 'index' }`
- **Container**: `<Box sx={{ width: '100%', height: 300 }}><Line ... /></Box>`
- Annotation lines: dashed, `#2e7d32` green for targets
- Extract callbacks to module-level for performance
- See `src/utils/chartPhaseAnnotationUtils.ts` for annotation patterns

---

## Dark Mode Awareness Checklist

Every component you create or modify **must** work in both dark and light mode:

1. Use `theme.palette.mode === 'dark'` checks in `styled()` and `sx` for mode-specific styles
2. Use `theme.palette.text.primary`, `theme.palette.background.paper`, etc. instead of hardcoded colors
3. Use design tokens via `theme.palette` or CSS custom properties (`var(--accent)`, `var(--panel)`)
4. Test both modes visually — a good dark mode component often looks wrong in light mode if you hardcode dark colors
5. Apply smooth mode transition: `transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out'`

---

## Pre-Implementation Checklist

Before writing any UI code, verify:

- [ ] Read `src/ReduxThemeProvider.tsx` if making theme-level changes
- [ ] Check if an existing reusable component (see table above) already solves the need
- [ ] Check `useRoleColors()` for any role/player-colored elements
- [ ] Ensure the component works in **both** dark and light mode
- [ ] Use responsive `sx` values or `useMediaQuery` for mobile support
- [ ] Respect `prefers-reduced-motion` for any animations
- [ ] Use `styled()` for complex reusable components, `sx` for one-off layout styling
- [ ] Follow the glassmorphism recipe for elevated surfaces
- [ ] Use existing border-radius, shadow, and transition values — don't invent new ones

---

## Anti-Patterns (Do NOT Do)

- ❌ Hardcode colors — always use theme tokens or palette values
- ❌ Use `makeStyles()` or CSS Modules
- ❌ Add new fonts without verifying they match the design system
- ❌ Create new gradient patterns when existing ones fit
- ❌ Forget `WebkitBackdropFilter` alongside `backdropFilter`
- ❌ Use `Grid` when flexbox via `Box` is sufficient
- ❌ Add heavy animations without `prefers-reduced-motion` support
- ❌ Create barrel/index.ts files for component re-exports
- ❌ Hardcode role colors — always use `useRoleColors()` hook
- ❌ Use fantasy/game-themed fonts or textures
