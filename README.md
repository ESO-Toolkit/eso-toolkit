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

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-blue?style=flat&logo=github)](https://bkrupa.github.io/eso-log-aggregator/#/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=flat&logo=node.js)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)

> **Note**: Coverage badges are automatically generated and updated via GitHub Gist endpoints. They show real-time coverage from the dedicated [Coverage Workflow](https://github.com/bkrupa/eso-log-aggregator/actions/workflows/coverage.yml). Detailed coverage reports and PR comments are available in the workflow runs.

This project contains only the web application, built with React, TypeScript, GraphQL, Apollo Client, Material UI, Storybook, Jest, and Playwright.

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

- **End-to-End Tests (Playwright):**

  ```powershell
  npm run test:e2e
  ```

- **End-to-End Tests (Headed Mode):**

  ```powershell
  npm run test:e2e:headed
  ```

- **End-to-End Tests (Interactive UI):**

  ```powershell
  npm run test:e2e:ui
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

For detailed testing documentation, see [tests/README.md](tests/README.md).
For screen size testing, see [documentation/SCREEN_SIZE_TESTING.md](documentation/SCREEN_SIZE_TESTING.md).

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
