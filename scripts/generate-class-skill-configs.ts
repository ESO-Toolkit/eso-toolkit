import fs from 'fs/promises';
import path from 'path';
import prettier from 'prettier';
import { fileURLToPath } from 'url';

import type {
  SkillLine,
  SkillsetData,
  ActiveAbility,
  Ultimate,
  Passive,
  AbilityMorph,
} from '../src/data/skillsets/Skillset';
import { arcanistData } from '../src/data/skill-lines/class/arcanist';
import { dragonknightData } from '../src/data/skill-lines/class/dragonknight';
import { necromancerData } from '../src/data/skill-lines/class/necromancer';
import { nightbladeData } from '../src/data/skill-lines/class/nightblade';
import { sorcererData } from '../src/data/skill-lines/class/sorcerer';
import { templarData } from '../src/data/skill-lines/class/templar';
import { wardenData } from '../src/data/skill-lines/class/warden';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const CLASS_DATASETS = {
  arcanist: arcanistData,
  dragonknight: dragonknightData,
  necromancer: necromancerData,
  nightblade: nightbladeData,
  sorcerer: sorcererData,
  templar: templarData,
  warden: wardenData,
} as const satisfies Record<string, SkillsetData>;

type ClassKey = keyof typeof CLASS_DATASETS;

const CLASS_DISPLAY_NAMES: Record<ClassKey, string> = {
  arcanist: 'Arcanist',
  dragonknight: 'Dragonknight',
  necromancer: 'Necromancer',
  nightblade: 'Nightblade',
  sorcerer: 'Sorcerer',
  templar: 'Templar',
  warden: 'Warden',
};

interface GeneratedSkill {
  enumKey: string;
  id: number;
  name: string;
  icon: string;
  type: 'ultimate' | 'active' | 'passive';
  description?: string;
  baseEnumKey?: string;
}

type AbilityCollection =
  | undefined
  | null
  | (Ultimate | ActiveAbility | Passive)[]
  | Record<string, Ultimate | ActiveAbility | Passive>;

type MorphEntry = AbilityMorph & { name?: string; description?: string };
type MorphCollection = undefined | null | MorphEntry[] | Record<string, MorphEntry>;

interface AbilityRecord {
  id: number;
  name: string;
  icon: string;
}

const CLASS_OUTPUT_DIR = path.join(REPO_ROOT, 'src', 'data', 'skill-lines', 'class');
const CLASS_INDEX_PATH = path.join(CLASS_OUTPUT_DIR, 'index.ts');
const CLASS_SKILL_ID_PATH = path.join(
  REPO_ROOT,
  'src',
  'features',
  'loadout-manager',
  'data',
  'classSkillIds.ts'
);

const ABILITY_SOURCE_PATH = path.join(REPO_ROOT, 'data', 'abilities.json');

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ');

const toEnumKey = (classKey: ClassKey, skillName: string): string =>
  `${classKey}_${skillName}`
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();

const escapeString = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\n');

const loadAbilityLookup = async (): Promise<Map<string, AbilityRecord>> => {
  const raw = await fs.readFile(ABILITY_SOURCE_PATH, 'utf8');
  const parsed: Record<string, AbilityRecord & { __typename?: string }> = JSON.parse(raw);
  const map = new Map<string, AbilityRecord>();

  for (const ability of Object.values(parsed)) {
    if (!ability?.name) continue;
    const key = normalizeName(ability.name);
    const existing = map.get(key);
    if (!existing || ability.id < existing.id) {
      map.set(key, { id: ability.id, name: ability.name, icon: ability.icon ?? 'icon_missing' });
    }
  }

  return map;
};

const findAbility = (lookup: Map<string, AbilityRecord>, name: string): AbilityRecord | undefined => {
  const key = normalizeName(name);
  return lookup.get(key);
};

const ensureAbility = (
  lookup: Map<string, AbilityRecord>,
  classKey: ClassKey,
  skillLineKey: string,
  name: string
): AbilityRecord => {
  const ability = findAbility(lookup, name);
  if (!ability) {
    throw new Error(`Missing ability ID for ${classKey}.${skillLineKey} -> ${name}`);
  }
  return ability;
};

const toArray = <T>(collection: AbilityCollection): T[] => {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection as T[];
  return Object.values(collection ?? {}) as T[];
};

const createSkillEntries = (
  lookup: Map<string, AbilityRecord>,
  classKey: ClassKey,
  skillLineKey: string,
  skillLine: SkillLine
): GeneratedSkill[] => {
  const entries: GeneratedSkill[] = [];

  const fallbackIcon = skillLine.icon || 'icon_missing';

  const pushSkill = (
    name: string | undefined,
    type: 'ultimate' | 'active' | 'passive',
    description?: string,
    baseEnumKey?: string
  ) => {
    if (!name) return;
    const ability =
      type === 'passive' ? findAbility(lookup, name) : ensureAbility(lookup, classKey, skillLineKey, name);
    const enumKey = toEnumKey(classKey, name);
    entries.push({
      enumKey,
      id: ability?.id ?? 0,
      name,
      icon: ability?.icon || fallbackIcon,
      type,
      description,
      baseEnumKey,
    });
  };

  const processMorphs = (
    morphs: MorphCollection,
    type: 'ultimate' | 'active',
    baseEnumKey: string
  ) => {
    if (!morphs) return;
    const morphList = Array.isArray(morphs) ? morphs : Object.values(morphs);
    for (const morph of morphList) {
      if (!morph?.name) continue;
      pushSkill(morph.name, type, morph.description, baseEnumKey);
    }
  };

  const ultimateList = toArray<Ultimate>(skillLine.ultimates as AbilityCollection);
  for (const ultimate of ultimateList) {
    if (!ultimate?.name) continue;
    const baseEnumKey = toEnumKey(classKey, ultimate.name);
    pushSkill(ultimate.name, 'ultimate', ultimate.description, baseEnumKey);
    processMorphs(ultimate.morphs, 'ultimate', baseEnumKey);
  }

  const activeList = toArray<ActiveAbility>(skillLine.activeAbilities as AbilityCollection);
  for (const active of activeList) {
    if (!active?.name) continue;
    const baseEnumKey = toEnumKey(classKey, active.name);
    pushSkill(active.name, 'active', active.description, baseEnumKey);
    processMorphs(active.morphs, 'active', baseEnumKey);
  }

  const passiveList = toArray<Passive>(skillLine.passives as AbilityCollection);
  for (const passive of passiveList) {
    if (!passive?.name) continue;
    pushSkill(passive.name, 'passive', passive.description);
  }

  return entries;
};

const formatSkillLiteral = (skill: GeneratedSkill): string => {
  const idLiteral = skill.id > 0 ? `ClassSkillId.${skill.enumKey}` : '0';
  const parts = [
    `id: ${idLiteral}`,
    `name: '${escapeString(skill.name)}'`,
    `type: '${skill.type}'`,
    `icon: '${escapeString(skill.icon)}'`,
  ];

  if (skill.description) {
    parts.push(`description: '${escapeString(skill.description)}'`);
  }

  if (skill.type === 'ultimate') {
    parts.push('isUltimate: true');
  }

  if (skill.type === 'passive') {
    parts.push('isPassive: true');
  }

  const baseEnumKey = skill.baseEnumKey ?? skill.enumKey;
  if (skill.type !== 'passive') {
    parts.push(`baseSkillId: ClassSkillId.${baseEnumKey}`);
  }

  return `    { ${parts.join(', ')} }`;
};

const isValidIcon = (icon?: string): icon is string =>
  Boolean(icon && /^(ability_|icon_|passive_|skill_|ui_)/i.test(icon));

const formatSkillLineFile = (
  classKey: ClassKey,
  skillLineKey: string,
  skillLine: SkillLine,
  entries: GeneratedSkill[]
): string => {
  const exportName = skillLineKey;
  const slug = slugify(skillLine.name || skillLineKey);
  const sourceUrl = `https://eso-hub.com/en/skills/${classKey}/${slug}`;
  const topIcon = (isValidIcon(skillLine.icon) ? skillLine.icon : entries[0]?.icon) || 'icon_missing';

  const skillsLiteral = entries.map(formatSkillLiteral).join(',\n');

  const regeneratedAt = new Date().toISOString();

  const displayName = skillLine.name || skillLineKey;

  return `/**
 * ${displayName} — ${CLASS_DISPLAY_NAMES[classKey]} Skill Line
 * Source: ${sourceUrl}
 * Regenerated: ${regeneratedAt}
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const ${exportName}: SkillLineData = {
  id: 'class.${slug}',
  name: '${escapeString(displayName)}',
  class: '${CLASS_DISPLAY_NAMES[classKey]}',
  category: 'class',
  icon: '${escapeString(topIcon)}',
  sourceUrl: '${sourceUrl}',
  skills: [
${skillsLiteral}
  ],
};
`;
};

const formatEnumFile = (entries: GeneratedSkill[]): string => {
  const unique = new Map<string, { id: number; name: string }>();
  for (const skill of entries) {
    if (skill.id <= 0) continue;
    if (!unique.has(skill.enumKey)) {
      unique.set(skill.enumKey, { id: skill.id, name: skill.name });
    }
  }

  const lines = Array.from(unique.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([enumKey, info]) => `  ${enumKey} = ${info.id}, // ${escapeString(info.name)}`)
    .join('\n');

  return `/**
 * Auto-generated by scripts/generate-class-skill-configs.ts
 * Do not edit manually.
 */
export enum ClassSkillId {
${lines}
}
`;
};

const formatIndexFile = (exports: string[]): string =>
  exports
    .map((name) => `export { ${name} } from './${name}';`)
    .join('\n') + '\n';

const writeFileIfChanged = async (filePath: string, content: string) => {
  const prettierConfig = (await prettier.resolveConfig(filePath)) ?? {};
  const formatted = await Promise.resolve(
    prettier.format(content, { ...prettierConfig, parser: 'typescript' })
  );
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const existing = await fs
    .readFile(filePath, 'utf8')
    .catch(() => undefined);
  if (existing !== formatted) {
    await fs.writeFile(filePath, formatted, 'utf8');
    console.log(`✏️  Updated ${path.relative(REPO_ROOT, filePath)}`);
  }
};

async function main(): Promise<void> {
  const abilityLookup = await loadAbilityLookup();
  const allSkillEntries: GeneratedSkill[] = [];
  const generatedExports: string[] = [];

  for (const [classKey, dataset] of Object.entries(CLASS_DATASETS) as [ClassKey, SkillsetData][]) {
    for (const [skillLineKey, skillLine] of Object.entries(dataset.skillLines || {})) {
      const entries = createSkillEntries(abilityLookup, classKey, skillLineKey, skillLine);
      if (entries.length === 0) continue;
      const fileContent = formatSkillLineFile(classKey, skillLineKey, skillLine, entries);
  await writeFileIfChanged(path.join(CLASS_OUTPUT_DIR, `${skillLineKey}.ts`), fileContent);
      generatedExports.push(skillLineKey);
      allSkillEntries.push(...entries);
    }
  }

  await writeFileIfChanged(CLASS_SKILL_ID_PATH, formatEnumFile(allSkillEntries));
  await writeFileIfChanged(CLASS_INDEX_PATH, formatIndexFile(generatedExports.sort()));

  console.log(`\n✅ Generated ${generatedExports.length} class skill line modules.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
