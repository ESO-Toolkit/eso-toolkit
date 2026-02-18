<!-- AI Context: Load only when detailed tech stack information is needed -->
# Tech Stack & Project Structure

**Quick Overview**: React 19+ TypeScript app with Vite, Redux, Apollo GraphQL, Material-UI, and comprehensive testing.

---

## Core Technologies

### Frontend Framework
- **React 19+** with TypeScript
- **React Router DOM v7** for client-side routing
- Modern hooks-based architecture

### Build & Development
- **Vite 6.3+** with SWC plugin
- Hot Module Replacement (HMR)
- React SWC, SVGR plugins
- Path aliases configured

### State Management
- **Redux Toolkit** with type-safe patterns
- **Redux Persist** for state persistence
- Location: `src/store/`

### GraphQL
- **Apollo Client** with code generation
- **GraphQL Code Generator** (`codegen.yml`)
- Auto-generates TypeScript types and hooks
- Location: `src/graphql/`

### UI Libraries
- **Material-UI (MUI) v7** - Primary component library
- **Emotion** - CSS-in-JS styling solution
- **React Three Fiber** - 3D visualization
- **Chart.js** - Data visualization charts

### Testing Framework
- **Jest** - Unit and integration testing
  - Multiple configs: main, coverage, smoke, CRA compatibility
  - Location: `jest.*.config.cjs`
- **Playwright** - End-to-end testing
  - Configs: nightly, smoke, full, screen-sizes, performance
  - Location: `playwright.*.config.ts`
  - **Integration**: VS Code MCP Playwright tool
- **Testing Library** - Component testing utilities

### Code Quality
- **ESLint 9** - Flat config format
  - Plugins: React, TypeScript, Import resolution
  - Config: `eslint.config.mjs`
- **Prettier** - Code formatting
- **TypeScript** - Static type checking
  - Configs: main, node, scripts, typecheck
  - Location: `tsconfig.*.json`

### Documentation & Monitoring
- **Storybook** - Component documentation (`.storybook/`)
- **Sentry** - Error tracking and monitoring

### Deployment
- **GitHub Pages** - Production hosting
- **GitHub Actions** - CI/CD automation

---

## Directory Structure

```
eso-log-aggregator/
├── src/                          # Application source code
│   ├── components/               # React UI components
│   ├── features/                 # Feature-specific modules
│   ├── store/                    # Redux state management
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility and helper functions
│   └── graphql/                  # GraphQL queries, mutations, types
├── tests/                        # E2E tests (Playwright)
├── public/                       # Static assets and HTML template
├── scripts/                      # Build and utility scripts
├── documentation/                # Technical documentation
│   ├── ai-agents/                # AI agent guides
│   ├── features/                 # Feature documentation
│   ├── architecture/             # Architecture docs
│   └── testing/                  # Testing documentation
├── data/                         # Static data files (abilities.json)
├── .storybook/                   # Storybook configuration
├── coverage/                     # Test coverage reports (generated)
├── build/                        # Production build output (generated)
├── playwright-report/            # Playwright test reports (generated)
├── test-results/                 # Test artifacts (generated)
└── data-downloads/               # Downloaded report data (ignored)
```

---

## Path Aliases

Configured in `tsconfig.json` and `vite.config.mjs`:

| Alias | Resolves To | Usage Example |
|-------|-------------|---------------|
| `@/` | `src/` | `import { foo } from '@/utils/bar'` |
| `@components/` | `src/components/` | `import Button from '@components/Button'` |
| `@utils/` | `src/utils/` | `import { parse } from '@utils/parser'` |
| `@store/` | `src/store/` | `import { useAppDispatch } from '@store/hooks'` |

---

## Testing Strategy

### Unit Tests (Jest)
- **Target**: Components and utility functions
- **Location**: `src/**/*.test.ts(x)`
- **Configs**: 
  - `jest.config.cjs` - Main configuration
  - `jest/ci.config.cjs` - CI-optimized settings
  - `jest/smoke.config.cjs` - Quick validation
  - `jest/scribing.config.cjs` - Scribing-specific tests
  - `jest/integration.config.cjs` - Integration tests

### Integration Tests (Testing Library)
- **Target**: Component integration and interaction
- **Tools**: React Testing Library, DOM Testing Library

### E2E Tests (Playwright)
- **Target**: Full user workflows
- **Execution**: VS Code MCP Playwright tool (preferred) or CLI
- **Configs**:
  - `playwright/nightly.config.ts` - Comprehensive cross-browser
  - `playwright/smoke.config.ts` - Critical paths
  - `playwright/full.config.ts` - All non-nightly tests
  - `playwright/performance.config.ts` - Performance benchmarks
  - `playwright/screen-sizes.config.ts` - Responsive testing
- **Features**: Sharding support, parallel execution

---

## Code Quality Workflow

### Validation Pipeline
```bash
npm run validate  # Runs all checks:
  ├── npm run typecheck    # TypeScript compilation
  ├── npm run lint         # ESLint analysis
  └── npm run format:check # Prettier formatting
```

### Pre-Commit Recommended
```bash
npm run validate  # All checks
npm test          # Unit tests (changed files)
```

### CI/CD Workflows
- **PR Checks**: Automated testing and validation
- **Deployment**: Production to GitHub Pages
- **Coverage**: Automated reporting with badges
- **Nightly**: Comprehensive cross-browser testing

---

## Build Configuration

### Vite (`vite.config.mjs`)
- **Plugins**: React SWC, SVGR (SVG as components)
- **Optimization**: Code splitting, tree shaking
- **Development**: HMR, fast refresh

### TypeScript (`tsconfig.json`)
- **Target**: ES2020
- **Module**: ESNext
- **Strict Mode**: Enabled
- **Path Mapping**: Configured for aliases

### ESLint (`eslint.config.mjs`)
- **Format**: Flat config (ESLint 9+)
- **Plugins**: React, TypeScript, Import
- **Rules**: React Hooks, TypeScript-specific

---

## Environment Configuration

### Requirements
- **Node.js**: ≥20.0.0 required
- **Package Manager**: npm (with package-lock.json)
- **Memory**: --max-old-space-size=8192 (for large builds)

### Browser Support
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Platform Compatibility
- Windows
- macOS
- Linux

### Build Tool
- **Makefile** - Cross-platform (requires `make`)

---

## Performance Optimization

### Bundle Analysis
- **Tools**: `npm run analyze`, `npm run analyze-bundle`
- **Monitoring**: Bundle size tracking

### Code Splitting
- Vite-based automatic splitting
- Route-based lazy loading

### React Optimization
- Memo, useMemo, useCallback patterns
- Virtualization for large lists

### Redux Optimization
- Normalized state shape
- Selector memoization with Reselect
- Redux Persist for state hydration

### Coverage Monitoring
- Jest coverage thresholds
- Automated badge generation

---

## GraphQL Setup

### Code Generation (`codegen.yml`)
- **Input**: `public/schema.graphql`
- **Output**: `src/graphql/generated/`
- **Generates**:
  - TypeScript types
  - React hooks (useQuery, useMutation)
  - Typed document nodes

### Workflow
1. Schema changes in `public/schema.graphql`
2. Run `npm run codegen`
3. Import generated hooks: `import { useFightQuery } from '@/graphql/generated'`

---

## Agent Skills (MCP Servers)

### Available Skills
- **Testing & Dev** - Playwright testing, dev workflow automation
- **Jira Integration** - Automated work item management
- **Report Debugging** - Download and analyze production data
- **Git Workflow** - Branch management with twig
- **Post-Squash Rebase** - Automated branch tree rebasing

### Implementations
- **GitHub Copilot (VS Code)**: `.github/copilot-skills/*/` directories - MCP servers for Agent Skills

### Documentation
- Each skill has README.md with setup and usage instructions
- See [AGENTS.md](AGENTS.md) for quick reference

---

## File Organization Patterns

### Component Structure
```
src/components/
├── Button/
│   ├── Button.tsx
│   ├── Button.test.tsx
│   ├── Button.stories.tsx
│   └── index.ts
```

### Feature Module Structure
```
src/features/
├── report_summary/
│   ├── ReportSummaryPage.tsx
│   ├── components/
│   ├── hooks/
│   └── types.ts
```

### Redux Structure
```
src/store/
├── index.ts              # Store configuration
├── hooks.ts              # Typed hooks
├── slices/
│   ├── fightSlice.ts
│   └── uiSlice.ts
└── types.ts
```

---

## Deployment Process

### Production Build
```bash
npm run build             # Create optimized bundle
npm run preview           # Preview locally
```

### Output
- **Location**: `build/`
- **Assets**: Hashed filenames for cache busting
- **Optimization**: Minification, tree shaking

### GitHub Pages
- **Domain**: Configured in `build/CNAME`
- **Deployment**: Automated via GitHub Actions
- **SPA**: 404.html for client-side routing

---

## Quick Start Checklist

1. ✅ Install Node.js 20+
2. ✅ Run `npm ci` to install dependencies
3. ✅ Run `npm run codegen` to generate GraphQL types
4. ✅ Run `npm run dev` to start development server
5. ✅ Run `npm test` to verify setup
6. ✅ Run `npm run validate` before committing

---

## Troubleshooting

| Issue | Solution | Command |
|-------|----------|---------|
| GraphQL errors | Regenerate types | `npm run codegen` |
| Type errors | Check compilation | `npm run typecheck` |
| Test failures | View coverage | `npm run test:coverage` |
| Build issues | Clean cache | `make clean` |
| Memory issues | Increase limit | Edit NODE_OPTIONS in package.json |

---

## Additional Resources

- **Commands**: See [AGENTS_COMMANDS.md](AGENTS_COMMANDS.md)
- **Documentation**: See [documentation/INDEX.md](documentation/INDEX.md)
- **Architecture**: See [documentation/architecture/](documentation/architecture/)
- **Testing**: See [documentation/testing/](documentation/testing/)
