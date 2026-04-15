/**
 * ESO-Hub attribution link utilities.
 *
 * Every gear set name/icon and skill line name/icon displayed in this app links
 * back to its canonical ESO-Hub page for attribution and fair-use compliance.
 *
 * Gear set URLs:   https://eso-hub.com/en/sets/{slug}
 * Skill line URLs: sourced from SkillLineData.sourceUrl (already scraped from ESO-Hub)
 */

import * as classSkillLines from '@/data/skill-lines/class';
import type { SkillLineData } from '@/data/types/skill-line-types';

// ---------------------------------------------------------------------------
// Skill line URL lookup (built once at module load from SkillLineData.sourceUrl)
// ---------------------------------------------------------------------------

const SKILL_LINE_URL_MAP = new Map<string, string>();

(Object.values(classSkillLines) as SkillLineData[]).forEach((data) => {
  if (data && typeof data === 'object' && data.name && data.sourceUrl) {
    SKILL_LINE_URL_MAP.set(data.name, data.sourceUrl);
  }
});

/**
 * Returns the canonical ESO-Hub URL for a skill line by its display name.
 * Returns undefined when the skill line is not found in the class skill line data.
 *
 * @example
 * getEsoHubSkillLineUrl('Ardent Flame')
 * // → 'https://eso-hub.com/en/skills/dragonknight/ardent-flame'
 */
export function getEsoHubSkillLineUrl(skillLineName: string): string | undefined {
  return SKILL_LINE_URL_MAP.get(skillLineName);
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
