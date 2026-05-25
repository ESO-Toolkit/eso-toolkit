# Support Set Analysis - Data-Driven Recommendations

**Analysis Date:** October 2025  
**Data Source:** 15 fight reports, 68 players (33 tanks, 35 healers)  
**Script:** `scripts/analyze-support-sets.cjs`

## Executive Summary

This analysis examined actual combat logs from endgame ESO content to identify which support sets are **actually used** versus theoretical recommendations. The findings led to significant updates to the roster builder's recommended sets.

## Key Findings

### 🔥 Most Common Support Sets

| Rank | Set Name | Occurrences | % of Players | Primary Role |
|------|----------|-------------|--------------|--------------|
| 1 | **Powerful Assault** | 12 | 17.6% | Healer (31% of healers) |
| 2 | **Spell Power Cure** | 12 | 17.6% | Healer (34% of healers) |
| 3 | **Symphony of Blades** | 9 | 13.2% | Healer (26% of healers) |
| 4 | **Jorvuld's Guidance** | 8 | 11.8% | Healer (23% of healers) |
| 5 | **Pillager's Profit** | 6 | 8.8% | Tank (15% of tanks) |
| 6 | **Turning Tide** | 6 | 8.8% | Both (9% tanks, 9% healers) |
| 7 | **Master Architect** | 3 | 4.4% | Healer (9% of healers) |
| 8 | **Roaring Opportunist** | 3 | 4.4% | Healer (9% of healers) |
| 9 | **Tremorscale** | 3 | 4.4% | Tank (9% of tanks) |
| 10 | **War Machine** | 3 | 4.4% | Tank (6% tanks, 3% healers) |

### ❌ Old vs ✅ New Recommended Sets

**OLD RECOMMENDED_SETS** (Pre-Analysis):
- ❌ Pearlescent Ward (1.5% - rarely used)
- ❌ Lucent Echoes (0% - NOT FOUND in data)
- ❌ Saxhleel Champion (0% - NOT FOUND in data)
- ✅ Pillager's Profit (8.8% - correctly identified)

**NEW RECOMMENDED_SETS** (Data-Driven):
- ✅ Powerful Assault (17.6% - #1 most common)
- ✅ Spell Power Cure (17.6% - #1 most common)
- ✅ Symphony of Blades (13.2% - #3 most common)
- ✅ Jorvuld's Guidance (11.8% - #4 most common)

## Role-Specific Insights

### Healer Sets (Priority Order)

1. **Spell Power Cure** - 34% of healers use this
2. **Powerful Assault** - 31% of healers
3. **Symphony of Blades** - 26% of healers (monster set)
4. **Jorvuld's Guidance** - 23% of healers
5. **Master Architect** - 9% of healers
6. **Roaring Opportunist** - 9% of healers

**Key Insight:** Symphony of Blades (monster set) is HIGHLY popular with healers, appearing in 26% of healer builds.

### Tank Sets (Priority Order)

1. **Pillager's Profit** - 15% of tanks
2. **Turning Tide** - 9% of tanks (also used by healers)
3. **Tremorscale** - 9% of tanks (monster set)
4. **War Machine** - 6% of tanks
5. **Baron Zaudrus** - 6% of tanks (monster set)
6. **Pearlescent Ward** - 3% of tanks

**Key Insight:** Monster sets (Tremorscale, Baron Zaudrus) have significant tank usage. War Machine appears in both tank and DD special categories but is primarily tank-worn.

### Flexible Sets (Cross-Role Usage)

- **Turning Tide**: Equal usage (3 tanks, 3 healers)
- **War Machine**: Primarily tanks (2), occasionally healers (1)
- **Pearlescent Ward**: Historically flexible, currently low usage (1 tank)

## Changes Made to `roster.ts`

### 1. RECOMMENDED_SETS Updated
```typescript
// OLD (theoretical)
'Pearlescent Ward', 'Lucent Echoes', 'Saxhleel Champion', 'Pillager\'s Profit'

// NEW (data-driven)
'Powerful Assault', 'Spell Power Cure', 'Symphony of Blades', 'Jorvuld\'s Guidance'
```

### 2. HEALER_SETS Reordered
- Placed most common sets first (Powerful Assault, Spell Power Cure, Symphony of Blades)
- Added usage percentages in comments
- Moved rarely-used sets to bottom (marked as "less common but viable")
- **Removed:** Lucent Echoes (0% occurrence)

### 3. TANK_SETS Reordered
- Prioritized frequently-used sets (Pillager's Profit, Turning Tide, Tremorscale)
- Added usage percentages in comments
- Moved theoretical sets to bottom
- **Kept but demoted:** Yolnahkriin, Alkosh, Saxhleel Champion (0% occurrence but may be content-specific)

### 4. FLEXIBLE_SETS Updated
- Added **Turning Tide** (demonstrated cross-role usage)
- Removed **Powerful Assault** (now healer-exclusive based on data)
- Added War Machine (some cross-role usage)

### 5. MONSTER_SETS Reordered
- **Symphony of Blades** remains #1 (most common monster set - 26% of healers!)
- Added frequency comments for Tremorscale and Baron Zaudrus

## Surprising Discoveries

1. **Symphony of Blades Dominance**: Despite being a monster set, it's the 3rd most common support set overall and appears on 26% of healers.

2. **Lucent Echoes & Saxhleel Champion**: These "recommended" sets had **0% occurrence** in our data - they may be content-specific or outdated recommendations.

3. **Powerful Assault is Healer-Exclusive**: Despite being historically flexible, 11/12 occurrences were on healers (31% of healers).

4. **Pearlescent Ward Underused**: Only 1 occurrence (1.5%) despite being in our old recommended sets.

5. **War Machine Cross-Role**: Appears in DD_SPECIAL_SETS but actual usage shows tanks wearing it more than DDs.

## Methodology

### Data Collection
- **Source:** `data-downloads/` directory containing 15 fight reports
- **Files Analyzed:** `player-details.json` from each fight directory
- **Data Points:** `combatantInfo.gear[]` arrays for tanks and healers

### Analysis Script
- **Location:** `scripts/analyze-support-sets.cjs`
- **Functionality:**
  - Parses all player-details.json files
  - Extracts setName from gear arrays
  - Tracks role (tank/healer) for each set occurrence
  - Calculates frequencies and percentages
  - Identifies top 10 sets and sets with >15% occurrence

### Validation
- ✅ TypeScript compilation successful
- ✅ No breaking changes to existing code
- ✅ Maintained backward compatibility with legacy exports

## Usage

### Running the Analysis

```powershell
# Analyze support sets from downloaded fight data
node scripts\analyze-support-sets.cjs
```

### Updating Set Definitions

The analysis automatically informs updates to `src/types/roster.ts`:
- `RECOMMENDED_SETS` - Top 4 most common sets (>11% occurrence)
- `HEALER_SETS` - Reordered by actual usage frequency
- `TANK_SETS` - Reordered by actual usage frequency
- `FLEXIBLE_SETS` - Sets with proven cross-role usage
- `MONSTER_SETS` - Reordered by popularity

## Future Considerations

1. **Content-Specific Sets**: Some sets (Yolnahkriin, Alkosh) may be trial-specific. Consider maintaining separate lists for different content types (trials, arenas, dungeons).

2. **Periodic Re-Analysis**: Support set meta changes with patches. Recommend re-running analysis quarterly or after major ESO updates.

3. **Expanded Data Sources**: Current analysis is from 15 fights. More data would provide better statistical significance.

4. **Monster Set Categories**: Consider separating monster sets by role (tank monster sets vs healer monster sets) since Symphony of Blades is healer-dominant.

5. **DD Special Sets**: War Machine appears in DD_SPECIAL_SETS but is primarily worn by tanks. May need to reconsider this category.

## Related Files

- **Type Definitions:** `src/types/roster.ts`
- **Analysis Script:** `scripts/analyze-support-sets.cjs`
- **Set Assignment UI:** `src/components/SetAssignmentManager.tsx`
- **Roster Builder:** `src/pages/RosterBuilderPage.tsx`

## Changelog

**October 2025** - Initial data-driven analysis
- Analyzed 68 players across 15 fight reports
- Updated RECOMMENDED_SETS based on >15% occurrence threshold
- Reordered all set arrays by actual usage frequency
- Added usage percentage comments
- Identified cross-role usage patterns
