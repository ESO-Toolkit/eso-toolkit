# Development Workflow Tools - Quick Reference

## Overview

The Agent Skill provides comprehensive development workflow automation with structured results. These tools cover the complete development cycle from formatting to building to version control.

## Tool Categories

1. **Code Quality**: Formatting, linting, type checking
2. **Testing**: Unit tests with coverage
3. **Building**: Production builds
4. **Git Workflow**: Branch creation, commits, pushing - **NEW!**

📖 **Git Workflow Full Documentation**: [GIT_WORKFLOW_TOOLS.md](GIT_WORKFLOW_TOOLS.md)

---

## Code Quality Tools

### `run_format`

Format code with Prettier.

**Parameters:**
- `check` (optional): Only check formatting without making changes

**Example Requests:**
- "Format the code"
- "Check code formatting"
- "@workspace format all code with Prettier"

**Use Cases:**
- Before committing code
- After pulling changes
- Clean up code style

**Returns:**
```json
{
  "action": "format",
  "success": true,
  "command": "format",
  "output": "Checking formatting...\n✓ All files formatted",
  "note": "Code has been formatted with Prettier"
}
```

---

### `run_lint`

Lint code with ESLint.

**Parameters:**
- `fix` (optional): Automatically fix fixable issues

**Example Requests:**
- "Lint the code"
- "Lint and fix issues"
- "@workspace run ESLint with auto-fix"

**Use Cases:**
- Before committing
- Code review preparation
- Finding code quality issues

**Returns:**
```json
{
  "action": "lint",
  "success": false,
  "command": "lint",
  "output": "✖ 3 problems (2 errors, 1 warning)\n  2 errors and 0 warnings potentially fixable",
  "note": "Linted code (no changes made)"
}
```

With errors, AI can parse and report:
```
Found 3 lint issues:
- Error: 'foo' is defined but never used (line 42)
- Error: Missing semicolon (line 56)
- Warning: Console statement (line 78)
```

---

### `run_typecheck`

Run TypeScript type checking.

**Example Requests:**
- "Run type checking"
- "Check for TypeScript errors"
- "@workspace verify types"

**Use Cases:**
- Before committing
- After refactoring
- Validate type safety

**Returns:**
```json
{
  "action": "typecheck",
  "success": false,
  "command": "typecheck",
  "output": "src/components/Widget.tsx(45,12): error TS2322: Type 'string' is not assignable to type 'number'",
  "note": "TypeScript compilation check (no code emitted)"
}
```

---

### `run_build`

Create production build.

**Example Requests:**
- "Build for production"
- "Create production bundle"
- "@workspace run production build"

**Use Cases:**
- Pre-deployment validation
- Check build size
- Verify production configuration

**Returns:**
```json
{
  "action": "build",
  "success": true,
  "command": "build",
  "output": "vite v5.0.0 building for production...\n✓ built in 12.34s\nDist: 2.5 MB",
  "note": "Production build created in build/ directory"
}
```

---

### `run_unit_tests`

Run Jest unit tests.

**Parameters:**
- `coverage` (optional): Generate coverage report

**Example Requests:**
- "Run unit tests"
- "Run unit tests with coverage"
- "@workspace execute Jest tests"

**Use Cases:**
- Quick validation
- TDD workflow
- Coverage analysis

**Returns:**
```json
{
  "action": "unit-tests",
  "coverage": false,
  "success": true,
  "command": "test:all",
  "output": "Test Suites: 45 passed, 45 total\nTests: 234 passed, 234 total\nTime: 8.562s",
  "note": "Unit tests completed"
}
```

With coverage:
```json
{
  "action": "unit-tests",
  "coverage": true,
  "success": true,
  "output": "Coverage: 87.5% Statements | 85.2% Branches | 90.1% Functions | 88.3% Lines",
  "note": "Unit tests completed with coverage report generated"
}
```

---

## Complete Workflows

### Workflow 1: Pre-Commit Validation

```
You: Run pre-commit checks

AI:
1. Runs format (check only)
2. Runs lint
3. Runs typecheck
4. Runs unit tests
5. Reports: "All checks passed ✓"
```

Or if issues found:
```
AI Reports:
✓ Format: OK
✗ Lint: 3 issues found
✗ Typecheck: 1 error in Widget.tsx
✓ Unit Tests: All passed

Recommendation: Fix lint and type errors before committing
```

---

### Workflow 2: Fix All Issues

```
You: Fix all code quality issues

AI:
1. Runs format (with changes)
2. Runs lint with auto-fix
3. Runs typecheck
4. Reports: "Fixed formatting and auto-fixable lint issues. 1 type error remains that requires manual fix."
```

---

### Workflow 3: Complete CI/CD Simulation

```
You: Run full CI/CD validation

AI:
1. Runs format check
2. Runs lint
3. Runs typecheck
4. Runs unit tests
5. Runs smoke tests
6. Runs build
7. Reports: "All CI/CD checks passed ✓ Ready to deploy"
```

---

### Workflow 4: Release Preparation

```
You: Prepare for release

AI:
1. Runs format
2. Runs lint with fix
3. Runs typecheck
4. Runs unit tests with coverage
5. Runs full E2E tests
6. Runs build
7. Validates build output
8. Reports: "Release ready. Coverage: 87%. All tests passed. Build size: 2.5 MB"
```

---

### Workflow 5: Quick Quality Check

```
You: Quick quality check

AI:
1. Runs lint
2. Runs typecheck
3. Runs unit tests (no coverage)
4. Reports status in ~30 seconds
```

---

## Comparison with Manual Commands

### Traditional Approach
```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```
- 5 separate commands
- Manual tracking of results
- No aggregated report
- CLI output format

### Agent Skill Approach
```
AI: Run full validation

AI automatically:
- Runs all checks
- Parses all outputs
- Aggregates results
- Provides summary
- Suggests fixes
```

---

## Integration with Testing Tools

### Combined Quality + Testing Workflow

```
You: Complete validation with all tests

AI:
1. Code Quality:
   - Format ✓
   - Lint ✓
   - Typecheck ✓
   
2. Unit Tests:
   - Jest: 234 passed ✓
   
3. E2E Tests:
   - Smoke: 15 passed ✓
   - Full: 85 passed ✓
   
4. Build:
   - Production build ✓
   
Result: All checks passed. Ready for deployment.
```

---

## Best Practices

### 1. Check Before Fix

```
✓ Run format check first
✓ Run lint without fix first
✗ Don't auto-fix without seeing issues
```

### 2. Incremental Validation

```
✓ Format → Lint → Typecheck → Test
✓ Stop at first failure
✗ Don't run all if early checks fail
```

### 3. Use Coverage Wisely

```
✓ Use coverage for important changes
✓ Use coverage before releases
✗ Don't use coverage for quick checks (slower)
```

### 4. Build Last

```
✓ Run build after all checks pass
✓ Build validates production readiness
✗ Don't build if tests are failing
```

---

## Error Handling

### Scenario: Format Issues

**AI Response:**
```
Format check found 12 files with formatting issues:
- src/components/Widget.tsx
- src/utils/helper.ts
...

Would you like me to fix them? (run format without check)
```

### Scenario: Lint Errors

**AI Response:**
```
Found 5 lint errors:
1. 'unused' is defined but never used (line 42)
2. Missing return type (line 67)
3. Prefer const over let (line 89) [fixable]
4. Console statement found (line 102)
5. Missing semicolon (line 134) [fixable]

3 of 5 are auto-fixable. Run lint with fix option?
```

### Scenario: Type Errors

**AI Response:**
```
TypeScript found 2 type errors:

1. src/components/Widget.tsx(45,12):
   Type 'string' is not assignable to type 'number'
   
2. src/utils/api.ts(78,23):
   Property 'data' does not exist on type 'Response'

These require manual fixes.
```

### Scenario: Build Failure

**AI Response:**
```
Build failed with error:
Transform failed with 1 error:
src/components/Widget.tsx:45:12: ERROR: Expected ';' but found 'const'

Fix this syntax error and try again.
```

---

## Structured Results Format

All workflow tools return this format:

```typescript
{
  action: string,              // Tool name
  success: boolean,            // Overall success
  command: string,             // npm command executed
  output: string,              // Command output (truncated to 5000 chars)
  exitCode?: number,           // Exit code if failed
  error?: string,              // Error message if failed
  note: string,                // Human-readable description
  coverage?: boolean,          // For unit tests
  fix?: boolean,               // For lint
  check?: boolean              // For format
}
```

---

## AI Capabilities

With structured results, AI can:

1. **Parse and Summarize**
   - Extract key information
   - Count errors/warnings
   - List affected files

2. **Provide Context**
   - Explain errors
   - Suggest fixes
   - Link to documentation

3. **Make Decisions**
   - Stop workflow on critical errors
   - Continue on warnings
   - Auto-fix when appropriate

4. **Track Progress**
   - Report step-by-step status
   - Show time estimates
   - Provide final summary

---

## Available Commands

| Tool | Command | Duration | Use Case |
|------|---------|----------|----------|
| `run_format` | `npm run format` | ~5s | Code formatting |
| `run_format` (check) | `npm run format:check` | ~3s | Check only |
| `run_lint` | `npm run lint` | ~10s | Find issues |
| `run_lint` (fix) | `npm run lint:fix` | ~15s | Fix issues |
| `run_typecheck` | `npm run typecheck` | ~8s | Type checking |
| `run_unit_tests` | `npm run test:all` | ~10s | Unit tests |
| `run_unit_tests` (coverage) | `npm run test:coverage` | ~15s | With coverage |
| `run_build` | `npm run build` | ~20s | Production build |

---

## See Also

- [Main README](README.md) - Complete Agent Skill documentation
- [Test Execution Tools](TEST_EXECUTION_TOOLS.md) - E2E testing
- [Dev Server Tools](DEV_SERVER_TOOLS.md) - Server management
- [Setup Checklist](SETUP_CHECKLIST.md) - Installation guide
