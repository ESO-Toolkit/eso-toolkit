/**
 * Gear Upgrade Optimizer — types
 *
 * A "what should I upgrade next?" engine. Given a player's current offensive
 * stats, it computes the *marginal* DPS gained by changing a single piece of
 * gear's trait, quality, or enchant. The output mirrors the community
 * upgrade-priority tables but is computed from the user's own build rather
 * than hardcoded from one parse.
 *
 * No runtime dependencies — pure types shared by the engine, catalog, and UI.
 */

/** Game mode affects the relevant penetration target / resistance defaults. */
export type GameMode = 'pve' | 'pvp';

/**
 * The offensive snapshot a marginal-DPS calculation needs. These are the only
 * quantities a single gear change can move; everything else (skill coefficient,
 * buffs that don't change) cancels in the before/after ratio.
 */
export interface BuildBaseline {
  /** Higher of Weapon or Spell Damage — whichever your damaging skills scale off. */
  weaponOrSpellDamage: number;
  /** Max Magicka or Max Stamina — whichever your damaging skills scale off. */
  maxStat: number;
  /** Total Critical Chance, percent (base 10 + sources). 0–100. */
  critChancePct: number;
  /** Total Critical Damage, percent (base 50 + sources). Capped at 125 in-game. */
  critDamagePct: number;
  /**
   * The build's Critical Damage cap, percent. Defaults to 125, but some passives
   * raise it (e.g. Nightblade's Above and Beyond, +30 → 155), which keeps
   * crit-damage upgrades valuable above 125 instead of clamping to 0.
   */
  critDamageCapPct?: number;
  /** Your offensive Penetration. */
  penetration: number;
  /** Target's Physical/Spell Resistance (boss ≈ 18,200 in PvE). */
  targetResistance: number;
  /** Which Mundus stone is slotted — determines what the Divines trait amplifies. */
  mundus: MundusStone;
  /**
   * Share of your damage dealt while the FRONT bar is active (0–1). Weapon
   * traits/quality/enchants only apply while their bar is active, so a front-bar
   * weapon upgrade is weighted by this and a back-bar one by (1 − this).
   * Jewelry and armor are always equipped, so they ignore it. When omitted,
   * weapon upgrades are unweighted (treated as fully applicable).
   */
  frontBarDamageShare?: number;
}

/**
 * Mundus stones relevant to damage. The Divines armor trait amplifies the
 * slotted stone, so its value is routed through whichever stat the stone gives.
 */
export type MundusStone =
  | 'thief' // Critical Chance (rating)
  | 'shadow' // Critical Damage
  | 'warrior' // Weapon Damage
  | 'apprentice' // Spell Damage
  | 'lover' // Penetration
  | 'mage' // Max Stat
  | 'other'; // no offensive stat (Atronach/Serpent/etc.) — Divines adds ~0 DPS

/**
 * A stat delta. The engine applies it on top of the baseline and re-derives the
 * relative-damage factor. Only set the fields an upgrade actually changes.
 */
export interface StatPackage {
  deltaWeaponOrSpellDamage?: number;
  deltaMaxStat?: number;
  /** Flat critical *rating* (converted to chance via the crit divisor). */
  deltaCritRating?: number;
  /** Critical *damage*, percentage points (added to the total, then capped). */
  deltaCritDamagePct?: number;
  deltaPenetration?: number;
  /** Multiplicative "damage done" modifier, percentage points (e.g. Bloodthirsty). */
  deltaDamageDonePct?: number;
}

/** Confidence in a catalog value, matching the rest of the toolkit's convention. */
export type Confidence = 'high' | 'medium' | 'low';

/** Slot family an upgrade applies to — drives the per-slot magnitude. */
export type SlotKind =
  | 'bigArmor' // chest, legs, head
  | 'smallArmor' // shoulders, hands, waist, feet
  | 'jewelry'
  | 'mainHand1H'
  | 'offHand1H'
  | 'frontBar2H'
  | 'backBar2H';

/** A single catalog entry: one trait/quality/enchant change on one slot kind. */
export interface UpgradeOption {
  /** Stable id, e.g. "trait-nothing-to-divines-bigArmor". */
  id: string;
  /** Section the row belongs to. */
  group: 'trait' | 'quality' | 'enchant';
  /** Human label for the change, e.g. "Nothing → Divines". */
  change: string;
  /** Slot family this applies to. */
  slot: SlotKind;
  /** Friendly slot label for the table, e.g. "Big Armor". */
  slotLabel: string;
  /**
   * The stat delta this change grants. For Mundus-dependent traits (Divines)
   * this is resolved at compute time from the baseline's mundus, so it is
   * provided as a function instead of a static package.
   */
  pkg: StatPackage | ((baseline: BuildBaseline) => StatPackage);
  /**
   * For weapon upgrades, the bar the weapon is on. Weapon stats only apply while
   * that bar is active, so the marginal gain is weighted by the build's
   * `frontBarDamageShare`. Omit for always-equipped jewelry/armor (global).
   */
  bar?: 'front' | 'back';
  /** Confidence in the magnitude above. */
  confidence: Confidence;
  /** Short provenance / note (UESP, in-game tooltip, or derivation). */
  note?: string;
  /**
   * Set when the change is genuinely not quantifiable from stats alone
   * (status-effect chance / front-bar weapon traits). Such rows are shown in
   * the qualitative guide, not the computed table.
   */
  qualitative?: boolean;
}

/** A computed table row: an upgrade option plus its marginal DPS for this build. */
export interface UpgradeResult extends UpgradeOption {
  /** Marginal DPS increase, percent (e.g. 0.32 means +0.32%). */
  dmgIncreasePct: number;
}
