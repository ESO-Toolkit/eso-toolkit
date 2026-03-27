/**
 * Roster ↔ Discord integration module.
 *
 * Re-exports all public types and functions from submodules.
 */

export type {
  RosterMapping,
  GuildConfig,
  ChannelNameContext,
  RosterSnapshot,
  DecodedRoster,
  DecodedRosterSlot,
} from './types.js';

export {
  getMappingByRosterId,
  getMappingByChannelId,
  upsertMapping,
  deleteMappingForRoster,
  listMappingsForGuild,
  getGuildConfig,
  upsertGuildConfig,
  getDefaultGuildConfig,
  DEFAULT_NAME_PATTERN,
} from './kv.js';

export { buildChannelName, resolveChannelName } from './channel-name.js';

export { buildRosterEmbed, buildRosterActionRows } from './embed-builder.js';

export { decodeRosterData } from './decoder.js';

export { fetchRosterSnapshot } from './api.js';

export { publishRoster, refreshRoster } from './publish.js';
export type { PublishRequest, PublishResult, RefreshResult } from './publish.js';
