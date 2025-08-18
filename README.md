
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

### Running Tests

- **Unit Tests (Jest):**
	```powershell
	npm test
	```
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
