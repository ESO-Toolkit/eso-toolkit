# ESO Log Aggregator

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

For detailed testing documentation, see [tests/README.md](tests/README.md).

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
