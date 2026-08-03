/**
 * Deterministic fixtures with PLANTED archetypes.
 *
 * The point is that clustering must recover a partition we constructed on
 * purpose. Every parse carries controlled per-row jitter on the low-weight axes
 * (food, mundus, race, one flex bar slot) so the fixture is not trivially
 * separable — a clustering that only works on identical builds would pass a
 * jitter-free fixture and fail on real data.
 */

import type { BuildSignature, DpsParse } from '../../types/dpsParses.types';

/** Real set ids, so anything that consults the set tables behaves realistically. */
export const SETS = {
  deadlyStrike: 127,
  corpseburster: 777,
  azureblight: 456,
  ansuul: 693,
  coralRiptide: 585,
  zaan: 350,
  slimecraw: 270,
  velothi: 694,
  oakensoul: 658,
  merciless: 522,
} as const;

const ABILITIES = {
  necroFront: [217699, 123704, 118763, 117690, 117805, 40161],
  necroBack: [217699, 222678, 40255, 38788, 42028, 118664],
  arcFront: [183006, 185805, 184873, 186366, 40195, 40161],
  arcBack: [217699, 222678, 40255, 38788, 42028, 186477],
  sorcFront: [23200, 24785, 24326, 28418, 40195, 40161],
  sorcBack: [217699, 222678, 40255, 23234, 42028, 23495],
} as const;

/** The four axes deliberately absent from characterRankings. */
const MISSING = ['race', 'cp', 'mundus', 'food'];

let counter = 0;
/** Sequential, never random — ids must be stable across runs. */
function nextId(): string {
  counter += 1;
  return `4-122-fixture${String(counter).padStart(4, '0')}`;
}

export function resetFixtureIds(): void {
  counter = 0;
}

export interface ArchetypeSpec {
  esoClass: string;
  fivePiece: [number, number];
  monster?: number;
  mythic?: number;
  arena?: number;
  front: readonly number[];
  back: readonly number[];
  skillLines: number[];
  baseDps: number;
}

export function makeParse(
  spec: ArchetypeSpec,
  index: number,
  overrides: Partial<DpsParse> = {},
): DpsParse {
  // Jitter one back-bar slot on every third parse: real players vary a flex slot,
  // and the clustering must tolerate that without splitting the archetype.
  const back = index % 3 === 0 ? [...spec.back.slice(0, 5), 42060] : [...spec.back];

  const build: BuildSignature = {
    v: 1,
    sets: {
      fivePiece: [...spec.fivePiece].sort((a, b) => a - b),
      monster: spec.monster,
      mythic: spec.mythic,
      arena: spec.arena,
      extra: [],
    },
    setCounts: [
      [spec.fivePiece[0], 5],
      [spec.fivePiece[1], 5],
    ],
    bars: {
      front: [...spec.front],
      back,
      frontUltimate: spec.front[5],
      backUltimate: back[5],
      barOrderKnown: true,
    },
    skillLines: { l1: spec.skillLines[0], l2: spec.skillLines[1] },
    esoClass: spec.esoClass,
    spec: 'StaminaDPS',
    missing: [...MISSING],
  };

  return {
    parse_id: nextId(),
    encounter_id: 4,
    difficulty: 122,
    zone_id: 1,
    trial_id: 'AA',
    encounter_name: 'The Mage',
    hard_mode_level: 0,
    partition: -1,
    character_label: `Player${index + 1}`,
    eso_class: spec.esoClass,
    spec_name: 'StaminaDPS',
    race: null,
    server_region: 'EU',
    server_name: 'Megaserver',
    guild_name: null,
    report_code: `report${index}`,
    fight_id: 1,
    rank: index + 1,
    // Deterministic spread so medians differ between archetypes.
    amount: spec.baseDps - index * 750,
    duration_ms: 180_000,
    log_start_ms: 1_700_000_000_000,
    log_date: '2026-07-01',
    bracket_data: 3000,
    set1_id: build.sets.fivePiece[0],
    set2_id: build.sets.fivePiece[1],
    monster_id: spec.monster ?? null,
    mythic_id: spec.mythic ?? null,
    arena_set_id: spec.arena ?? null,
    mundus_id: null,
    food_ability_id: null,
    signature_hash: `hash${index}`,
    build,
    source_url: `https://www.esologs.com/reports/report${index}#fight=1`,
    ...overrides,
  };
}

export const NECRO_ARCHETYPE: ArchetypeSpec = {
  esoClass: 'Necromancer',
  fivePiece: [SETS.corpseburster, SETS.azureblight],
  mythic: SETS.velothi,
  monster: SETS.slimecraw,
  arena: SETS.merciless,
  front: ABILITIES.necroFront,
  back: ABILITIES.necroBack,
  skillLines: [15, 16],
  baseDps: 360_000,
};

export const ARCANIST_ARCHETYPE: ArchetypeSpec = {
  esoClass: 'Arcanist',
  fivePiece: [SETS.deadlyStrike, SETS.coralRiptide],
  mythic: SETS.oakensoul,
  monster: SETS.zaan,
  front: ABILITIES.arcFront,
  back: ABILITIES.arcBack,
  skillLines: [18, 19],
  baseDps: 340_000,
};

export const SORC_ARCHETYPE: ArchetypeSpec = {
  esoClass: 'Sorcerer',
  fivePiece: [SETS.ansuul, SETS.deadlyStrike],
  monster: SETS.zaan,
  front: ABILITIES.sorcFront,
  back: ABILITIES.sorcBack,
  skillLines: [4, 5],
  baseDps: 355_000,
};

/**
 * 45 parses across three planted archetypes: 20 Necromancer, 15 Arcanist,
 * 10 Sorcerer.
 */
export function makeThreeArchetypeFixture(): DpsParse[] {
  resetFixtureIds();
  return [
    ...Array.from({ length: 20 }, (_, i) => makeParse(NECRO_ARCHETYPE, i)),
    ...Array.from({ length: 15 }, (_, i) => makeParse(ARCANIST_ARCHETYPE, i)),
    ...Array.from({ length: 10 }, (_, i) => makeParse(SORC_ARCHETYPE, i)),
  ];
}

/** Which planted archetype a fixture parse came from. */
export function archetypeOf(parse: DpsParse): string {
  return parse.eso_class;
}
