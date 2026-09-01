import type { Build, BuildSetup } from '../features/build-editor/types/build.types';
import savedRostersReducer, { attachBuildToSlot } from '../store/saved_rosters/savedRostersSlice';
import { createDefaultRoster } from '../types/roster';

import { snapshotBuildToSlot, type SlotInlineData } from './rosterBuildBridge';
import { compactifyRoster, expandCompactRoster } from './rosterEncoding';
import { dpsSlotToBuild } from './rosterSlotToBuild';

const makeSetup = (overrides: Partial<BuildSetup> = {}): BuildSetup => ({
  id: 'setup-1',
  name: 'Default',
  attributes: { magicka: 0, health: 0, stamina: 0 },
  curse: 'none',
  mundusStone: '',
  gear: {},
  skills: { 0: {}, 1: {} },
  cp: {
    warfare: { slots: [null, null, null, null], passives: {} },
    fitness: { slots: [null, null, null, null], passives: {} },
    craft: { slots: [null, null, null, null], passives: {} },
  },
  consumables: { potions: [], food: {} },
  passives: [],
  screenshots: [],
  ...overrides,
});

const makeBuild = (setup: BuildSetup): Build => ({
  id: 'build-1',
  name: 'Round-trip build',
  shortDescription: '',
  esoClass: 'dragonknight',
  classSkillLines: [null, null, null],
  role: 'hybrid-dps',
  gameMode: 'pve',
  races: [],
  setups: [setup],
  guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
  settings: { visibility: 'public', dlc: 'Base Game', setupOrder: [0] },
  addonImportString: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const pickInlineData = (slot: SlotInlineData): SlotInlineData => ({
  skills: slot.skills,
  cpPoints: slot.cpPoints,
  passives: slot.passives,
  food: slot.food,
  quickslots: slot.quickslots,
  skilledAbilities: slot.skilledAbilities,
  scribedAbilityIds: slot.scribedAbilityIds,
});

const restoreSnapshot = (inlineData: SlotInlineData): SlotInlineData => {
  const roster = createDefaultRoster();
  const state = savedRostersReducer(
    {
      rosters: [{ id: 'roster-1', savedAt: '2024-01-01T00:00:00.000Z', roster }],
    },
    attachBuildToSlot({
      rosterId: 'roster-1',
      slotKey: 'dps:0',
      buildRef: { buildId: 'build-1', setupIndex: 0 },
      inlineData,
    }),
  );

  const decodedRoster = expandCompactRoster(compactifyRoster(state.rosters[0].roster));
  const restoredSetup = dpsSlotToBuild(decodedRoster.dpsSlots[0]).setups[0];

  return {
    skills: restoredSetup.skills,
    cpPoints: restoredSetup.cp,
    passives: restoredSetup.passives,
    food: restoredSetup.consumables.food,
    quickslots: restoredSetup.quickslots,
    skilledAbilities: restoredSetup.skilledAbilities,
    scribedAbilityIds: restoredSetup.scribedAbilityIds,
  };
};

describe('roster build snapshot round-trip', () => {
  it('deeply preserves every supported field through apply, save, encode/decode, and restore', () => {
    const snapshot = snapshotBuildToSlot(
      makeBuild(
        makeSetup({
          skills: { 0: { 0: 100, 5: 105 }, 1: { 0: 200 } },
          cp: {
            warfare: { slots: [301, null, 303, null], passives: { '401': 10 } },
            fitness: { slots: [501, null, null, null], passives: { '601': 20 } },
            craft: { slots: [701, 702, null, null], passives: {} },
          },
          consumables: { potions: [], food: { id: 801, name: 'Round-trip Food' } },
          passives: [901, 902],
          quickslots: [
            { type: 5, id: 1001 },
            { type: 1, id: 1002 },
          ],
          skilledAbilities: [
            { abilityId: 1101, morph: 0 },
            { abilityId: 1102, morph: 2 },
          ],
          scribedAbilityIds: [1201, 1202],
        }),
      ),
      0,
    );

    expect(restoreSnapshot(snapshot)).toEqual(snapshot);
  });

  it('uses an empty snapshot to clear stale inline values without losing the clearing markers', () => {
    const emptySnapshot = snapshotBuildToSlot(makeBuild(makeSetup()), 0);
    const staleRoster = createDefaultRoster();
    staleRoster.dpsSlots[0] = {
      slotNumber: 1,
      skills: { 0: { 0: 1 }, 1: { 0: 2 } },
      cpPoints: {
        warfare: { slots: [3, null, null, null], passives: { '4': 5 } },
        fitness: { slots: [null, null, null, null], passives: {} },
        craft: { slots: [null, null, null, null], passives: {} },
      },
      food: { id: 6, name: 'Stale Food' },
      passives: [7],
      quickslots: [{ type: 5, id: 8 }],
      skilledAbilities: [{ abilityId: 9, morph: 1 }],
      scribedAbilityIds: [10],
    };

    const state = savedRostersReducer(
      {
        rosters: [{ id: 'roster-1', savedAt: '2024-01-01T00:00:00.000Z', roster: staleRoster }],
      },
      attachBuildToSlot({
        rosterId: 'roster-1',
        slotKey: 'dps:0',
        buildRef: { buildId: 'empty-build', setupIndex: 0 },
        inlineData: emptySnapshot,
      }),
    );

    expect(pickInlineData(state.rosters[0].roster.dpsSlots[0])).toEqual(emptySnapshot);

    const decoded = expandCompactRoster(compactifyRoster(state.rosters[0].roster));
    expect(pickInlineData(decoded.dpsSlots[0])).toEqual(emptySnapshot);
    expect(restoreSnapshot(pickInlineData(decoded.dpsSlots[0]))).toEqual(emptySnapshot);
  });
});
