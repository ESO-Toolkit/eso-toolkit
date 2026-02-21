import fs from 'node:fs';
import path from 'node:path';

import type { SkillLineData, SkillData } from '../src/data/types/skill-line-types';

import { assault } from '../src/data/skill-lines/alliance-war/assault';
import { support } from '../src/data/skill-lines/alliance-war/support';
import { heavyArmor } from '../src/data/skill-lines/armor/heavyArmor';
import { lightArmor } from '../src/data/skill-lines/armor/lightArmor';
import { mediumArmor } from '../src/data/skill-lines/armor/mediumArmor';
import * as classSkillLines from '../src/data/skill-lines/class';
import { darkBrotherhood } from '../src/data/skill-lines/guild/darkBrotherhood';
import { fightersGuild } from '../src/data/skill-lines/guild/fightersGuild';
import { magesGuild } from '../src/data/skill-lines/guild/magesGuild';
import { psijicOrder } from '../src/data/skill-lines/guild/psijicOrder';
import { thievesGuild } from '../src/data/skill-lines/guild/thievesGuild';
import { undaunted } from '../src/data/skill-lines/guild/undaunted';
import { bowSkillLine } from '../src/data/skill-lines/weapon/bow';
import { destructionStaffSkillLine } from '../src/data/skill-lines/weapon/destructionStaff';
import { dualWieldSkillLine } from '../src/data/skill-lines/weapon/dualWield';
import { oneHandAndShieldSkillLine } from '../src/data/skill-lines/weapon/oneHandAndShield';
import { restorationStaff as restorationStaffSkillLine } from '../src/data/skill-lines/weapon/restorationStaff';
import { twoHandedSkillLine } from '../src/data/skill-lines/weapon/twoHanded';
import { excavation } from '../src/data/skill-lines/world/excavation';
import { legerdemain } from '../src/data/skill-lines/world/legerdemain';
import { mythicAbilities } from '../src/data/skill-lines/world/mythicAbilities';
import { soulMagic } from '../src/data/skill-lines/world/soul-magic';
import { scrying } from '../src/data/skill-lines/world/scrying';
import { vampire } from '../src/data/skill-lines/world/vampire';
import { werewolf } from '../src/data/skill-lines/world/werewolf';

type AbilityJson = {
  icon?: string | null;
  name?: string;
};

const ICON_MISSING_VALUES = new Set(['', 'icon_missing', undefined, null]);

const getAllSkillLines = (): SkillLineData[] => {
  const classes = Object.values(classSkillLines).filter((value): value is SkillLineData => {
    return Boolean((value as SkillLineData | undefined)?.skills);
  });

  return [
    ...classes,
    fightersGuild,
    magesGuild,
    psijicOrder,
    undaunted,
    darkBrotherhood,
    thievesGuild,
    bowSkillLine,
    destructionStaffSkillLine,
    dualWieldSkillLine,
    oneHandAndShieldSkillLine,
    restorationStaffSkillLine,
    twoHandedSkillLine,
    heavyArmor,
    lightArmor,
    mediumArmor,
    assault,
    support,
    soulMagic,
    vampire,
    werewolf,
    scrying,
    excavation,
    legerdemain,
    mythicAbilities,
  ];
};

const resolveIconValue = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (ICON_MISSING_VALUES.has(value)) return undefined;
  return value;
};

const main = () => {
  const repoRoot = path.resolve(__dirname, '..');
  const abilitiesPath = path.resolve(repoRoot, 'data/abilities.json');
  const outputPath = path.resolve(
    repoRoot,
    'src/data/skill-lines/generated/skillIconOverrides.ts',
  );

  const abilityJsonRaw = fs.readFileSync(abilitiesPath, 'utf-8');
  const abilityJson = JSON.parse(abilityJsonRaw) as Record<string, AbilityJson>;
  const abilityIconMap = new Map<number, string>();

  for (const [id, ability] of Object.entries(abilityJson)) {
    const icon = resolveIconValue(ability?.icon ?? undefined);
    if (!icon) continue;
    abilityIconMap.set(Number(id), icon);
  }

  const skillLines = getAllSkillLines();
  const overrides = new Map<number, string>();
  const missingIcons: Array<{ skill: SkillData; skillLineName: string }> = [];

  const maybeResolveIcon = (skill: SkillData): string | undefined => {
    const candidateIds = [skill.id, skill.baseAbilityId, skill.baseSkillId, ...(skill.alternateIds ?? [])];
    for (const candidate of candidateIds) {
      if (candidate == null) continue;
      const icon = abilityIconMap.get(candidate);
      if (icon) {
        return icon;
      }
    }
    return undefined;
  };

  for (const skillLine of skillLines) {
    if (!skillLine?.skills?.length) continue;
    for (const skill of skillLine.skills) {
      const existingIcon = resolveIconValue(skill.icon as string | undefined);
      if (existingIcon) continue;

      const resolved = maybeResolveIcon(skill);
      if (resolved) {
        overrides.set(skill.id, resolved);
      } else {
  missingIcons.push({ skill, skillLineName: skillLine.name });
      }
    }
  }

  if (!overrides.size) {
    console.log('No missing icons detected. Nothing to generate.');
    return;
  }

  const sortedEntries = Array.from(overrides.entries()).sort((a, b) => a[0] - b[0]);
  const fileHeader = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Generated by scripts/generate-skill-icons.ts
 */`;
  const recordEntries = sortedEntries
    .map(([id, icon]) => `  ${id}: '${icon}',`)
    .join('\n');

  const fileContents = `${fileHeader}\nexport const SKILL_ICON_OVERRIDES = {\n${recordEntries}\n} as const satisfies Record<number, string>;\n`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${fileContents}\n`);

  console.log(`Wrote ${sortedEntries.length} icon overrides to ${path.relative(repoRoot, outputPath)}`);
  if (missingIcons.length) {
    console.warn(
      `Warning: ${missingIcons.length} skills still lack icons; consider adding manual overrides.`,
    );
    const missingSummary = missingIcons.map(({ skill, skillLineName }) => ({
      skillLine: skillLineName,
      skillName: skill.name,
      id: skill.id,
      baseAbilityId: skill.baseAbilityId,
      baseSkillId: skill.baseSkillId,
      alternateIds: skill.alternateIds?.join(', ') ?? '',
    }));
    console.table(missingSummary);
  }
};

main();
