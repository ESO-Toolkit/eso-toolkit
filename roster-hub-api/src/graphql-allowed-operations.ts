/**
 * Operations the GraphQL proxy will forward to ESO Logs with the site's shared
 * client-credentials token.
 *
 * Kept in its own module (no hono / Workers imports) so the build-time manifest
 * generator — `scripts/generate-graphql-manifest.ts`, which runs in plain Node —
 * can import the same list the Worker enforces.
 *
 * Every name here must have at least one pinned document in
 * graphql-query-manifest.ts; the proxy rejects an operation with no pinned
 * document, and src/graphql/graphqlQueryManifest.test.ts fails if the two
 * lists diverge. Adding a name without shipping its query document therefore
 * cannot silently reopen the "any body under an allowed name" hole.
 */
export const ALLOWED_OPERATIONS = new Set([
  'getBuffEvents',
  'getDebuffEvents',
  'getDamageEvents',
  'getResourceEvents',
  'getCombatantInfoEvents',
  'getCastEvents',
  'getHealingEvents',
  'getDeathEvents',
  'getPlayersForReport',
  'getReportByCode',
  'getReportMasterData',
  'getReportPlayersOnly',
  'getAbilities',
  'getAbility',
  'getClass',
  'getClasses',
  'getTrialZones',
  'getEncounterFightRankings',
  'getEncounterInfo',
  'getTrialZonesMetadata',
  'getLatestReports',
  'getGuildById',
  'getGuilds',
  'getGuildByName',
  'getGuildAttendance',
  'getGuildMembers',
  'getBatchEventsForSummary',
  'getProfileUploadedReports',
]);
