# ESO Log Aggregator

This project contains only the web application, built with React, TypeScript, GraphQL, Apollo Client, Material UI, Storybook, Jest, and Playwright.

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

**Coverage System Features:**
- **Comprehensive Reporting**: HTML, LCOV, JSON, and console output
- **Enhanced Analysis**: Detailed insights with actionable recommendations
- **Visual Badges**: SVG badges for documentation integration
- **Multi-Environment Support**: Development, CI/CD, and strict mode configurations
- **Custom Thresholds**: Different targets for utils (90%), hooks (85%), store (85%)

**Coverage Badges:** ![Coverage](coverage/badges/coverage-overall.svg)

For detailed coverage documentation, see [docs/COVERAGE.md](docs/COVERAGE.md).

- **End-to-End Tests (Playwright):**
  ```powershell
  cd apps/testing/eso-log-aggregator-e2e
  npx playwright test
  ```

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
