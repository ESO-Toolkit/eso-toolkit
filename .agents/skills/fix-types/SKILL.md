---
name: fix-types
description: 'Diagnose and fix TypeScript type errors; covers module-not-found, type mismatches, missing declarations, generated type staleness, and circular dependencies.'
---

# Skill: Fix TypeScript Errors

## Overview

Diagnose and fix TypeScript type errors in ESO Log Aggregator. This skill covers the most common error patterns and their specific solutions.

## When to Use

- `npm run typecheck` reports errors
- CI fails on typecheck step
- Importing a changed/new module results in type mismatches

## Step 1: Run Type Check

```powershell
npm run typecheck
```

---

## Common Errors & Fixes

### ❌ Cannot find module `@/...` or `@components/...`

**Cause**: Path alias not matching, or the referenced file doesn't exist.

Check `tsconfig.json` for path alias mappings:
- `@/` → `src/`
- `@components/` → `src/components/`
- `@utils/` → `src/utils/`
- `@store/` → `src/store/`
- `@features/` → `src/features/`
- `@types/` → `src/types/`
- `@graphql/` → `src/graphql/`

```powershell
# Verify the target file exists
Test-Path src/components/YourComponent.tsx
```

---

### ❌ Type `X` is not assignable to type `Y`

**Cause**: Missing or incorrect interface; `any` used as a shortcut.

```typescript
// ❌ Bad
const data: any = response;

// ✅ Good
interface ApiResponse {
  users: User[];
  pagination: PaginationInfo;
}
const data: ApiResponse = response;
```

**Rule**: Never use `any` — create a specific interface.

---

### ❌ Property `X` does not exist on type `Y`

**Cause**: Optional property not handled, or interface out of date.

```typescript
// ✅ Use optional chaining
const value = object?.property?.nestedProperty;

// ✅ Or guard explicitly
if (object.property) {
  const value = object.property.nested;
}
```

---

### ❌ Parameter implicitly has `any` type

**Cause**: Missing type annotation on function parameter.

```typescript
// ❌ Bad
function process(data) {}

// ✅ Good
interface InputData {
  id: number;
  name: string;
}
function process(data: InputData) {}
```

---

### ❌ Type definitions don't match schema (generated types)

**Cause**: GraphQL schema changed; generated types are stale.

```powershell
npm run codegen
```

After codegen, run typecheck again to verify the types are updated:

```powershell
npm run typecheck
```

---

### ❌ Circular dependency detected

**Cause**: Two or more files import each other.

**Fix**:

1. Identify the cycle by tracing imports
2. Extract shared types to a separate file (e.g., `types.ts`)
3. Restructure imports to be unidirectional

---

### ❌ Module has no exported member

**Cause**: Named export was renamed or removed.

```typescript
// ❌ Bad — export was renamed
import { oldName } from '@/utils/helpers';

// ✅ Good — use the new name
import { newName } from '@/utils/helpers';
```

Check what the module actually exports:

```powershell
# Search for the export in the source file
Select-String -Path "src/utils/helpers.ts" -Pattern "export"
```

---

## Type Safety Standards

- **Never use `any`** without a documented justification comment
- **Named exports only** — no default exports in this project
- **Create specific interfaces** for all data structures
- **Union types** for known values: `type Status = 'loading' | 'success' | 'error'`
- **Optional chaining** for nullable properties: `object?.property`
- **Run codegen first** when GraphQL errors appear: `npm run codegen`

## Validation Order

After fixing type errors, continue through the full validation:

```powershell
npm run validate         # typecheck + lint + format
npm test -- --watchAll=false   # unit tests
```

## Related Skills

- [fix-lint](../fix-lint/SKILL.md) — fixing lint errors
- [debug-ci-failure](../debug-ci-failure/SKILL.md) — debugging CI failures
- [testing](../testing/SKILL.md) — running tests
