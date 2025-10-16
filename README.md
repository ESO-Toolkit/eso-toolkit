# ESO Log Aggregator

<!-- Status Badges -->

[![Build Status](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/pr-checks.yml/badge.svg?branch=master)](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/pr-checks.yml)
[![Deploy Status](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/deploy.yml)
[![Coverage Workflow](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/coverage.yml/badge.svg?branch=master)](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/coverage.yml)
[![Nightly Tests](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/nightly-tests.yml/badge.svg)](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/nightly-tests.yml)

<!-- Coverage Badges -->

[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/bkrupa/845FAC04DEF12C179B425A5699EC6ABC/raw/coverage-overall.json&style=flat)](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/coverage.yml)
[![Lines](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/bkrupa/845FAC04DEF12C179B425A5699EC6ABC/raw/coverage-lines.json&style=flat)](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/coverage.yml)
[![Functions](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/bkrupa/845FAC04DEF12C179B425A5699EC6ABC/raw/coverage-functions.json&style=flat)](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/coverage.yml)
[![Branches](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/bkrupa/845FAC04DEF12C179B425A5699EC6ABC/raw/coverage-branches.json&style=flat)](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/coverage.yml)

<!-- Additional Info Badges -->

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-blue?style=flat&logo=github)](https://esotk.com/#/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=flat&logo=node.js)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)

> **Note**: Coverage badges are automatically generated and updated via GitHub Gist endpoints. They show real-time coverage from the dedicated [Coverage Workflow](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/coverage.yml). Detailed coverage reports and PR comments are available in the workflow runs.

This project contains only the web application, built with React, TypeScript, GraphQL, Apollo Client, Material UI, Storybook, Jest, and Playwright.

## Useful Links

- [Deployment](https://esotk.com/#/)
- [Jira](https://bkrupa.atlassian.net/jira/software/projects/ESO/boards/1/)
- [Sentry](https://bkrupa.sentry.io/dashboards/)

## Getting Started

### Install Dependencies
```

<!-- Additional Info Badges -->

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-blue?style=flat&logo=github)](https://bkrupa.github.io/eso-log-aggregator/#/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=flat&logo=node.js)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)

> **Note**: Coverage badges are automatically generated and updated via GitHub Gist endpoints. They show real-time coverage from the dedicated [Coverage Workflow](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/coverage.yml). Detailed coverage reports and PR comments are available in the workflow runs.

This project contains only the web application, built with React, TypeScript, GraphQL, Apollo Client, Material UI, Storybook, Jest, and Playwright.

## 📚 Documentation

**[Complete Documentation Index →](documentation/INDEX.md)**

### Quick Links

- **[AI Agent Documentation](documentation/ai-agents/)** - Guides for AI agents (Scribing, Playwright, Jira, Preloading)
- **[Feature Documentation](documentation/features/)** - Feature-specific implementation guides
- **[Architecture](documentation/architecture/)** - System design and architectural patterns
- **[Fixes & Resolutions](documentation/fixes/)** - Bug fixes and issue resolutions
- **[Implementation Summaries](documentation/implementation/)** - Jira ticket implementations
- **[Developer Guide](documentation/AGENTS.md)** - Complete development workflows

### For Developers
- Start with [AGENTS.md](documentation/AGENTS.md) for development workflows
- Review [Architecture Overview](documentation/architecture/system-architecture.md) for system design
- Check [Feature Documentation](documentation/features/) for specific features

### For AI Agents
- See [AI Agent Documentation](documentation/ai-agents/) for comprehensive guides
- Use Quick Reference cards for rapid lookups
- Follow workflows in [Jira Integration](documentation/ai-agents/jira/)

## Useful Links

- [Deployment](https://bkrupa.github.io/eso-log-aggregator/#/)
- [Jira](https://bkrupa.atlassian.net/jira/software/projects/ESO/boards/1/)
- [Sentry](https://bkrupa.sentry.io/dashboards/)

## Getting Started

### Install Dependencies

```powershell
npm ci
```

### Code Generation (GraphQL)

Generates TypeScript types and hooks from GraphQL queries:

```powershell
npm run codegen
```

### Running the Application (UI)

```powershell
cd apps/ui/eso-log-aggregator
npm start
```

### Building the Application

The project uses SWC (Speedy Web Compiler) instead of the default TypeScript compiler for faster builds:

```powershell
npm run build
```

**Build Performance:**

- **SWC Compiler**: Fast TypeScript/JSX compilation with Rust-based SWC
- **Configuration**: Managed through `craco.config.js` with environment-specific settings
- **Benefits**: Faster build times, smaller bundle sizes, and better optimization

### Running Tests

- **Unit Tests (Jest):**

  ```powershell
  npm test
  ```

- **Unit Tests with Coverage:**

  ```powershell
  npm run test:coverage
  ```

- **Nightly Regression Tests (Playwright):**

  ```powershell
  npm run test:nightly:chromium
  ```

- **Smoke Tests (Quick E2E validation):**

  ```powershell
  npm run test:smoke:e2e
  ```

- **Screen Size Testing (All Devices):**

  ```powershell
  npm run test:screen-sizes
  ```

- **Screen Size Testing (Mobile Only):**

  ```powershell
  npm run test:screen-sizes:mobile
  ```

- **Screen Size Testing (View Report):**

  ```powershell
  npm run test:screen-sizes:report
  ```

- **Coverage Analysis:**

  ```powershell
  npm run coverage:analyze
  ```

- **Generate Coverage Badges:**

  ```powershell
  npm run coverage:badges
  ```

- **Complete Coverage Workflow:**
  ```powershell
  npm run coverage:full
  ```

**Testing Features:**

- **Unit Testing**: Jest with React Testing Library for component and utility testing
- **E2E Testing**: Playwright with cross-browser support (Chromium, Firefox, WebKit)
- **API Mocking**: Complete external service mocking for reliable tests
- **Coverage Analysis**: Comprehensive reporting with actionable insights
- **Visual Testing**: Playwright traces and screenshots for debugging

**E2E Test Coverage:**

- ✅ Home page loading and navigation
- ✅ Report page with fight details
- ✅ API mocking (ESO Logs, Sentry, CDN)
- ✅ Error handling and edge cases
- ✅ Cross-browser compatibility
- ✅ **Screen size validation (22+ devices)**
- ✅ **Visual regression testing**
- ✅ **Responsive design validation**

**Screen Size Testing:**

- **Device Coverage**: Mobile, tablet, desktop, ultrawide displays
- **Visual Regression**: Automatic screenshot comparison across screen sizes
- **Performance Testing**: Load time validation per viewport
- **Accessibility**: Touch target and readability validation
- **GitHub Integration**: On-demand testing via GitHub Actions
- **Live Reports**: View results at `https://[username].github.io/[repo]/screen-size-reports/`

**Offline Testing System:**

- **3x Faster Tests**: Pre-downloaded data eliminates API latency during test execution
- **Smart Caching**: GitHub Actions automatically cache 3.87 GB of test data for ~7 days
- **Graceful Fallback**: Tests automatically fall back to online mode when needed
- **Zero Repository Bloat**: Large data files excluded from git, downloaded on-demand
- **Local Development**: Run `npm run download-test-data` for offline testing locally

For detailed testing documentation, see [tests/README.md](tests/README.md).
For screen size testing, see [documentation/SCREEN_SIZE_TESTING.md](documentation/SCREEN_SIZE_TESTING.md).
For offline testing, see [OFFLINE_TESTING.md](OFFLINE_TESTING.md).

**Coverage System Features:**

- **Comprehensive Reporting**: HTML, LCOV, JSON, and console output
- **Enhanced Analysis**: Detailed insights with actionable recommendations
- **Visual Badges**: SVG badges for documentation integration
- **Multi-Environment Support**: Development, CI/CD, and strict mode configurations
- **Custom Thresholds**: Different targets for utils (90%), hooks (85%), store (85%)

**Coverage Badges:** ![Coverage](coverage/badges/coverage-overall.svg)

For detailed coverage documentation, see [docs/COVERAGE.md](docs/COVERAGE.md).

### Linting & Formatting

```powershell
npm run lint
npm run format
```

### Storybook

Run Storybook for UI component development:

```powershell
cd apps/ui/eso-log-aggregator
npm run storybook
```

## Architecture

The ESO Log Aggregator uses a sophisticated architecture to achieve high-performance 3D visualization of combat encounters. The Fight Replay system renders 50+ actors at stable 60fps through advanced optimization patterns.

### System Overview

The application is organized into six distinct layers:

1. **Presentation Layer** - UI components (FightReplay, PlaybackControls)
2. **Orchestration Layer** - Custom hooks (usePlaybackAnimation, useAnimationTimeRef)
3. **3D Rendering Layer** - React Three Fiber scene (Arena3D, AnimationFrameActor3D)
4. **Data Layer** - Pre-computed lookups (TimestampPositionLookup, MapTimeline)
5. **Worker Processing Layer** - Web Workers for heavy computation
6. **State Layer** - Redux store for application state

### Key Performance Optimizations

- **Dual Time System**: Separates high-frequency (60fps) rendering from low-frequency (2-10Hz) React updates
- **O(1) Position Lookups**: Mathematical indexing for instant actor position queries
- **Shared Geometries**: 95% memory reduction by reusing 3D geometries across actors
- **Direct THREE.js Manipulation**: Bypasses React reconciliation for smooth 60fps updates
- **Web Worker Processing**: Heavy computation runs in background threads

### Architecture Documentation

For detailed architecture documentation, see:

- **[System Architecture](documentation/architecture/system-architecture.md)** - Complete system overview with layer diagrams
- **[Data Flow](documentation/architecture/data-flow.md)** - End-to-end data flow visualization
- **[Worker Dependencies](documentation/architecture/worker-dependencies.md)** - Worker task dependency graph
- **[Component Hierarchy](documentation/architecture/component-hierarchy.md)** - React component tree with render priorities
- **[Performance Patterns](documentation/architecture/performance-patterns.md)** - Optimization techniques with code examples

### Quick Start for Developers

1. **Install Dependencies**: `npm ci`
2. **Generate GraphQL Types**: `npm run codegen`
3. **Start Development**: `npm run dev`
4. **Run Tests**: `npm test`
5. **Review Architecture**: Read [System Architecture](documentation/architecture/system-architecture.md)

### Performance Metrics

- ✅ **60fps** stable playback with 50+ actors
- ✅ **<50ms** timeline scrubbing latency
- ✅ **O(1)** position lookups via pre-computed indexing
- ✅ **~150-300MB** memory footprint with geometry sharing
- ✅ **2-5 seconds** initial load time for large fights

## Debugging

### Debugging the UI

- Use VS Code's built-in debugger for React/TypeScript.
- Set breakpoints in `apps/ui/eso-log-aggregator/src`.
- Start the app and attach the debugger.

### Debugging Tests

- For Jest: Use VS Code's Jest extension or run with `node --inspect-brk node_modules/.bin/jest`.
- For Playwright: Use Playwright's debug mode (`npx playwright test --debug`).

### Sample Data for Testing

You can download real ESO logs data for testing and debugging using the report data downloader script. See [scripts/README.md](scripts/README.md) for detailed documentation.

**Quick Start:**

```powershell
# Download all fights from a report
npx ts-node --esm scripts/download-report-data.ts ABC123DEF

# Download specific fight only
npx ts-node --esm scripts/download-report-data.ts ABC123DEF 1

# Analyze scribing skills in downloaded data
npx ts-node --esm scripts/examples/analyze-scribing-skills.ts ABC123DEF
```

**Requirements:**

- Set `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` environment variables with your ESO Logs API credentials
- Data is saved to `./sample-data/<report-code>/` with organized folder structure
- Perfect for reproducing issues with scribing skills, buff analysis, or other features

The `sample-data/` folder is automatically ignored by Git to prevent accidental commits of large data files.

## CI/CD

- GitHub Actions run build, lint, format, test, and deploy workflows on PRs and main branch.
- See `.github/workflows/` for details.

## Troubleshooting

- If you see module resolution errors, try deleting `node_modules` and `package-lock.json`, then run `npm ci`.
- Ensure all required dependencies are installed.
- For GraphQL errors, re-run `npm run codegen`.

---

For more details, see individual README files in subfolders or ask for help!

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
