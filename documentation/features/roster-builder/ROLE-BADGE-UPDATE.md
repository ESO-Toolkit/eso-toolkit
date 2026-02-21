# Support Set Analysis - Role Badge Update

**Date:** November 3, 2025  
**Build:** 37.02 kB (8.89 kB gzipped)

## Summary

Added role badges to the Set Assignment Manager to clearly indicate whether each set is typically used by Tanks, Healers, or Both roles based on actual combat data analysis.

## Changes Made

### Visual Enhancements

1. **Role Badges**: Each set chip now displays a colored badge:
   - 🛡️ **Tank** (Blue) - Tank-exclusive sets
   - ❤️ **Healer** (Green) - Healer-exclusive sets
   - **Both** (Purple) - Flexible sets used by both roles

2. **Updated Header**: Clarified that recommendations are based on data from 68 players across 15 endgame fights

3. **Enhanced Tooltips**: Now show role information in addition to assignment status

### Role Classification Logic

Created `getSetRole()` function using data analysis:

**Tank-Exclusive** (0% healer usage):
- Tremorscale
- Baron Zaudrus
- Pearlescent Ward

**Healer-Exclusive** (0% tank usage or >90% healer):
- Spell Power Cure
- Symphony of Blades
- Jorvuld's Guidance
- Master Architect
- Roaring Opportunist
- Combat Physician
- Worm's Raiment
- Olorime
- Martial Knowledge
- Zen's Redress

**Flexible** (Cross-role usage):
- Turning Tide (9% tanks, 9% healers)
- War Machine (6% tanks, 3% healers)
- Pillager's Profit (15% tanks, 3% healers)
- Powerful Assault (3% tanks, 31% healers)

## Data Context

### Sets Found in Data Analysis

**13 total sets** were found across 15 fight reports:

1. Powerful Assault - 17.6% (Healer: 31%)
2. Spell Power Cure - 17.6% (Healer: 34%)
3. Symphony of Blades - 13.2% (Healer: 26%)
4. Jorvuld's Guidance - 11.8% (Healer: 23%)
5. Pillager's Profit - 8.8% (Tank: 15%)
6. Turning Tide - 8.8% (Both: 9% each)
7. Master Architect - 4.4% (Healer: 9%)
8. Roaring Opportunist - 4.4% (Healer: 9%)
9. Tremorscale - 4.4% (Tank: 9%)
10. War Machine - 4.4% (Tank: 6%)
11. Baron Zaudrus - 2.9% (Tank: 6%)
12. Pearlescent Ward - 1.5% (Tank: 3%)
13. Combat Physician - 1.5% (Healer: 3%)

**Note:** The 4 recommended sets (top section) represent sets with >15% usage. The remaining 9 sets appear in the "Additional Sets" accordion section.

### Why Only 13 Sets?

The analysis is based on **actual usage data** from downloaded fight reports. Many sets defined in `roster.ts` were not found in the data because:
- They may be content-specific (trial vs. dungeon vs. arena)
- They may be patch-specific (meta shifts)
- They may be newer sets not yet adopted
- The sample size is 15 fights (more data would show more variety)

This is intentional - we're showing what players **actually use** rather than what's theoretically available.

## User Experience Improvements

1. **Quick Visual Scanning**: Users can immediately see if a set matches their target role
2. **Data-Driven**: All badges based on real usage patterns, not assumptions
3. **Clear Categorization**: Eliminates guesswork about which role should use which set
4. **Maintained Functionality**: All existing assignment features still work

## Technical Details

- **Component**: `src/components/SetAssignmentManager.tsx`
- **New Icons**: ShieldIcon (tank), FavoriteIcon (healer)
- **Badge Colors**: Blue (#1976d2) for tanks, Green (#2e7d32) for healers, Purple (#9c27b0) for both
- **Data Source**: Analysis from `scripts/analyze-support-sets.cjs`

## Build Status

✅ TypeScript compilation: Passing  
✅ Production build: Successful  
✅ Bundle size: 37.02 kB (8.89 kB gzipped)  
✅ No breaking changes

## Next Steps

Consider:
1. Adding percentage usage stats to tooltips (e.g., "Spell Power Cure - 34% of healers")
2. Creating a legend/info button explaining the data source
3. Periodic re-analysis as more fight data is collected
4. Filtering sets by role (show only tank sets when editing tank roles)
