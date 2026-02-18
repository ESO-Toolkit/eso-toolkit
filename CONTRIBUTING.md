# Contributing to ESO Log Aggregator

Thank you for your interest in contributing! This is a community tool built for ESO players, and contributions are welcome.

## Before You Start

- Read the [CLA](CLA.md) — you'll need to sign it when you open your first pull request.
- Check [open issues](https://github.com/ESO-Toolkit/eso-toolkit/issues) before starting new work to avoid duplicating effort.
- For significant changes, open an issue first to discuss the approach.

## Development Setup

```powershell
# Install Node.js 20+ first, then:
npm ci
npm run codegen     # generate GraphQL types
npm run dev         # start dev server
```

See [README.md](README.md) for full setup and testing instructions.

## Making Changes

1. Fork the repo and create a feature branch from `main`.
2. Keep commits focused — one logical change per commit.
3. Run the full validation suite before pushing:
   ```powershell
   npm run validate  # typecheck + lint + format
   npm test          # unit tests
   ```
4. Open a pull request against `main`. The PR template will walk you through the checklist.

## Pull Request Guidelines

- Provide a clear summary of what changed and why.
- Include or update tests for any logic changes.
- Keep PRs small and reviewable — large PRs take longer to merge.
- The CLA check must pass before merge. If prompted, comment exactly:
  ```
  I have read the CLA Document and I hereby sign the CLA
  ```

## Code Style

- TypeScript — always use types; avoid `any`.
- Follow existing patterns in the codebase.
- `npm run lint:fix` and `npm run format` handle most style issues automatically.

## Reporting Bugs

Open a [GitHub issue](https://github.com/ESO-Toolkit/eso-toolkit/issues/new) with:
- Steps to reproduce
- Expected vs. actual behaviour
- Browser/OS and any relevant console errors

## Security Issues

Please do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

## License

By contributing you agree that your contributions will be licensed under the same terms as this project. See [LICENSE](LICENSE) and [CLA.md](CLA.md).
