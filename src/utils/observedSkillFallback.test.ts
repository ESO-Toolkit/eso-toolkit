import type { ReportAbilityFragment } from '@/graphql/gql/graphql';
import { KnownAbilities } from '@/types/abilities';
import type {
  BuffEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
  UnifiedCastEvent,
} from '@/types/combatlogEvents';
import type { PlayerGear } from '@/types/playerDetails';

import { deriveObservedPlayerSkills } from './observedSkillFallback';

const ability = (gameID: number, name: string, icon = 'ability_test'): ReportAbilityFragment => ({
  __typename: 'ReportAbility',
  gameID,
  name,
  icon,
  type: '1',
});

const cast = (abilityGameID: number, timestamp = 1, sourceID = 1): UnifiedCastEvent => ({
  timestamp,
  type: 'cast',
  sourceID,
  sourceIsFriendly: true,
  targetID: 100,
  targetIsFriendly: false,
  abilityGameID,
  fight: 1,
});

const damage = (abilityGameID: number, timestamp = 1, sourceID = 1): DamageEvent => ({
  timestamp,
  type: 'damage',
  sourceID,
  sourceIsFriendly: true,
  targetID: 100,
  targetIsFriendly: false,
  abilityGameID,
  fight: 1,
  hitType: 1,
  amount: 1,
  castTrackID: 1,
  sourceResources: {} as DamageEvent['sourceResources'],
  targetResources: {} as DamageEvent['targetResources'],
});

const debuff = (abilityGameID: number, timestamp = 1, sourceID = 1): DebuffEvent => ({
  timestamp,
  type: 'applydebuff',
  sourceID,
  sourceIsFriendly: true,
  targetID: 100,
  targetIsFriendly: false,
  abilityGameID,
  fight: 1,
  extraAbilityGameID: 0,
});

const buff = (abilityGameID: number, timestamp = 1, sourceID = 1): BuffEvent => ({
  timestamp,
  type: 'applybuff',
  sourceID,
  sourceIsFriendly: true,
  targetID: sourceID,
  targetIsFriendly: true,
  abilityGameID,
  fight: 1,
  extraAbilityGameID: 0,
});

const heal = (abilityGameID: number, timestamp = 1, sourceID = 1): HealEvent => ({
  timestamp,
  type: 'heal',
  sourceID,
  sourceIsFriendly: true,
  targetID: sourceID,
  targetIsFriendly: true,
  abilityGameID,
  fight: 1,
  hitType: 1,
  amount: 1,
  overheal: 0,
  castTrackID: 1,
  sourceResources: {} as HealEvent['sourceResources'],
  targetResources: {} as HealEvent['targetResources'],
});

const resource = (abilityGameID: number, timestamp = 1, sourceID = 1): ResourceChangeEvent => ({
  timestamp,
  type: 'resourcechange',
  sourceID,
  sourceIsFriendly: true,
  targetID: sourceID,
  targetIsFriendly: true,
  abilityGameID,
  fight: 1,
  resourceChange: 1,
  resourceChangeType: 1,
  otherResourceChange: 0,
  maxResourceAmount: 100,
  waste: 0,
  castTrackID: 1,
  sourceResources: {} as ResourceChangeEvent['sourceResources'],
  targetResources: {} as ResourceChangeEvent['targetResources'],
});

describe('deriveObservedPlayerSkills', () => {
  it('derives player skills from player-sourced events and filters basics/status/procs', () => {
    const abilitiesById: Record<number, ReportAbilityFragment> = {
      25260: ability(25260, 'Surprise Attack', 'ability_nightblade_002_a'),
      34843: ability(34843, "Killer's Blade", 'ability_nightblade_017_a'),
      38745: ability(38745, 'Carve', 'ability_2handed_002_a'),
      40385: ability(40385, 'Barbed Trap', 'ability_fightersguild_004_a'),
      133494: ability(133494, 'Aegis Caller', 'death_recap_bleed'),
      18084: ability(18084, 'Burning', 'ability_mage_062'),
      [KnownAbilities.LIGHT_ATTACK_DUAL_WIELD]: ability(
        KnownAbilities.LIGHT_ATTACK_DUAL_WIELD,
        'Light Attack (Dual Wield)',
      ),
      [KnownAbilities.SWAP_WEAPONS]: ability(KnownAbilities.SWAP_WEAPONS, 'Swap Weapons'),
      115548: ability(115548, 'Grave Robber'),
    };
    const gear = [{ setName: 'Aegis Caller', id: 1 } as PlayerGear];

    const result = deriveObservedPlayerSkills({
      playerId: 1,
      abilitiesById,
      gear,
      castEvents: [
        cast(KnownAbilities.LIGHT_ATTACK_DUAL_WIELD, 1),
        cast(34843, 2),
        cast(25260, 3),
        cast(KnownAbilities.SWAP_WEAPONS, 4),
        cast(115548, 5),
        cast(38745, 6),
      ],
      damageEvents: [damage(133494, 7), damage(18084, 8), damage(40385, 9)],
    });

    expect(result.map((skill) => skill.name)).toEqual([
      "Killer's Blade",
      'Surprise Attack',
      'Carve',
      'Barbed Trap',
    ]);
  });

  it('deduplicates effect variants by skill name and prefers cast ability ids', () => {
    const abilitiesById: Record<number, ReportAbilityFragment> = {
      38745: ability(38745, 'Carve', 'ability_2handed_002_a'),
      38747: ability(38747, 'Carve', 'ability_2handed_002_a'),
    };

    const result = deriveObservedPlayerSkills({
      playerId: 1,
      abilitiesById,
      castEvents: [cast(38745, 10)],
      debuffEvents: [debuff(38747, 11)],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ guid: 38745, name: 'Carve' });
  });

  it('drops generic non-cast buff/resource noise while keeping real self-buffs and heals', () => {
    const abilitiesById: Record<number, ReportAbilityFragment> = {
      61919: ability(61919, 'Merciless Resolve', 'ability_nightblade_005_b'),
      215494: ability(215494, 'Siphoning Attacks', 'ability_nightblade_003_b'),
      [KnownAbilities.SPRINTER]: ability(KnownAbilities.SPRINTER, 'Sprinter', 'ability_mage_065'),
      17328: ability(17328, 'Restore Stamina', 'ability_mage_065'),
    };

    const result = deriveObservedPlayerSkills({
      playerId: 1,
      abilitiesById,
      friendlyBuffEvents: [buff(61919, 2), buff(KnownAbilities.SPRINTER, 3)],
      healingEvents: [heal(215494, 4)],
      resourceEvents: [resource(17328, 5)],
    });

    expect(result.map((skill) => skill.name)).toEqual(['Siphoning Attacks', 'Merciless Resolve']);
  });

  it('excludes IA vision and class-resource effects that are not slotted skills', () => {
    const abilitiesById: Record<number, ReportAbilityFragment> = {
      183006: ability(183006, "Cephaliarch's Flail", 'ability_arcanist_003_a'),
      183008: ability(183008, 'Abyssal Ink', 'ability_arcanist_003_a'),
      115573: ability(115573, 'Grave Robber', 'ability_necromancer_004'),
      220863: ability(220863, 'Sliver Assault', 'ability_death_recap_ithelia_cone'),
      252048: ability(252048, 'Mark of Hircine', 'crownstore_skillline_werewolf'),
      215727: ability(215727, 'Sunderer', 'ability_rogue_029'),
      220988: ability(220988, 'Thorns', 'vision_defense_thorns'),
    };

    const result = deriveObservedPlayerSkills({
      playerId: 1,
      abilitiesById,
      castEvents: [cast(183006, 1)],
      damageEvents: [damage(220988, 2), damage(220863, 3)],
      debuffEvents: [debuff(183008, 4), debuff(252048, 5)],
      friendlyBuffEvents: [buff(215727, 4)],
      healingEvents: [heal(115573, 5)],
    });

    expect(result.map((skill) => skill.name)).toEqual(["Cephaliarch's Flail"]);
  });
});
