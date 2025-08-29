import React from 'react';

import { SkillStat, SkillTooltipProps } from '../components/SkillTooltip';
import { arcanistData } from '../data/skillsets/arcanist';
import { dragonknightData } from '../data/skillsets/dragonknight';
import { necromancerData } from '../data/skillsets/necromancer';
import { nightbladeData } from '../data/skillsets/nightblade';
import { ActiveAbility, AbilityMorph, SkillsetData } from '../data/skillsets/Skillset';
import { sorcererData } from '../data/skillsets/sorcerer';
import { templarData } from '../data/skillsets/templar';
import { wardenData } from '../data/skillsets/warden';

// Define types for abilities based on the structure we see in skillset data
type SkillNode = {
  name?: string;
  type?: string;
  description?: React.ReactNode;
  cost?: string;
  target?: string;
  duration?: string;
  castTime?: string;
  channelTime?: string;
  radius?: string;
  maxRange?: string;
  range?: string;
  cooldown?: string;
  pulseInterval?: string;
  pulseDamage?: string;
  passiveBuff?: string;
  morphs?: Record<string, SkillNode> | { [key: string]: AbilityMorph };
  // Add other properties as needed
  [key: string]: unknown;
};

// Keys we look for to render Stats. Extend as needed.
const STAT_LABELS: Record<string, string> = {
  cost: 'Cost',
  target: 'Target',
  duration: 'Duration',
  castTime: 'Cast Time',
  channelTime: 'Channel Time',
  radius: 'Radius',
  maxRange: 'Max Range',
  range: 'Range',
  cooldown: 'Cooldown',
};

function toStats(node: SkillNode): SkillStat[] {
  const stats: SkillStat[] = [];
  for (const [key, label] of Object.entries(STAT_LABELS)) {
    const v = node?.[key];
    if (typeof v === 'string' && v.trim().length > 0) {
      stats.push({ label, value: v });
    }
  }
  return stats;
}

export type MapSkillOptions = {
  className: string;
  skillLineName: string;
  node: SkillNode; // ability or morph node
  inheritFrom?: ActiveAbility; // parent ability to inherit base stats from
  // One of these for icon derivation; all optional (icon can be omitted)
  abilityId?: number;
  iconSlug?: string;
  iconUrl?: string;
  headerBadge?: string; // e.g., 'Active' | 'Passive' | 'Ultimate'
  morphOfName?: string; // optional explicit morphOf text
};

export function mapSkillToTooltipProps(opts: MapSkillOptions): SkillTooltipProps {
  const {
    className,
    skillLineName,
    node,
    inheritFrom,
    abilityId,
    iconSlug,
    iconUrl,
    headerBadge,
    morphOfName,
  } = opts;

  // Resolve fields, letting the node override parent inheritFrom
  const merged = inheritFrom ? { ...inheritFrom, ...node } : node;

  const stats = toStats(merged);
  const header =
    headerBadge ?? (typeof merged?.type === 'string' ? capitalCase(merged.type) : 'Active');

  // Build a richer multi-paragraph description when we have a parent (base) node
  const descriptionNode: React.ReactNode = ((): React.ReactNode => {
    const baseDesc = inheritFrom?.description as string | undefined;
    const morphDesc = merged?.description as string | undefined;
    const parts: React.ReactNode[] = [];
    if (baseDesc && baseDesc.trim()) {
      parts.push(baseDesc.trim());
    }
    if (morphDesc && (!baseDesc || morphDesc.trim() !== baseDesc.trim())) {
      parts.push(morphDesc.trim());
    }
    // If we have pulse info, add a helpful synthesized line
    const pulseInterval = merged?.pulseInterval as string | undefined;
    const pulseDamage = merged?.pulseDamage as string | undefined;
    if (pulseInterval || pulseDamage) {
      const synthesized =
        [
          pulseInterval ? `Pulses every ${pulseInterval.replace(/^every /i, '')}` : undefined,
          pulseDamage ? `deals an additional ${pulseDamage}` : undefined,
        ]
          .filter(Boolean)
          .join(', ') + (pulseInterval || pulseDamage ? '.' : '');
      if (synthesized.trim()) parts.push(synthesized);
    }
    const passiveBuff = inheritFrom?.passiveBuff as string | undefined;
    if (passiveBuff && passiveBuff.trim()) {
      parts.push(`While slotted on either ability bar, gain ${passiveBuff}.`);
    }
    if (parts.length <= 1) {
      return parts[0] ?? '';
    }
    // Interleave paragraphs with line breaks without JSX (keep file as .ts)
    const children: React.ReactNode[] = [];
    parts.forEach((p, i) => {
      children.push(p);
      if (i < parts.length - 1) {
        children.push(React.createElement('br', { key: `br1-${i}` }));
        children.push(React.createElement('br', { key: `br2-${i}` }));
      }
    });
    return React.createElement(React.Fragment, null, ...children);
  })();

  return {
    headerBadge: header,
    lineText: `${className} — ${skillLineName}`,
    iconUrl,
    iconSlug,
    abilityId,
    name: merged?.name ?? 'Unknown',
    morphOf: morphOfName,
    stats,
    description: descriptionNode,
  };
}

function capitalCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Registry of class datasets by canonical key
export const CLASS_DATA: Record<string, SkillsetData> = {
  arcanist: arcanistData,
  dragonknight: dragonknightData,
  necromancer: necromancerData,
  nightblade: nightbladeData,
  sorcerer: sorcererData,
  templar: templarData,
  warden: wardenData,
};

// Find ability or morph by name within a given class dataset
function findAbilityNodeByName(
  cls: SkillsetData,
  abilityName: string
): { node: SkillNode; parent?: ActiveAbility; skillLineName: string } | null {
  if (!cls || !cls.skillLines) return null;
  const target = (abilityName || '').trim();
  for (const line of Object.values(cls.skillLines)) {
    const skillLineName = line?.name || '';
    // Categories we support
    const categories: Array<'ultimates' | 'activeAbilities' | 'passives'> = [
      'ultimates',
      'activeAbilities',
      'passives',
    ];
    for (const cat of categories) {
      const collection = line?.[cat];
      if (!collection) continue;
      for (const entry of Object.values(collection)) {
        // Check base ability node
        if (entry?.name === target) {
          return { node: entry as SkillNode, skillLineName };
        }
        // Check morphs if present
        const morphs = entry?.morphs || {};
        for (const morph of Object.values(morphs)) {
          if (morph && typeof morph === 'object' && 'name' in morph && morph.name === target) {
            return { node: morph as SkillNode, parent: entry as ActiveAbility, skillLineName };
          }
        }
      }
    }
  }
  return null;
}

// Public helper: build rich SkillTooltipProps from class key and ability name
export function buildTooltipPropsFromClassAndName(
  classKey: string,
  abilityName: string
): SkillTooltipProps | null {
  const cls = CLASS_DATA[classKey?.toLowerCase?.() || ''];
  if (!cls) return null;
  const found = findAbilityNodeByName(cls, abilityName);
  if (!found) return null;
  const { node, parent, skillLineName } = found;
  return mapSkillToTooltipProps({
    className: cls.class || capitalCase(classKey),
    skillLineName,
    node,
    inheritFrom: parent,
    morphOfName: parent?.name,
  });
}
