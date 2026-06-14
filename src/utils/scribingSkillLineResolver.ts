import { SCRIBING_ICON_OVERRIDES } from '../data/skill-lines/generated/scribingIconOverrides';

/**
 * Resolve a scribed ability to the skill line that owns its grimoire.
 *
 * Scribing morphs (e.g. "Dazing Trample", "Magical Banner", "Sundering Smash")
 * are generated per focus/signature script. They never appear in the static
 * skill-line registry — not by id (each script combination mints a fresh id) and
 * not by name (the morphed name differs from the base grimoire). So the normal
 * id/name lookup misses them and the tooltip falls through to "Unknown Skill
 * Line", even though the ability clearly belongs to a known line.
 *
 * The one signal that survives every morph is the grimoire icon
 * (`ability_grimoire_<line>`). Every grimoire is owned by exactly one skill line,
 * so the icon deterministically identifies the line. We read the icon from the
 * generated id -> icon table (authoritative, works before master data loads) and
 * fall back to the live master-data icon when an id is not in the table.
 */

export interface ScribingSkillLineLabel {
  /** Class/weapon label, matching what the skill-line registry renders for the line. */
  className: string;
  /** Skill line display name, matching the owning line in the registry. */
  skillLineName: string;
}

// Grimoire icon -> owning skill line. className/skillLineName mirror the values
// the skill-line registry produces for the owning line, so a scribed morph reads
// identically to its base skill in the line. Two Soul Magic grimoires (Wield Soul
// and Soul Burst) share the same line.
const GRIMOIRE_ICON_TO_SKILL_LINE: Record<string, ScribingSkillLineLabel> = {
  ability_grimoire_1handed: { className: 'Weapon', skillLineName: 'One Hand and Shield' },
  ability_grimoire_2handed: { className: 'Weapon', skillLineName: 'Two Handed' },
  ability_grimoire_bow: { className: 'Weapon', skillLineName: 'Bow' },
  ability_grimoire_dualwield: { className: 'Weapon', skillLineName: 'Dual Wield' },
  ability_grimoire_staffdestro: { className: 'Weapon', skillLineName: 'Destruction Staff' },
  ability_grimoire_staffresto: { className: 'Weapon', skillLineName: 'Restoration Staff' },
  ability_grimoire_fightersguild: { className: 'guild', skillLineName: 'Fighters Guild' },
  ability_grimoire_magesguild: { className: 'guild', skillLineName: 'Mages Guild' },
  ability_grimoire_soulmagic1: { className: 'world', skillLineName: 'Soul Magic' },
  ability_grimoire_soulmagic2: { className: 'world', skillLineName: 'Soul Magic' },
  ability_grimoire_assault: { className: 'alliance-war', skillLineName: 'Assault' },
  ability_grimoire_support: { className: 'alliance-war', skillLineName: 'Support' },
};

const ICON_OVERRIDES = SCRIBING_ICON_OVERRIDES as Record<number, string>;

/**
 * Resolve the grimoire icon for an ability, preferring the generated id -> icon
 * table and falling back to a live master-data icon. Returns undefined unless the
 * resolved icon is an `ability_grimoire_*` icon (the only ones that identify a line).
 */
export function resolveGrimoireIcon(abilityId?: number, fallbackIcon?: string): string | undefined {
  const fromOverride = typeof abilityId === 'number' ? ICON_OVERRIDES[abilityId] : undefined;
  const icon = fromOverride ?? fallbackIcon;
  return typeof icon === 'string' && icon.startsWith('ability_grimoire_') ? icon : undefined;
}

/**
 * Resolve the skill line that owns a scribed ability's grimoire, or null when the
 * ability is not a recognizable scribed grimoire ability.
 */
export function resolveScribingSkillLine(
  abilityId?: number,
  fallbackIcon?: string,
): ScribingSkillLineLabel | null {
  const icon = resolveGrimoireIcon(abilityId, fallbackIcon);
  if (!icon) return null;
  return GRIMOIRE_ICON_TO_SKILL_LINE[icon] ?? null;
}
