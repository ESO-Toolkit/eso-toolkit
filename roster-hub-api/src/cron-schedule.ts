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
 * One expression with a list — `0 4,10,16,22 * * *` — is a SINGLE trigger that
 * fires at every listed hour, so it fits in the one slot this worker has. The
 * cost is that `event.cron` is then the same string for every firing and can no
 * longer tell them apart; the fire time can.
 *
 * Four firings rather than two because the DPS ingest now fetches one ranking
 * board PER CLASS, which costs ~7 subrequests per boss instead of 2 and so
 * covers fewer bosses per run. Extra fire times are free — they cost no
 * additional trigger slots — and restore the rotation to ~1.5 days.
 */

/**
 * UTC window treated as the full daily pass: [start, end).
 *
 * A WINDOW, not `=== 4`, and not the old `< 12`. Exact equality would drop the
 * roster sync entirely for a day if a firing were ever reported slightly off
 * the hour, while `< 12` would run it twice now that the schedule also fires at
 * 10:00. The window ends before the 10:00 firing, so exactly one pass a day
 * qualifies.
 */
const FULL_RUN_START_UTC_HOUR = 4;
const FULL_RUN_END_UTC_HOUR = 10;

/**
 * True when this firing should do the full daily work (temp-build cleanup and
 * the roster sync) in addition to the DPS parse ingest that runs every time.
 *
 * Keyed off the scheduled time rather than the cron string so a combined
 * `0 4,10,16,22 * * *` expression still distinguishes the morning pass from the
 * DPS-only ones.
 */
export function isFullDailyRun(scheduledTimeMs: number): boolean {
  const hour = new Date(scheduledTimeMs).getUTCHours();
  return hour >= FULL_RUN_START_UTC_HOUR && hour < FULL_RUN_END_UTC_HOUR;
}
