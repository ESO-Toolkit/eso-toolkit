/**
 * Which work a scheduled invocation should do.
 *
 * The worker wants two passes a day — a full one in the morning and a
 * DPS-ingest-only one in the afternoon — but the Cloudflare account is on the
 * free plan, capped at FIVE cron triggers across ALL workers, and four of those
 * belong to other projects. Declaring two separate crons here therefore fails
 * to register at deploy time (`code: 10072`), silently leaving the second pass
 * not running at all.
 *
 * One expression with a list — `0 4,16 * * *` — is a SINGLE trigger that fires
 * at both hours, so it fits in the one slot this worker has. The cost is that
 * `event.cron` is then the same string for both firings and can no longer tell
 * them apart; the fire time can.
 */

/** UTC hour before which a firing is treated as the full daily pass. */
const FULL_RUN_BEFORE_UTC_HOUR = 12;

/**
 * True when this firing should do the full daily work (temp-build cleanup and
 * the roster sync) in addition to the DPS parse ingest that runs every time.
 *
 * Keyed off the scheduled time rather than the cron string so a combined
 * `0 4,16 * * *` expression still distinguishes the morning pass from the
 * afternoon one.
 */
export function isFullDailyRun(scheduledTimeMs: number): boolean {
  return new Date(scheduledTimeMs).getUTCHours() < FULL_RUN_BEFORE_UTC_HOUR;
}
