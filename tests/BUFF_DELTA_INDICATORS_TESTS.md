# Buff/Debuff Delta Indicator Tests

## Overview

Comprehensive test coverage for the buff/debuff delta indicator feature that displays how player performance compares to group average.

## Feature Behavior

### Three-State Indicator System

1. **Neutral Indicator (≈)**: For deltas between -2% and +2%
   - Displays gray ≈ symbol
   - Shows exact delta percentage (e.g., "≈ +1%", "≈ 0%", "≈ -1%")
   - Indicates player is close to group average

2. **Up Arrow Indicator (↑)**: For deltas ≥ +2%
   - Displays green up arrow
   - Shows positive delta (e.g., "+5%", "+21%")
   - Indicates player is above group average

3. **Down Arrow Indicator (↓)**: For deltas ≤ -2%
   - Displays red down arrow
   - Shows negative delta (e.g., "-9%", "-15%")
   - Indicates player is below group average

### Critical Design Decision

**NO MINIMUM THRESHOLD**: The indicator displays for ALL deltas, including very small ones (< 0.5%). This fulfills the requirement to show when values are "very close to the group average" rather than hiding them entirely.

## Test Coverage

### Unit Tests (`BuffUptimeProgressBar.test.tsx`)

**Location**: `src/features/report_details/insights/BuffUptimeProgressBar.test.tsx`

**Total Tests**: 26

**Test Categories**:

1. **Neutral Indicator Tests (8 tests)**
   - Delta = 0% (exact match)
   - Delta = +0.1% (very small positive)
   - Delta = +0.5% (below old 0.5% threshold)
   - Delta = +1%
   - Delta = +1.9% (just below 2% boundary)
   - Delta = -0.5% (below old 0.5% threshold)
   - Delta = -1%
   - Delta = -1.9% (just above -2% boundary)

2. **Up Arrow Tests (3 tests)**
   - Delta = +2% (boundary)
   - Delta = +5%
   - Delta = +21% (large positive)

3. **Down Arrow Tests (4 tests)**
   - Delta = -2% (boundary)
   - Delta = -9%
   - Delta = -15%
   - Delta = -27% (large negative)

4. **No Indicator Tests (2 tests)**
   - groupAverageUptimePercentage = undefined
   - groupAverageUptimePercentage = null

5. **Edge Case Tests (5 tests)**
   - Delta exactly at +2.0% threshold
   - Delta exactly at -2.0% threshold
   - Delta = +0.01% (extremely small)
   - Delta = +100% (very large positive)
   - Delta = -100% (very large negative)

6. **Stacked Abilities Tests (2 tests)**
   - Stack 1 with delta = 0%
   - Per-stack group average calculation

7. **Visual Styling Tests (2 tests)**
   - Neutral color styling
   - Uptime percentage rendering

**Run Command**:
```bash
npm test -- BuffUptimeProgressBar.test.tsx
```

### E2E Tests (`buff-delta-indicators.spec.ts`)

**Location**: `tests/buff-delta-indicators.spec.ts`

**Total Tests**: 7

**Test Scenarios**:

1. **Neutral indicator for delta = 0%**
   - Navigates to fight 19 insights (Lord Falgravn)
   - Selects player 5 (Cu Chulaínn)
   - Verifies Stagger Stack 1 shows "≈ 0%"

2. **Neutral indicator for small positive deltas (< 2%)**
   - Finds buffs with ≈ symbol
   - Verifies percentage is between 0% and 2%

3. **Up arrow for large positive deltas (≥ 2%)**
   - Finds Sundered with +21% delta
   - Verifies up arrow icon presence

4. **Down arrow for large negative deltas (≤ -2%)**
   - Finds Minor Berserk with -9% delta
   - Verifies down arrow icon presence

5. **Indicators for all deltas without minimum threshold**
   - Counts total debuffs vs debuffs with indicators
   - Verifies at least 70% have indicators

6. **Neutral indicator on status effects with small deltas**
   - Finds Burning with +1% delta
   - Verifies ≈ symbol and +1% text

7. **Indicator visibility when switching between stack levels**
   - Tests Stagger Stack 1 (≈ 0%)
   - Switches to Stack 2 (-15% down arrow)
   - Verifies indicators update correctly

**Run Command**:
```bash
npm run test:full -- buff-delta-indicators.spec.ts
```

## Test Data

**Test Report**: `k9rM7hRLgWVt6vNa` (Kyne's Aegis - Lord Falgravn)  
**Test Fight**: Fight 19  
**Test Player**: Player 5 (Cu Chulaínn)

**Known Data Points**:
- Stagger Stack 1: 56% (delta = 0%)
- Stagger Stack 2: 42% (delta = -15%)
- Stagger Stack 3: 29% (delta = -27%)
- Sundered: 28% (delta = +21%)
- Burning: 3% (delta = +1%)
- Minor Berserk: 73% (delta = -9%)

## Regression Prevention

These tests prevent regression of the following bug:

**Original Bug**: Indicators were hidden for deltas < 0.5% due to a minimum threshold check (`Math.abs(delta) >= 0.5`).

**Fix**: Removed the minimum threshold condition so ALL deltas display indicators, fulfilling the requirement to show when values are "very close to the group average".

**Code Change**:
```typescript
// BEFORE (BUG):
{delta !== null && Math.abs(delta) >= 0.5 && (
  // indicator JSX
)}

// AFTER (FIXED):
{delta !== null && (
  // indicator JSX
)}
```

**File**: `src/features/report_details/insights/BuffUptimeProgressBar.tsx:362`

## Continuous Integration

Both unit and E2E tests run automatically in CI/CD:

- **Unit tests**: Run on every commit via `npm test`
- **E2E tests**: Run in nightly test suite via `npm run test:nightly:all`

## Future Enhancements

Potential areas for additional testing:

1. **Accessibility**: Screen reader announcements for delta values
2. **Mobile Responsiveness**: Indicator visibility on small screens
3. **Performance**: Rendering performance with 100+ buff/debuff entries
4. **Localization**: Delta formatting for different locales
5. **Dark Mode**: Indicator color contrast in dark theme
