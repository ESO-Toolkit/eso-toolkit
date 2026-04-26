# Loadout Manager Compact Layout Wireframe (v2)

_Last updated: 2025-11-13_

## Why the Previous Wireframe Missed the Goal
- Two-column editor + library consumed excess width and vertical space compared to the narrow in-game list.
- Card-based subsections forced scrolling for every loadout detail, while Wizard's Wardrobe exposes all essentials inside each row.
- Actions were scattered across top and footer areas instead of living inside every loadout tile for quick muscle-memory use.
- Skill, gear, and Champion Point summaries were hidden behind secondary views, reducing at-a-glance comparison.

## Target Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Title Bar                                                        │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ ┌───────────────┐ │
│ │ Back to Logs │ │ Wizard Icon  │ │ Title   │ │ Quick Actions │ │
│ └──────────────┘ └──────────────┘ └─────────┘ └───────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Filter Band                                                       │
│ ┌──────────────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│ │ Character Pills (scroll) │ │ Category Menu │ │ Search Field │ │
│ └──────────────────────────┘ └────────────────┘ └──────────────┘ │
│ Sticky secondary buttons: Import • New • Duplicate               │
├─────────────────────────────────────────────────────────────────┤
│ Loadout List (virtualized, single column)                        │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │▲ Section Header: General ▾  (collapsible)                    │ │
│ │├────────────────────────────────────────────────────────────┤ │
│ ││ # │ Name / Tags  │ Front Bar 6 slots │ Back Bar 6 slots    │ │
│ ││   │ (two-line)   │ (32px icons)      │ (32px icons)        │ │
│ ││   │              │ CP Chips │ Gear Chips │ Utility Icons   │ │
│ ││   │              │ [action column: enable, equip, edit…]   │ │
│ │├────────────────────────────────────────────────────────────┤ │
│ ││ Re-order handle  │ Expand caret  │ Last edit timestamp     │ │
│ └┴────────────────────────────────────────────────────────────┘ │
│ … repeats for each setup …                                       │
├─────────────────────────────────────────────────────────────────┤
│ Details Drawer (slides from right on expand)                     │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Tabs: Overview | Gear | Champion Points | Notes              │ │
│ │ Compact forms surfaced inline; takes 40% width on desktop.  │ │
│ │ Mobile: details overlay full screen with swipe-to-close.    │ │
│ └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Key Layout Decisions
- **Single Column Focus**: The primary list is capped at 480–520px width to emulate the in-game footprint; the page centers this column on large displays.
- **Row Density Matching Add-on**: Each loadout row is 84px tall, showing 6 ability icons per bar (32px), CP/gear badges (24px), and action glyphs in a tight right column.
- **Embedded Actions**: Equip, disable, edit, reorder, and delete icons live inside a 4-icon action rail on the far right, mirroring the screenshot.
- **Collapsible Sections**: Loadouts group by category (e.g., General, Trials). Only one category expanded by default to reduce scroll.
- **Detail Drawer**: Selecting the row slides in an editor drawer, keeping the main list visible so users maintain context. Drawer slides over the right margin instead of reshaping the list.

## Component Breakdown

1. **Title Bar**
   - `BackButton`, branding glyph, text title `Wizard's Wardrobe`, and compact action chip row (`Sync`, `Settings`).
   - Height 48px; sticky with subtle shadow.

2. **Filter Band**
   - Character pills horizontally scrollable; use `ScrollButtons` to avoid wrapping.
   - Category dropdown defaults to "General"; supports filtering by raid/trial tags.
   - Search field with debounce to filter loadout names/notes.
   - Secondary actions (Import Lua, New Setup, Duplicate) align right, condensed into icon buttons ≥sm.

3. **Loadout Row Template**
   - **Left Stack**: numeric slot indicator, loadout label (e.g., `SPC/PP`), secondary tag row (role icons, status chip, timestamp).
   - **Middle Bars**: front and back ability strips; highlight ultimate slot with thin border. Empty slots show faded placeholder.
   - **Summary Chips**: champion discipline icons (Warfare, Fitness, Craft) with slotted star counts; mini gear badges for mythic, monster set, food buff.
   - **Action Rail**: 5 vertically stacked icon buttons: equip, edit, copy, duplicate, delete. Hover reveals tooltip; last two collapse behind kebab on xs.
   - Chevron expand button anchored left of the rail to open the drawer.

4. **Details Drawer**
   - Desktop width 520px; mobile full width overlay.
   - Contains tabbed mini-editor: Overview shows editable name, notes, toggles; Gear and CP tabs reuse existing editors but condensed (two-column grids with 28px icon size).
   - Primary actions (`Save`, `Cancel`, `Equip Now`) pinned to drawer footer.

## Responsiveness & Behavior
- ≥lg: page centers the narrow list with 24px gutters; drawer appears as side panel.
- md: list stretches to 100% width of container minus 16px padding; drawer still slides over but covers 70% width.
- ≤sm: action rail collapses into inline toolbar beneath ability bars; details drawer takes full screen with top-close bar.
- Virtualization ensures smooth scroll for large collections (>100 setups).
- Keyboard support: arrow keys move between rows, `Enter` toggles expand, shortcut keys for equip/duplicate.

## Implementation Notes
- Introduce `CompactLoadoutRow` component with slots for ability strips, summary chips, and action rail.
- Reuse existing ability icon renderer but add 32px variant with tighter padding.
- Use `react-window` or existing virtualization helper to render rows efficiently.
- Details drawer can reuse `LoadoutEditor` but pass prop to switch into compact mode (smaller icon size, condensed layout).
- Add unit tests to confirm virtualization windowing and action callbacks; snapshot row layout for regression.

## Outstanding Questions
- Should gear summary chips display individual slot icons or color-coded abbreviations (e.g., `MA`, `PA`)?
- Do we surface role icons (tank/heal/dd) in the label row or reserve for tags?
- Is equip confirmation required when switching roles mid-combat?
