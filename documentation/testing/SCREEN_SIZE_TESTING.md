# Screen-size testing

ESO Toolkit uses Playwright for responsive behavior checks. The public, maintained
suite is deliberately smaller than the historical matrix and does not check in
screenshots from report routes or public pages.

## Maintained suite

`playwright/screen-sizes-fast.config.ts` defines 14 viewport profiles:

- Mobile: Android Small, iPhone SE, Mobile Portrait, and Mobile Landscape
- Tablet: Small Tablet, Tablet Portrait, and Tablet Landscape
- Laptop and desktop: Surface Pro, Laptop Standard, Desktop Standard, Desktop Large,
  and Desktop 2K
- Edge profiles: Breakpoint Critical and Ultrawide

`tests/screen-sizes/comprehensive-visual-regression.spec.ts` provides four
privacy-safe report-route behavior checks plus login, landing, and public calculator
route checks. Report pages are not screenshot baselined because report content can
include player-provided names; public-page screenshots are also left to reviewed,
local-only runs so stale branding cannot ship as a checked-in artifact.

## Commands

```bash
# Maintained 14-viewport suite; use this for release validation
npm run test:screen-sizes

# Device subsets, all using the maintained fast configuration
npm run test:screen-sizes:mobile
npm run test:screen-sizes:tablet
npm run test:screen-sizes:desktop
npm run test:screen-sizes:breakpoints

# Local diagnosis and reports
npm run test:screen-sizes:headed
npm run test:screen-sizes:ui
npm run test:screen-sizes:debug
npm run test:screen-sizes:report

```

The equivalent Make targets are `test-screen-sizes`,
`test-screen-sizes-mobile`, `test-screen-sizes-tablet`,
`test-screen-sizes-desktop`, and `test-screen-sizes-report`.

## Exploratory matrix

`playwright/screen-sizes.config.ts` retains the historical 22-profile matrix for
responsive exploration. Do not use it for a release gate; use the maintained
behavior suite instead:

```bash
npm run test:screen-sizes:matrix
make test-screen-sizes-matrix
```

This command excludes tests whose title contains `visual regression`. It is useful
for layout and route behavior exploration, but it is not a release gate.

## Test artifacts and privacy

Playwright writes the HTML/JSON report to `screen-size-report/` and failures to
`test-results-screen-sizes/`; both are gitignored. Traces, videos, and failure
screenshots can contain report data. Review them before sharing outside the
maintainer team and do not commit generated artifacts.

Public-page screenshots do not require a user login. Report-route tests can use
optional ESO Logs OAuth credentials in CI and fall back to unauthenticated/sample
behavior when credentials are unavailable. Set credentials only through environment
variables or repository secrets; never place tokens in test fixtures or snapshots.

The manual GitHub Actions workflow runs the maintained fast configuration on a
protected `main` ref. It can run all profiles or a device category and publishes
the resulting report to the configured reports repository.

## Local visual review

When a maintainer needs a visual diff for an intentional UI change, capture it
locally with the relevant Playwright project and review the image before sharing
it. Do not commit screenshots from report routes or generated test artifacts.
