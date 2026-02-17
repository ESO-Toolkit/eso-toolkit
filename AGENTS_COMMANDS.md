<!-- AI Context: Load only when detailed command reference is needed -->
# Complete Command Reference

**Note**: For quick commands, see [AGENTS.md](AGENTS.md). This file contains exhaustive command documentation.

---

## Development Commands

| Command | Description | Notes |
|---------|-------------|-------|
| `npm ci` | Install dependencies | Clean install from lock file |
| `npm run dev` | Start development server | Hot module reload enabled |
| `npm start` | Start dev server (alt) | Alternative command |
| `npm run codegen` | Generate GraphQL types | **Required after schema changes** |
| `npm run typecheck` | TypeScript compilation check | Pre-commit validation |
| `npm run lint` | ESLint code analysis | Check only |
| `npm run lint:fix` | ESLint with auto-fix | Automatically fix issues |
| `npm run format` | Format code with Prettier | Apply formatting |
| `npm run format:check` | Check code formatting | Validation only |
| `npm run validate` | Complete validation | typecheck + lint + format |

---

## Testing Commands

### Unit Tests
| Command | Description | Notes |
|---------|-------------|-------|
| `npm test` | Unit tests (changed files) | Interactive mode |
| `npm run test:all` | All unit tests | Run everything |
| `npm run test:watch` | Watch mode | Auto-rerun on changes |
| `npm run test:changed` | Only changed files | Git-based detection |
| `npm run test:coverage` | Generate coverage report | With thresholds |
| `npm run coverage:open` | Open coverage report | Opens in browser |
| `npm run coverage:full` | Complete coverage workflow | Generate + open |
| `npm run test:smoke:unit` | Quick unit validation | Smoke tests only |

### E2E Tests (Playwright)

**Recommended**: Use VS Code MCP Playwright tool or Agent Skills instead of CLI

| Command | Description | Notes |
|---------|-------------|-------|
| `npm run test:smoke:e2e` | Quick E2E validation | Critical paths only |
| `npm run test:smoke` | Smoke tests (unit + E2E) | Quick validation |
| `npm run test:full` | Full E2E suite (non-nightly) | Comprehensive testing |
| `npm run test:full:headed` | Full suite (visible browser) | Debug mode |
| `npm run test:full:report` | View full test report | HTML report |
| `npm run test:nightly:all` | Nightly (all browsers) | Chromium + Firefox + WebKit |
| `npm run test:nightly:chromium` | Nightly (Chromium only) | Single browser |
| `npm run test:nightly:firefox` | Nightly (Firefox only) | Single browser |
| `npm run test:nightly:webkit` | Nightly (WebKit only) | Single browser |
| `npm run test:performance` | Performance benchmarks | Core Web Vitals |
| `npm run test:performance:report` | Performance test report | HTML report |

### Test Sharding (Parallel Execution)
| Command | Description | Notes |
|---------|-------------|-------|
| `npm run test:nightly:shard1` | Manual shard 1 | Parallel execution |
| `npm run test:nightly:shard2` | Manual shard 2 | Parallel execution |
| `npm run test:nightly:shard3` | Manual shard 3 | Parallel execution |
| `npm run test:nightly:sharded` | Automated sharding | Automatic distribution |

---

## Build Commands

| Command | Description | Notes |
|---------|-------------|-------|
| `npm run build` | Production build | Optimized bundle |
| `npm run preview` | Preview production build | Local preview server |
| `npm run analyze` | Bundle analysis | Size analysis |
| `npm run analyze-bundle` | Detailed bundle analysis | Verbose output |

---

## Utility Scripts

| Command | Description | Notes |
|---------|-------------|-------|
| `npm run coverage:analyze` | Coverage analysis | Detailed metrics |
| `npm run coverage:badges` | Generate coverage badges | For README |
| `npm run fetch-abilities` | Fetch ESO abilities data | Update abilities.json |
| `npm run download-report-data` | Download report data | For debugging |
| `npm run clean:test-data` | Clean test artifacts | Interactive cleanup |
| `npm run clean:test-data:force` | Clean test artifacts (no prompt) | Automated cleanup |
| `npm run health-check` | System health validation | Pre-deployment check |
| `node scripts/generate-version.cjs` | Generate version info | Build metadata |
| `node scripts/clean-version.cjs` | Clean version files | Cleanup |

---

## Cross-Platform Make Commands

### PowerShell (Windows)
| Command | Description |
|---------|-------------|
| `.\make.ps1 help` | Show all commands |
| `.\make.ps1 dev` | Start dev server |
| `.\make.ps1 test` | Run tests |
| `.\make.ps1 build` | Production build |
| `.\make.ps1 clean` | Clean artifacts |
| `.\make.ps1 clean-test-data` | Clean test data |

### Unix/Linux/macOS
| Command | Description |
|---------|-------------|
| `make help` | Show all commands |
| `make dev` | Start dev server |
| `make test` | Run tests |
| `make build` | Production build |
| `make clean` | Clean artifacts |
| `make clean-test-data` | Clean test data |

---

## Git Workflow (with twig)

**Recommended**: Use Git Workflow Agent Skill instead

| Command | Description | Notes |
|---------|-------------|-------|
| `twig tree` | Show branch tree | Visualize dependencies |
| `twig depend <parent>` | Set branch dependency | Stack branches |
| `twig cascade` | Cascade changes | Interactive mode |
| `twig cascade --force` | Cascade with force push | Non-interactive |
| `twig update` | Update twig cache | Refresh branch info |
| `gh pr status` | Check PR status | Requires GitHub CLI |
| `gh pr checks` | View CI status | GitHub Actions status |

**Prerequisites**: 
- `npm install -g @gittwig/twig`
- `gh auth login` (for PR operations)

---

## Jira Workflow (with acli)

**Recommended**: Use Jira Agent Skill instead (deprecated for AI agents)

| Command | Description |
|---------|-------------|
| `acli jira workitem view <key>` | View ticket details |
| `acli jira workitem transition --key <key> --status "In Progress"` | Change status |
| `acli jira workitem comment --key <key> --comment "..."` | Add comment |

---

## Configuration Files Reference

| File | Purpose | Used By |
|------|---------|---------|
| `package.json` | Dependencies and scripts | npm |
| `vite.config.mjs` | Build configuration | Vite |
| `jest.config.cjs` | Unit test configuration | Jest |
| `playwright.nightly.config.ts` | E2E test configuration | Playwright |
| `eslint.config.js` | Linting rules | ESLint 9 |
| `tsconfig.json` | TypeScript configuration | TypeScript compiler |
| `codegen.yml` | GraphQL code generation | GraphQL Code Generator |
| `Makefile` | Cross-platform build | Make |

---

## Common Workflows

### Pre-Commit Checklist
```bash
npm run validate    # TypeScript + ESLint + Prettier
npm test            # Unit tests
git add .
git commit -m "..."
```

### After GraphQL Schema Changes
```bash
npm run codegen     # Regenerate types
npm run typecheck   # Verify no errors
```

### Before Creating PR
```bash
npm run validate    # All checks
npm run test:full   # Full E2E suite
npm run build       # Verify production build
```

### Debugging Test Failures
```bash
npm run test:coverage          # See what's not covered
npm run test:full:headed       # Visual debugging
# Check playwright-report/ for details
```

---

## Environment Requirements

- **Node.js**: ≥20.0.0
- **Package Manager**: npm (with package-lock.json)
- **Memory**: --max-old-space-size=8192 (set in package.json)
- **Browsers**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Platform**: Windows, macOS, Linux

---

## Additional References

- **Tech Stack Details**: See [AGENTS_TECH_STACK.md](AGENTS_TECH_STACK.md)
- **Testing Strategy**: See [documentation/testing/](documentation/testing/)
- **CI/CD**: See [.github/workflows/](.github/workflows/)
