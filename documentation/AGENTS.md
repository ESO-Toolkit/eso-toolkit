# ESO Log Aggregator - Agent Documentation

## Repository Overview

The **ESO Log Aggregator** is a React-based web application for analyzing Elder Scrolls Online (ESO) combat logs. It features data visualization, real-time analytics, and comprehensive testing infrastructure.

### Tech Stack

- **Frontend Framework**: React 19+ with TypeScript
- **Build Tool**: Vite 6.3+ with SWC
- **State Management**: Redux Toolkit with Redux Persist
- **Routing**: React Router DOM v7
- **GraphQL**: Apollo Client with Code Generation
- **UI Libraries**: 
  - Material-UI (MUI) v7
  - Emotion for styling
  - React Three Fiber for 3D visualization
  - Chart.js for data visualization
- **Testing**: Jest, Playwright, Testing Library
- **Code Quality**: ESLint 9, Prettier, TypeScript
- **Documentation**: Storybook
- **Monitoring**: Sentry
- **Deployment**: GitHub Pages

## Repository Structure

```
eso-log-aggregator/
├── src/                          # Main application source code
├── tests/                        # End-to-end tests (Playwright)
├── public/                       # Static assets and HTML template
├── scripts/                      # Build and utility scripts
├── documentation/                # Technical documentation
├── data/                        # Static data files (abilities.json)
├── .storybook/                  # Storybook configuration
├── coverage/                    # Test coverage reports (generated)
├── build/                       # Production build output (generated)
├── playwright-report*/          # Playwright test reports (generated)
└── Configuration Files:
    ├── package.json             # Dependencies and scripts
    ├── vite.config.mjs          # Vite build configuration
    ├── jest.config.cjs          # Jest testing configuration
    ├── playwright.*.config.ts   # Playwright E2E test configurations
    ├── eslint.config.js         # ESLint linting rules
    ├── tsconfig.json            # TypeScript configuration
    ├── codegen.yml              # GraphQL code generation
    └── Makefile                 # Cross-platform build commands
```

## Essential Tools & Configuration

### Build & Development Tools

1. **Vite** - Modern build tool with HMR
   - Configuration: `vite.config.mjs`
   - Plugins: React SWC, SVGR for SVG imports
   - Path aliases for cleaner imports (`@/`, `@components/`, etc.)

2. **TypeScript** - Static typing
   - Main config: `tsconfig.json`
   - Type checking: `tsconfig.typecheck.json`

3. **ESLint** - Code linting (Flat config format)
   - Configuration: `eslint.config.js`
   - Plugins: React, TypeScript, Import resolution

### Testing Infrastructure

1. **Jest** - Unit & Integration Testing
   - Main: `jest.config.cjs`
   - Coverage: `jest.coverage.config.cjs`
   - Smoke tests: `jest.smoke.config.cjs`
   - CRA compatibility: `jest.cra.config.cjs`

2. **Playwright** - End-to-End Testing
   - Main: `playwright.config.ts`
   - Nightly: `playwright.nightly.config.ts`
   - Smoke: `playwright.smoke.config.ts`
   - Supports sharding for parallel execution

3. **Testing Library** - Component testing utilities

### Code Quality & Formatting

1. **Prettier** - Code formatting
2. **TypeScript** - Type checking
3. **ESLint** - Linting with React/TypeScript rules

### GraphQL & Code Generation

1. **Apollo Client** - GraphQL client
2. **GraphQL Code Generator** - Auto-generates TypeScript types
   - Configuration: `codegen.yml`
   - Generates hooks and typed document nodes

## Essential Commands

### Development Workflow

```powershell
# Install dependencies
npm ci

# Start development server
npm run dev
# or
npm start

# Generate GraphQL types (required after schema changes)
npm run codegen

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check
```

### Testing Commands

```powershell
# Unit tests
npm test                    # Changed files only
npm run test:all           # All tests
npm run test:watch         # Watch mode
npm run test:changed       # Only changed files

# Coverage
npm run test:coverage      # Generate coverage report
npm run coverage:open      # Open coverage report in browser
npm run coverage:full      # Complete coverage workflow

# Nightly tests (comprehensive E2E)
npm run test:nightly:all   # All browsers
npm run test:nightly:chromium
npm run test:nightly:firefox
npm run test:nightly:webkit

# Smoke tests (quick validation)
npm run test:smoke         # Both unit and E2E
npm run test:smoke:unit
npm run test:smoke:e2e
```

### Build & Deployment

```powershell
# Production build
npm run build

# Preview production build
npm run preview

# Bundle analysis
npm run analyze
npm run analyze-bundle
```

### Makefile Commands (Cross-platform)

```powershell
# Windows PowerShell
.\make.ps1 help            # Show all available commands
.\make.ps1 dev             # Start development server
.\make.ps1 test            # Run tests
.\make.ps1 build           # Production build
.\make.ps1 clean           # Clean build artifacts

# Linux/macOS or Git Bash
make help                  # Show all available commands
make dev                   # Start development server
make test                  # Run tests
make build                 # Production build
make clean                 # Clean build artifacts
```

## Specialized Scripts

### Utility Scripts (scripts/ directory)

```powershell
# Coverage analysis
npm run coverage:analyze
npm run coverage:badges

# Bundle analysis
npm run analyze-bundle

# Data fetching
npm run fetch-abilities
npm run download-report-data

# Health checks
npm run health-check

# Version management
node scripts/generate-version.cjs
node scripts/clean-version.cjs
```

### Sharded Testing (CI/CD)

```powershell
# Manual sharding (parallel execution)
npm run test:nightly:shard1
npm run test:nightly:shard2
npm run test:nightly:shard3

# Automated sharding
npm run test:nightly:sharded
```

## Development Best Practices

### File Organization

- **Components**: `src/components/` (UI components)
- **Features**: `src/features/` (feature-specific code)
- **Store**: `src/store/` (Redux state management)
- **Types**: `src/types/` (TypeScript type definitions)
- **Utils**: `src/utils/` (utility functions)
- **GraphQL**: `src/graphql/` (queries, mutations, generated types)

### Path Aliases

The project uses TypeScript path mapping for cleaner imports:

```typescript
// Instead of: import { Component } from '../../components/Component'
import { Component } from '@components/Component'
import { utility } from '@utils/utility'
import { RootState } from '@store/types'
```

### Testing Strategy

1. **Unit Tests**: Jest for component and utility testing
2. **Integration Tests**: Testing Library for component integration
3. **E2E Tests**: Playwright for full user workflows
4. **Smoke Tests**: Quick validation of critical paths
5. **Nightly Tests**: Comprehensive cross-browser testing

### Code Quality Workflow

```powershell
# Complete validation workflow
npm run validate           # TypeScript + ESLint + Prettier
npm run typecheck         # TypeScript compilation check
npm run lint              # ESLint analysis
npm run format:check      # Prettier formatting check
```

## CI/CD Integration

The repository includes several GitHub Actions workflows:

- **PR Checks**: Automated testing and validation
- **Deploy**: Production deployment to GitHub Pages  
- **Coverage**: Automated coverage reporting with badges
- **Nightly Tests**: Comprehensive cross-browser testing

## Configuration Notes

### Environment Setup

- **Node.js**: ≥20.0.0 required
- **Package Manager**: npm (with `package-lock.json`)
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

### Memory Management

For large builds, the project uses increased memory allocation:
```json
"NODE_OPTIONS": "--max-old-space-size=8192"
```

### Cross-Platform Compatibility

The Makefile and PowerShell scripts ensure commands work across Windows, macOS, and Linux environments.

## Quick Start Checklist

1. ✅ Install Node.js 20+
2. ✅ Run `npm ci` to install dependencies
3. ✅ Run `npm run codegen` to generate GraphQL types
4. ✅ Run `npm run dev` to start development server
5. ✅ Run `npm run test` to verify setup
6. ✅ Run `npm run validate` before committing changes

## Troubleshooting

### Common Issues

- **GraphQL Errors**: Run `npm run codegen` after schema changes
- **Type Errors**: Run `npm run typecheck` to identify issues
- **Test Failures**: Check `npm run test:coverage` for detailed reports
- **Build Issues**: Clear cache with `make clean` or manual cleanup
- **Memory Issues**: Increase NODE_OPTIONS memory limit

### Performance Optimization

The project includes several performance optimizations:
- Bundle analysis tools
- Code splitting with Vite
- Optimized React components
- Efficient Redux state management
- Coverage thresholds and monitoring

For detailed technical documentation, see the `documentation/` directory.