import { getBaseUrl } from './envUtils';

/**
 * Curated sample report codes whose report metadata is bundled as static JSON
 * in `public/sample-reports/<code>/report.json`.
 *
 * These allow the /sample-report page and the report fight-list view to work
 * without authentication — the data is served from our own origin instead of
 * being fetched from the ESO Logs GraphQL API.
 */
const SAMPLE_REPORT_CODES: ReadonlySet<string> = new Set([
  'F4f2bMwWtgVKxjB9', // Dreadsail Reef – DSR Day 34 Reef Resets??
  'YArFDbq7BdhwL691', // Sanity's Edge / Lucent Citadel
]);

/**
 * Returns `true` when `code` is one of the bundled sample reports.
 *
 * Callers can use this to:
 * - bypass the `AuthenticatedRoute` gate for the report overview page
 * - skip the ESO Logs API call and fetch from bundled JSON instead
 */
export const isSampleReport = (code: string | null | undefined): boolean =>
  typeof code === 'string' && SAMPLE_REPORT_CODES.has(code);

/** All sample report codes as an array (useful for iteration / random selection). */
export const SAMPLE_REPORT_LIST: ReadonlyArray<string> = [...SAMPLE_REPORT_CODES];

/**
 * Build the URL for a bundled sample report JSON file served from `public/`.
 *
 * Resolves against Vite's base URL (`getBaseUrl()`) so the file is fetched from
 * `<base>/sample-reports/…` rather than the origin root. A root-relative path
 * would 404 on any non-root deployment — e.g. the GitHub Pages PR previews
 * served under `/dev-previews/pr-<n>/` — which surfaced the bundled sample as
 * an empty log. `getBaseUrl()` always returns a value ending in `/`.
 */
export const getSampleReportUrl = (code: string): string =>
  `${getBaseUrl()}sample-reports/${code}/report.json`;
