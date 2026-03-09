# Roster Builder Audit Report

**Branch**: `audit/roster-builder`
**Date**: 2026-03-08
**Scope**: Type safety, data validation, error handling, testing

---

## Issues Found

### 🔴 Critical Issues

#### 1. Unsafe Type Assertions in Encoding/Decoding
**File**: `src/utils/rosterEncoding.ts` (lines 181-184, 191-194, 255-258, 285-288)

**Problem**: Casting `KnownSetIDs` enums to/from numbers without validation. If a stored number is outside the valid enum range, it silently becomes `undefined`.

```typescript
// UNSAFE - no validation
c.s1 = gs.set1 as number;
set1: c?.s1 as KnownSetIDs | undefined,
```

**Risk**: Corrupted rosters could lose data or decode silently into wrong sets.

---

#### 2. DPS Slot Gear Structure Inconsistency
**File**: `src/types/roster.ts` (lines 131-144)

**Problem**: DPS slots have both legacy `gearSets: KnownSetIDs[]` (deprecated) AND new fields (`set1`, `set2`, `monsterSet`), but:
- The new fields are not initialized in `createDefaultDPSSlots()`
- Encoding only uses legacy `gearSets` (line 305 in `rosterEncoding.ts`)
- UI likely doesn't set the new fields
- This creates a parallel data structure that's never used

**Impact**: New structured gear code path for DPS is dead code; data is lost if you try to use set1/set2/monsterSet on DPS slots.

---

#### 3. Silent Error Handling in Encoding/Decoding
**File**: `src/utils/rosterEncoding.ts` (lines 455-464, 470-489)

**Problem**: Encoding returns empty string on any error; decoding returns null. No logging or user notification.

```typescript
export const encodeRosterToURL = async (roster: RaidRoster): Promise<string> => {
  try {
    // ...
  } catch {
    return ''; // Silent failure - user won't know it failed
  }
};
```

**Risk**: Users share broken roster URLs without realizing; lost data with no trace.

---

### 🟡 High-Priority Issues

#### 4. No Test Coverage
**Files**: All roster builder files

**Problem**: Zero unit tests found for:
- Roster encoding/decoding
- Set assignment validation
- DPS slot creation
- Compatibility rule validation (`validateCompatibility` in roster.ts)

**Impact**: No regression detection; breaking changes go unnoticed.

---

#### 5. Missing Slot Type Validation
**File**: `src/components/SetAssignmentManager.tsx` (line 107-111)

**Problem**: `onAssignSet` callback accepts sets without validating if the set can fit in the requested slot:
- 5-piece sets can only go in `set1`/`set2`
- Monster/mythic sets can only go in `monster` slot
- No validation at assignment time

**Risk**: Invalid roster configurations silently created.

---

#### 6. Typo in Documentation
**File**: `src/types/roster.ts` (line 598)

**Problem**: Comment has garbled text: `"Healer-specific 5-piece support setsasass"`

**Impact**: Minor - affects readability only.

---

### 🟢 Medium-Priority Issues

#### 7. Unsafe Enum Index Lookups
**File**: `src/utils/rosterEncoding.ts` (lines 140, 152, 290-292)

**Problem**: Array lookups with potential out-of-bounds indices:

```typescript
if (typeof v === 'number') return CLASS_SKILL_LINES[v] ?? '';
if (typeof v === 'number') return ULTIMATE_LIST[v] ?? null;
```

If a corrupted URL contains index 99 but array only has 4 items, falls back gracefully—but should validate or warn.

---

#### 8. Missing Validation in Compatibility Rules
**File**: `src/types/roster.ts` (lines 449-498)

**Problem**: `validateCompatibility()` doesn't handle edge cases:
- Empty or null `ultimate` string validation
- Doesn't validate if sets are actually assigned
- No unit test to ensure rules work correctly

---

#### 9. Set Display Name Lookup Fallback
**File**: `src/utils/setNameUtils.ts` (lines 306-324)

**Problem**: `getSetDisplayName()` reports unknown sets to error tracking but returns `Unknown Set (ID)` for UI. This could hide missing set definitions.

---

## Summary Table

| Category | Count | Severity |
|----------|-------|----------|
| Critical | 3 | 🔴 Blocking data integrity |
| High | 2 | 🟡 Likely bugs |
| Medium | 3 | 🟢 Should fix |
| Low | 1 | ⚪ Polish |

---

## Recommendations

1. **Add unit tests** for encoding/decoding with edge cases (corrupted data, out-of-bounds indices)
2. **Remove dead code** - consolidate DPS gear structure to use set1/set2/monsterSet OR keep gearSets but not both
3. **Add slot validation** - prevent invalid set→slot assignments in SetAssignmentManager
4. **Replace silent errors** with explicit logging or user-facing notifications
5. **Add enum range validation** when encoding/decoding KnownSetIDs
6. **Fix documentation** typo in roster.ts line 598
