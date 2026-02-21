# Roster Builder Feature

## Overview
The Roster Builder is a tool for raid leads to create, manage, and share raid roster configurations for ESO trials.

## Location
- **Route**: `/roster-builder`
- **Component**: `src/pages/RosterBuilderPage.tsx`
- **Types**: `src/types/roster.ts`

## Features

### Tank Configuration
- **2 Tank slots** with:
  - Player identification (optional name and number)
  - Group assignment (for organizing players into slayer stacks or other groups)
  - Skill line requirements (3 specific lines or "flexible")
  - Body gear set selection (autocomplete with common tank sets)
  - Jewelry gear set selection
  - Ultimate assignment (Warhorn, Colossus, Barrier, Atronach)
  - Notes field

### Healer Configuration
- **2 Healer slots** with:
  - Player identification (optional name and number)
  - Group assignment (for organizing players into slayer stacks or other groups)
  - Skill line requirements (3 specific lines or "flexible")
  - Body gear set selection (autocomplete with common healer sets)
  - Jewelry gear set selection
  - Healer buff assignment (Enlivening Overflow or From the Brink)
  - Ultimate assignment (same as tanks)
  - Notes field

### DD Requirements
- **Dynamic DD requirement slots** for special roles:
  - War Machine + Martial Knowledge DD
  - Zen's Redress + Alkosh DD
  - Player identification (optional name and number)
  - Group assignment (for organizing players)
  - Skill line requirements (3 specific lines or "flexible")
  - Notes field
  - Add/remove as needed

### Player Group Management
- Create custom groups for organizing players
- Common use cases: slayer stacks, portal groups, specific mechanics assignments
- Groups can be assigned to any player (tanks, healers, or DDs)
- Displayed in Discord export for clear communication

### Skill Line Configuration
- Each player can specify 3 required class skill lines
- Autocomplete with all ESO class skill lines organized by class:
  - **Dragonknight**: Ardent Flame, Draconic Power, Earthen Heart
  - **Sorcerer**: Dark Magic, Daedric Summoning, Storm Calling
  - **Nightblade**: Assassination, Shadow, Siphoning
  - **Templar**: Aedric Spear, Dawn's Wrath, Restoring Light
  - **Warden**: Animal Companions, Green Balance, Winter's Embrace
  - **Necromancer**: Grave Lord, Bone Tyrant, Living Death
  - **Arcanist**: Herald of the Tome, Apocryphal Soldier, Curative Runeforms
- Option to mark as "Flexible" if any skill lines are acceptable

### Ultimate Assignment Management
- Prevents duplicate ultimate assignments across all 4 supports (2 tanks + 2 healers)
- Dropdown shows only available ultimates
- 4 available ultimates: Aggressive Horn, Pestilent Colossus, Barrier, Greater Storm Atronach

### Healer Buff Management
- Ensures only one healer has Enlivening Overflow
- Ensures only one healer has From the Brink
- Prevents duplicate buff assignments

### Export/Import
- **JSON Export**: Download roster configuration as JSON file
- **JSON Import**: Upload previously saved roster JSON file
- Roster includes timestamp metadata (created/updated)

### Discord Integration
- **Copy for Discord** button generates Discord-formatted markdown
- Includes all roster details in a readable format
- Ready to paste directly into Discord channels

## Navigation
- **Header Bar**: Tools menu → "Roster Builder"
- **Footer**: Tools section → "Roster Builder"

## Common Gear Sets
The component includes autocomplete suggestions for common gear sets:

### Tank Sets
- Yolnahkriin
- Alkosh
- Turning Tide
- Saxhleel Champion
- Tremorscale
- Baron Zaudrus
- Encratis
- Drake's Rush
- Crimson Oath

### Healer Sets
- Spell Power Cure
- Jorvuld's Guidance
- Pillager's Profit
- Worm's Raiment
- Olorime
- Martial Knowledge
- Zen's Redress
- Master Architect
- Roaring Opportunist

## Data Structure
See `src/types/roster.ts` for complete TypeScript interfaces:
- `RaidRoster`: Main roster configuration
- `TankSetup`: Tank-specific configuration
- `HealerSetup`: Healer-specific configuration
- `DDRequirement`: DD special role requirements
- `SkillLineConfig`: Skill line configuration (3 lines or flex)
- `PlayerGroup`: Group assignment structure
- `SupportUltimate`: Enum of available ultimates
- `HealerBuff`: Enum of healer-specific buffs
- `CLASS_SKILL_LINES`: Array of all ESO class skill lines (3 per class) for autocomplete
- `DPSSlot`: DPS roster slot configuration

## Usage Example

1. Navigate to `/roster-builder`
2. Enter roster name
3. (Optional) Create player groups if needed (e.g., "Slayer Stack 1", "Portal Group")
4. Configure Tank 1:
   - Set player name and/or number
   - Assign to a group if applicable
   - Configure skill lines (either 3 specific lines or mark as flexible)
   - Select body and jewelry gear sets
   - Choose ultimate
5. Configure Tank 2 similarly
6. Configure Healer 1 and Healer 2:
   - Player identification and grouping
   - Skill line requirements
   - Gear sets
   - Healer buff (Enlivening Overflow or From the Brink)
   - Ultimate
7. Add DD requirements if needed:
   - War Machine/MK or Zen/Alkosh
   - Player identification, grouping, and skill lines
8. Add any general notes
9. Click "Copy for Discord" to share in Discord
10. Click "Export JSON" to save for later use

## Implementation Notes

### State Management
- Uses local component state (React hooks)
- No Redux integration required
- Self-contained feature

### Validation
- Ultimate uniqueness enforced via filtering
- Healer buff uniqueness enforced via filtering
- Type-safe with TypeScript enums and interfaces

### User Experience
- Autocomplete for common gear sets (with free-form entry)
- Dynamic DD requirement management
- Clear visual feedback with Snackbar notifications
- Material-UI components for consistent styling

## Future Enhancements
- [ ] Save rosters to user account (requires backend)
- [ ] Share rosters via URL
- [ ] Template library for common trial compositions
- [ ] Role validation warnings (e.g., missing penetration sets)
- [ ] Integration with parse analysis to suggest gear based on logs
