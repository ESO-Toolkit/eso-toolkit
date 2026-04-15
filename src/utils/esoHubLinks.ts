/**
 * ESO-Hub attribution link utilities.
 *
 * Every gear set name/icon and skill line name/icon displayed in this app links
 * back to its canonical ESO-Hub page for attribution and fair-use compliance.
 *
 * Gear set URLs:   https://eso-hub.com/en/sets/{slug}
 * Skill line URLs: sourced from SkillLineData.sourceUrl (already scraped from ESO-Hub),
 *                  built from all skill line categories via getSkillLineSourceUrlMap().
 */

import { getSkillLineSourceUrlMap } from '@/features/loadout-manager/data/skillLineSkills';

// ---------------------------------------------------------------------------
// Skill line URL lookup (built once at module load from all SkillLineData files)
// ---------------------------------------------------------------------------

// Populated on first call (lazy) to avoid forced initialisation at import time.
let _skillLineUrlMap: Map<string, string> | null = null;

function skillLineUrlMap(): Map<string, string> {
  if (!_skillLineUrlMap) {
    _skillLineUrlMap = getSkillLineSourceUrlMap();
  }
  return _skillLineUrlMap;
}

/**
 * Returns the canonical ESO-Hub URL for a skill line by its display name.
 * Covers class, weapon, armor, guild, alliance, world, racial, and craft lines.
 * Returns undefined when the skill line has no recorded sourceUrl
 * (e.g. scribing skills, or lines added before data was scraped).
 *
 * @example
 * getEsoHubSkillLineUrl('Ardent Flame')
 * // → 'https://eso-hub.com/en/skills/dragonknight/ardent-flame'
 *
 * getEsoHubSkillLineUrl('Destruction Staff')
 * // → 'https://eso-hub.com/en/skills/weapon/destruction-staff'
 */
export function getEsoHubSkillLineUrl(skillLineName: string): string | undefined {
  return skillLineUrlMap().get(skillLineName);
}

// ---------------------------------------------------------------------------
// Gear set URL derivation
// ---------------------------------------------------------------------------

/**
 * Derives an ESO-Hub URL for a gear set from its display name.
 * Slug rules (matching ESO-Hub conventions):
 *   - lowercase
 *   - apostrophes/smart quotes removed
 *   - spaces → hyphens
 *   - all other non-alphanumeric characters removed
 *
 * @example
 * getEsoHubSetUrl("Mother's Sorrow")
 * // → 'https://eso-hub.com/en/sets/mothers-sorrow'
 *
 * getEsoHubSetUrl('Turning Tide')
 * // → 'https://eso-hub.com/en/sets/turning-tide'
 */
export function getEsoHubSetUrl(setName: string): string {
  const slug = setName
    .toLowerCase()
    .replace(/['''\u2019]/g, '') // remove straight and curly apostrophes
    .replace(/\s+/g, '-') // spaces → hyphens
    .replace(/[^a-z0-9-]/g, ''); // strip remaining non-alphanumeric chars
  return `https://eso-hub.com/en/sets/${slug}`;
}
