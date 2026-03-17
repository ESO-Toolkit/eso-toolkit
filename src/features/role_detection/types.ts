/**
 * Role Detection Types
 *
 * Types for the multi-signal role detection algorithm that classifies players
 * into one of seven roles: Main Tank, Off Tank, Parse DPS, Support DPS,
 * Group Healer, Shield Healer, or Buff Healer.
 */

/**
 * The six detectable player roles in ESO trial content.
 */
export enum DetectedRole {
  MainTank = 'main_tank',
  OffTank = 'off_tank',
  ParseDPS = 'parse_dps',
  SupportDPS = 'support_dps',
  GroupHealer = 'group_healer',
  ShieldHealer = 'shield_healer',
  BuffHealer = 'buff_healer',
}

/**
 * Human-readable labels for each detected role.
 */
export const ROLE_LABELS: Record<DetectedRole, string> = {
  [DetectedRole.MainTank]: 'Main Tank',
  [DetectedRole.OffTank]: 'Off Tank',
  [DetectedRole.ParseDPS]: 'Parse DPS',
  [DetectedRole.SupportDPS]: 'Support DPS',
  [DetectedRole.GroupHealer]: 'Group Healer',
  [DetectedRole.ShieldHealer]: 'Shield Healer',
  [DetectedRole.BuffHealer]: 'Buff Healer',
};

/**
 * Broad role category for the initial classification pass.
 */
export enum RoleCategory {
  Tank = 'tank',
  Healer = 'healer',
  DPS = 'dps',
}

/**
 * Raw signals extracted from combat log data for a single player in a fight.
 * These are computed before classification.
 */
export interface PlayerRoleSignals {
  playerId: number;
  playerName: string;

  // --- Taunt signals ---
  /** Total number of taunt ability casts (Puncture, Inner Fire, etc.) */
  tauntCastCount: number;
  /** Duration (ms) this player's taunt was active on the primary boss */
  tauntUptimeOnBossMs: number;
  /** Number of unique enemy IDs this player taunted */
  tauntedUniqueEnemies: number;

  // --- Gear signals ---
  /** Has a Shield (WeaponType=14) in off-hand or backup off-hand */
  hasShieldWeapon: boolean;
  /** Has a Frost Staff (WeaponType=13) in any weapon slot */
  hasFrostStaff: boolean;
  /** Number of body armor pieces (slots 0-6) that are Heavy (ArmorType=3) */
  heavyArmorCount: number;
  /** Set IDs from KnownSetIDs that are classified as tank support sets */
  tankSetIds: number[];
  /** Set IDs from KnownSetIDs that are classified as healer support sets */
  healerSetIds: number[];
  /** Set IDs from KnownSetIDs that are classified as DPS sets */
  dpsSetIds: number[];
  /** Set IDs from KnownSetIDs that are classified as support-DPS sets */
  supportDpsSetIds: number[];

  // --- Output signals ---
  /** Total damage dealt to enemies */
  totalDamage: number;
  /** Damage per second */
  dps: number;
  /** Total effective healing done (excluding overheal) */
  totalHealing: number;
  /** Healing per second */
  hps: number;
  /** Overheal / (healing + overheal), 0-1 */
  overhealRatio: number;
  /** This player's damage as a fraction of group total, 0-1 */
  damageShareOfGroup: number;
  /** This player's healing as a fraction of group total, 0-1 */
  healingShareOfGroup: number;

  // --- Defensive signals ---
  /** Total damage received from enemies */
  damageTaken: number;
  /** This player's damage taken as a fraction of group total, 0-1 */
  damageTakenShareOfGroup: number;
  /** Number of hits that had a non-zero `blocked` value */
  blockedHitCount: number;
  /** Total number of hits taken */
  totalHitsTaken: number;

  // --- Buff/support signals ---
  /** Number of Aggressive Horn (40223) or War Horn (40222) casts */
  hornCasts: number;
  /** Number of Barrier / Reviving Barrier / Replenishing Barrier casts */
  barrierCasts: number;
  /** Number of unique allies this player applied Major Courage to */
  majorCourageTargets: number;

  // --- Absorb/shield signals ---
  /**
   * Total shield (absorb) value this player granted to OTHER players,
   * estimated from heal events where the target's absorb increased.
   */
  shieldAppliedToOthers: number;

  // --- Buff diversity signals ---
  /** Number of distinct buff ability IDs this player applied to OTHER players */
  uniqueBuffTypesApplied: number;
  /** Number of distinct allies this player applied any buff to */
  uniqueTargetsBuffed: number;

  // --- Offensive buff category signals ---
  /**
   * Number of offensive buff categories this player applied to others.
   * Categories include: Major Slayer, Powerful Assault, Major Force (Horn),
   * Major Berserk, Minor Heroism, Cinder Storm, Minor Sorcery, Minor Savagery.
   * Used by the buff healer classification (Model B hybrid: ≥ 2 = buff healer gate).
   */
  offensiveBuffCategoryCount: number;
}

/**
 * Final classification result for a single player in a fight.
 */
export interface PlayerRoleResult {
  playerId: number;
  playerName: string;
  /** The detected role */
  role: DetectedRole;
  /** Confidence score 0-100 */
  confidence: number;
  /** The raw signals that informed this classification */
  signals: PlayerRoleSignals;
}

/**
 * Full result of role detection for a fight.
 */
export interface FightRoleDetectionResult {
  fightId: number;
  fightDurationMs: number;
  playerCount: number;
  results: PlayerRoleResult[];
}
