---
name: fix-lint
description: 'Diagnose and fix ESLint errors that remain after auto-fix, including floating promises, unsafe any types, console statements, unused variables, and import order issues.'
---

# Skill: Fix Linting Errors

## Overview

Diagnose and fix ESLint errors in ESO Log Aggregator. Most issues are auto-fixed; this skill covers the patterns that require manual intervention.

## When to Use

- `npm run lint` reports errors after auto-fix
- CI fails on the lint step
- Adding new code patterns that trigger ESLint rules

## Step 1: Run Auto-Fix

```powershell
npm run lint:fix
```

The `--fix` flag resolves ~80% of issues automatically:

- Import ordering
- Spacing and formatting
- Quote style
- Semicolons
- Trailing commas
- Unused imports

---

## Manual Fixes Required

### ❌ `@typescript-eslint/no-floating-promises`

**Cause**: Async function called without `await` or `void` — unhandled promise.

```typescript
// ❌ Bad
someAsyncFunction();

// ✅ Good — explicitly void
void someAsyncFunction();

// ✅ Good — awaited
await someAsyncFunction();

// ✅ Good — handled
someAsyncFunction().catch((err) => console.error(err));
```

---

### ❌ `@typescript-eslint/no-unused-vars`

**Cause**: Variable declared but never used.

```typescript
// ❌ Bad
const unused = fetchData();

// ✅ Good — use it
const data = fetchData();
processData(data);

// ✅ Good — prefix with underscore if intentionally unused
const _unused = fetchData();
```

---

### ❌ `@typescript-eslint/no-explicit-any`

**Cause**: `any` type used, reducing type safety.

```typescript
// ❌ Bad
function process(data: any) {}

// ✅ Good
interface DataType {
  id: number;
  name: string;
}
function process(data: DataType) {}
```

---

### ❌ `no-console`

**Cause**: `console.log` used in production code (if enabled in the ESLint config).

```typescript
// ❌ Bad — in production code
console.log('debug info', data);

// ✅ Good — use error tracking or remove
import { reportError } from '@/utils/errorTracking';
reportError('error occurred', { error });
```

> **Note**: Check `eslint.config.mjs` — `no-console` may be configured as a warning or disabled in this project.

---

### ❌ `prefer-const`

**Cause**: Variable declared with `let` but never reassigned.

```typescript
// ❌ Bad
let value = 123;

// ✅ Good
const value = 123;
```

---

### ❌ `react-hooks/exhaustive-deps`

**Cause**: Missing dependencies in `useEffect`, `useMemo`, or `useCallback` hooks.

```typescript
// ❌ Bad — missing dependency
useEffect(() => {
  fetchData(userId);
}, []); // userId is missing from deps

// ✅ Good
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

---

### ❌ `react-hooks/rules-of-hooks`

**Cause**: Hooks called conditionally or inside loops.

```typescript
// ❌ Bad — conditional hook
if (condition) {
  const [state, setState] = useState(0);
}

// ✅ Good — hooks at top level
const [state, setState] = useState(0);
// Use condition elsewhere
```

---

## ESLint Disable Rules

**Only use when absolutely necessary**, always with a justification comment:

```typescript
// ✅ Good — documented reason
// Platform compatibility requires any type here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).StyleSheet = StyleSheet;

// ❌ Bad — no justification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response;
```

**Never use file-level disables** — target only the specific line.

## Validation Order

After fixing lint errors, complete the full validation:

```powershell
npm run validate         # typecheck + lint + format
npm test -- --watchAll=false   # unit tests
```

## Related Skills

- [fix-types](../fix-types/SKILL.md) — fixing TypeScript errors
- [debug-ci-failure](../debug-ci-failure/SKILL.md) — debugging CI failures
- [testing](../testing/SKILL.md) — running tests
