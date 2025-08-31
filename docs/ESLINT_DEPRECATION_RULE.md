# ESLint Deprecation Rule Configuration

## Overview

The `eslint-plugin-deprecation` has been configured to catch all deprecated function calls and APIs in the codebase. This helps prevent use of deprecated functions and encourages migration to newer patterns.

## Configuration

### Plugin Installation

```bash
npm install --save-dev eslint-plugin-deprecation
```

### ESLint Configuration (.eslintrc.json)

```json
{
  "plugins": ["storybook", "@typescript-eslint", "import", "deprecation"],
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "rules": {
    "deprecation/deprecation": "error"
  }
}
```

## How It Works

The plugin automatically detects deprecated functions in several ways:

### 1. JSDoc @deprecated Tags

Functions marked with `@deprecated` in JSDoc comments:

```typescript
/**
 * @deprecated Use useSelectFriendlyBuffLookup() hook for worker-based calculation
 */
export const selectFriendlyBuffLookup = createSelector(/* ... */);
```

**ESLint will show:**

```
error: 'selectFriendlyBuffLookup' is deprecated. Use useSelectFriendlyBuffLookup() hook for worker-based calculation
```

### 2. TypeScript Deprecated APIs

Built-in browser and library APIs marked as deprecated:

```typescript
// These will trigger deprecation warnings:
document.execCommand('copy'); // deprecated DOM API
performance.timing.loadEventEnd; // deprecated Performance API
'hello'.substr(1, 2); // deprecated String method
```

### 3. Library Deprecations

Third-party library functions marked as deprecated:

```typescript
import { createStore } from 'redux'; // Redux deprecated createStore
```

## Current Detections

The rule currently catches these deprecated usages in the codebase:

### Custom Deprecations

- ✅ `selectFriendlyBuffLookup` → Use `useSelectFriendlyBuffLookup()` hook
- ✅ Other selectors can be marked with `@deprecated` for similar protection

### Browser API Deprecations

- ✅ `document.execCommand()` → Use Clipboard API
- ✅ `performance.timing.*` → Use Performance Observer API
- ✅ `String.prototype.substr()` → Use `substring()` or `slice()`
- ✅ Global `JSX` namespace → Use `React.JSX`

### Library Deprecations

- ✅ Redux `createStore` → Use `@reduxjs/toolkit`

## Benefits

1. **Prevents Deprecated Usage** - Blocks deprecated function calls at lint time
2. **Encourages Best Practices** - Guides developers toward modern APIs
3. **Code Quality** - Maintains clean, up-to-date codebase
4. **Migration Support** - Helps identify code that needs updating

## Usage Examples

### Marking Functions as Deprecated

```typescript
/**
 * Calculate buff lookup data synchronously
 * @deprecated Use useSelectFriendlyBuffLookup() for worker-based calculation with progress reporting
 */
export const calculateBuffLookupSync = (events: BuffEvent[]) => {
  // Legacy implementation
};
```

### Migration Messages

```typescript
/**
 * @deprecated Since v2.0.0. Use newApiFunction() instead.
 * This will be removed in v3.0.0.
 */
export const oldApiFunction = () => {
  // deprecated code
};
```

## Integration with CI/CD

The rule is set to `"error"` level, meaning:

- ✅ **Development** - Shows errors in IDE
- ✅ **Pre-commit** - Blocks commits with deprecated usage
- ✅ **CI/CD** - Fails builds with deprecated code
- ✅ **Code Review** - Highlighted in pull requests

## Testing the Rule

To test if the deprecation rule catches a specific usage:

```bash
# Test specific file
npx eslint src/path/to/file.ts

# Test all files
npm run lint

# Show only deprecation errors
npm run lint | grep "deprecation/deprecation"
```

## Exceptions and Overrides

For cases where deprecated APIs must be used temporarily:

```typescript
// eslint-disable-next-line deprecation/deprecation
const result = legacyDeprecatedFunction();
```

Or in configuration for specific files:

```json
{
  "overrides": [
    {
      "files": ["src/legacy/**/*.ts"],
      "rules": {
        "deprecation/deprecation": "warn"
      }
    }
  ]
}
```

## Best Practices

1. **Mark Deprecated Functions** - Always use `@deprecated` JSDoc tag
2. **Provide Migration Path** - Include replacement function in deprecation message
3. **Set Timeline** - Mention when deprecated function will be removed
4. **Update Documentation** - Ensure migration guides are available
5. **Monitor Usage** - Regularly run linter to catch new deprecated usages

## Example Migration Flow

1. **Mark as Deprecated**

   ```typescript
   /** @deprecated Use newFunction() instead */
   export const oldFunction = () => {
     /* ... */
   };
   ```

2. **ESLint Catches Usage**

   ```
   error: 'oldFunction' is deprecated. Use newFunction() instead
   ```

3. **Developer Updates Code**

   ```typescript
   // const result = oldFunction();  // ❌ Deprecated
   const result = newFunction(); // ✅ Modern approach
   ```

4. **Remove Deprecated Function**
   ```typescript
   // export const oldFunction = () => { /* ... */ };  // Removed
   ```

This automated deprecation detection ensures the codebase stays modern and prevents accidental use of deprecated functions, making the worker-based selector migration enforceable at the linting level.
