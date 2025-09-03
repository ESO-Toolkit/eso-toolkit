// Import all skill-lines data
import { assaultData } from '../data/skill-lines/Alliance/assault';
import { supportData } from '../data/skill-lines/Alliance/support';
import { arcanistData } from '../data/skill-lines/class/arcanist';
import { dragonknightData } from '../data/skill-lines/class/dragonknight';
import { necromancerData } from '../data/skill-lines/class/necromancer';
import { nightbladeData } from '../data/skill-lines/class/nightblade';
import { sorcererData } from '../data/skill-lines/class/sorcerer';
import { templarData } from '../data/skill-lines/class/templar';
import { wardenData } from '../data/skill-lines/class/warden';
import { darkBrotherhoodData } from '../data/skill-lines/guild/darkBrotherhood';
import { fightersGuildData } from '../data/skill-lines/guild/fightersGuild';
import { magesGuildData } from '../data/skill-lines/guild/magesGuild';
import { psijicOrderData } from '../data/skill-lines/guild/psijicOrder';
import { thievesGuildData } from '../data/skill-lines/guild/thievesGuild';
import { undauntedData } from '../data/skill-lines/guild/undaunted';
import { bowData } from '../data/skill-lines/weapons/bow';
import { destructionStaffData } from '../data/skill-lines/weapons/destructionStaff';
import { dualWieldData } from '../data/skill-lines/weapons/dualWield';
import { oneHandAndShieldData } from '../data/skill-lines/weapons/oneHand';
import { restorationStaffData } from '../data/skill-lines/weapons/restoration';
import { twoHandedData } from '../data/skill-lines/weapons/twoHanded';
import { SkillsetData } from '../data/skillsets/Skillset';

// Registry of all skill lines organized by category
export const SKILL_LINES_REGISTRY = {
  classes: {
    arcanist: arcanistData,
    dragonknight: dragonknightData,
    necromancer: necromancerData,
    nightblade: nightbladeData,
    sorcerer: sorcererData,
    templar: templarData,
    warden: wardenData,
  },
  weapons: {
    bow: bowData,
    destructionStaff: destructionStaffData,
    dualWield: dualWieldData,
    oneHandAndShield: oneHandAndShieldData,
    restorationStaff: restorationStaffData,
    twoHanded: twoHandedData,
  },
  alliance: {
    assault: assaultData,
    support: supportData,
  },
  guild: {
    undaunted: undauntedData,
    fightersGuild: fightersGuildData,
    magesGuild: magesGuildData,
    thievesGuild: thievesGuildData,
    darkBrotherhood: darkBrotherhoodData,
    psijicOrder: psijicOrderData,
  },
} as const;

// Flattened list for easy searching
export const ALL_SKILL_LINES: SkillsetData[] = [
  ...Object.values(SKILL_LINES_REGISTRY.classes),
  ...Object.values(SKILL_LINES_REGISTRY.weapons),
  ...Object.values(SKILL_LINES_REGISTRY.alliance),
  ...Object.values(SKILL_LINES_REGISTRY.guild),
];

// Type for skill node (ability/morph)
export interface SkillNode {
  name?: string;
  type?: string;
  description?: string;
  cost?: string;
  target?: string;
  duration?: string;
  castTime?: string;
  channelTime?: string;
  radius?: string;
  maxRange?: string;
  range?: string;
  cooldown?: string;
  damage?: string;
  healing?: string;
  morphs?: SkillNode[] | Record<string, SkillNode>;
  // Additional properties specific to skill-lines structure
  [key: string]: unknown;
}

// Type for search result
export interface SkillSearchResult {
  node: SkillNode;
  skillLineName: string;
  skillLineData: SkillsetData;
  category: 'classes' | 'weapons' | 'alliance' | 'guild';
  abilityType: 'ultimates' | 'actives' | 'activeAbilities' | 'passives';
  parent?: SkillNode;
}

/**
 * Search for a skill/ability by name across all skill lines
 */
export function findSkillByName(abilityName: string): SkillSearchResult | null {
  if (!abilityName) return null;

  const normalizedTarget = abilityName.toLowerCase().trim();

  // Search through all categories
  for (const [categoryKey, categoryData] of Object.entries(SKILL_LINES_REGISTRY)) {
    const category = categoryKey as keyof typeof SKILL_LINES_REGISTRY;

    for (const skillLineData of Object.values(categoryData)) {
      if (!skillLineData?.skillLines) continue;

      // Search through each skill line
      for (const skillLine of Object.values(skillLineData.skillLines || {})) {
        if (!skillLine) continue;
        const skillLineName = (skillLine as any).name || '';

        // Check different ability categories
        const categories: Array<'ultimates' | 'actives' | 'activeAbilities' | 'passives'> = [
          'ultimates',
          'actives',
          'activeAbilities',
          'passives',
        ];

        for (const abilityType of categories) {
          const collection = (skillLine as any)?.[abilityType];
          if (!collection) continue;

          // Handle both array and object structures
          const abilities = Array.isArray(collection) ? collection : Object.values(collection);

          for (const ability of abilities) {
            if (!ability || typeof ability !== 'object') continue;

            // Check base ability
            if (ability.name?.toLowerCase().trim() === normalizedTarget) {
              return {
                node: ability as SkillNode,
                skillLineName,
                skillLineData,
                category,
                abilityType,
              };
            }

            // Check morphs
            if (ability.morphs) {
              const morphs = Array.isArray(ability.morphs)
                ? ability.morphs
                : Object.values(ability.morphs);

              for (const morph of morphs) {
                if (morph && typeof morph === 'object' && 'name' in morph) {
                  if (morph.name?.toLowerCase().trim() === normalizedTarget) {
                    return {
                      node: morph as SkillNode,
                      skillLineName,
                      skillLineData,
                      category,
                      abilityType,
                      parent: ability as SkillNode,
                    };
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Get class key from skillset data
 */
export function getClassKey(skillLineData: SkillsetData): string {
  return skillLineData?.class?.toLowerCase() || skillLineData?.weapon?.toLowerCase() || 'unknown';
}
