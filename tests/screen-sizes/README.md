# Screen-size tests

These Playwright suites check responsive behavior for ESO Toolkit. The maintained
suite uses `playwright/screen-sizes-fast.config.ts`: 14 representative viewport
profiles, public route assertions, and four privacy-safe report-route behavior
checks. No screenshots are checked in because report content can contain
player-provided names and generated public baselines become stale branding.

## Maintained commands

Run the maintained suite with the npm or Make command:

```bash
npm run test:screen-sizes
make test-screen-sizes
```

The command uses the fast configuration. Run a category when iterating on a
specific viewport group:

```bash
npm run test:screen-sizes:mobile
npm run test:screen-sizes:tablet
npm run test:screen-sizes:desktop
npm run test:screen-sizes:breakpoints
```

Use `npm run test:screen-sizes:headed`, `:ui`, or `:debug` for local diagnosis.
View the generated report with `npm run test:screen-sizes:report`.

## Test files

- `comprehensive-visual-regression.spec.ts` contains the maintained route checks.
- `single-page-validation.spec.ts` and `basic-loading-detection.spec.ts` provide
  lightweight responsive smoke coverage.
- The remaining specs cover focused exploratory panel and data-loading scenarios;
  they do not add checked-in visual baselines.
- `utils.ts`, `shared-preprocessing.ts`, and `test-optimization.ts` provide test
  setup, caching, and stability helpers.

## Exploratory responsive runs

Do not use the broader 22-profile configuration with visual assertions. For an
exploratory responsive run without screenshot comparisons, use:

```bash
npm run test:screen-sizes:matrix
make test-screen-sizes-matrix
```

The matrix command uses `playwright/screen-sizes.config.ts` and excludes tests
whose title contains `visual regression`; it is an exploratory responsive run,
not a release gate.

Reports are written to the gitignored `screen-size-report/` directory and test
artifacts to `test-results-screen-sizes/`. Do not commit generated reports,
screenshots, traces, or downloaded test data.

## Privacy and credentials

Public-page screenshot tests run without a user login. Report-route behavior tests
use the configured public/sample report data and may use optional CI credentials
to exercise the API path. Credentials are read from environment variables and
must never be committed. Keep report screenshots and traces out of pull requests
unless they have been reviewed for player-provided data.

For the full test workflow, see
[documentation/testing/SCREEN_SIZE_TESTING.md](../../documentation/testing/SCREEN_SIZE_TESTING.md).
