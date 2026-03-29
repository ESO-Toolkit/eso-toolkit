/**
 * Types for the Discord ↔ Roster mapping feature.
 *
 * A RosterMapping links an ESO Toolkit roster to its Discord artifacts
 * (guild, channel, message). One mapping per roster per guild.
 *
 * A GuildConfig stores per-guild defaults for channel naming and category.
 */

// ── Roster ↔ Discord Mapping ───────────────────────────────────────────────

export interface RosterMapping {
  rosterId: string;
  guildId: string;
  channelId: string;
  messageId: string;
  categoryId?: string | undefined;
  channelNameOverride?: string | undefined;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Per-Guild Config ────────────────────────────────────────────────────────

export interface GuildConfig {
  guildId: string;
  /** Channel name template with tokens: {day-short}, {time}, {trial}, {tag} */
  namePattern: string;
  /** Default text channel to post rosters into (if set, skip channel creation) */
  defaultChannelId?: string | undefined;
  defaultCategoryId?: string | undefined;
  /** Discord role IDs to ping for tank/healer/dd sign-ups */
  rolePingIds?:
    | {
        tank?: string | undefined;
        healer?: string | undefined;
        dd?: string | undefined;
      }
    | undefined;
  /** Discord role IDs allowed to publish/refresh rosters. Empty = MANAGE_GUILD only. */
  allowedRoleIds?: string[] | undefined;
  /** IANA timezone for this guild (e.g. "America/New_York"). Defaults to America/New_York. */
  timezone?: string | undefined;
}

// ── Channel Name Context ────────────────────────────────────────────────────

export interface ChannelNameContext {
  dayShort?: string;
  time?: string;
  trial?: string;
  tag?: string;
}

// ── Roster Snapshot (from roster-hub-api) ───────────────────────────────────

export interface RosterSnapshot {
  id: string;
  title: string;
  description: string;
  trial_id: string;
  author_name: string;
  roster_data: string;
  tags: string[];
  vote_count: number;
  created_at: string;
  updated_at: string;
}

// ── Decoded roster data ────────────────────────────────────────────────────

export interface DecodedSkillLines {
  line1?: string;
  line2?: string;
  line3?: string;
  isFlex?: boolean;
}

export interface DecodedRosterSlot {
  playerName?: string | undefined;
  roleLabel?: string | undefined;
  sets?: string[] | undefined;
  buildRefName?: string | undefined;
  buildRefId?: string | undefined;
  positionTag?: string | undefined;
  playerNumber?: string | undefined;
  labels?: string[] | undefined;
  roleNotes?: string | undefined;
  ultimate?: string | undefined;
  skillLines?: DecodedSkillLines | undefined;
  groups?: string[] | undefined;
  groupName?: string | undefined;
  notes?: string | undefined;
  /** Healer buff (healers only) */
  healerBuff?: string | undefined;
  /** Healer champion point (healers only) */
  championPoint?: string | undefined;
  /** DPS slot number (DPS only) */
  slotNumber?: number | undefined;
  /** Jail DD type label (DPS only) */
  jailDDType?: string | undefined;
  /** Custom jail DD description (DPS only) */
  customDescription?: string | undefined;
}

export interface DecodedRoster {
  name?: string | undefined;
  trialId?: string | undefined;
  tanks: DecodedRosterSlot[];
  healers: DecodedRosterSlot[];
  dps: DecodedRosterSlot[];
  notes?: string | undefined;
}
