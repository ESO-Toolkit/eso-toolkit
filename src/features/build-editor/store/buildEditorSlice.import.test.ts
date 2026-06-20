/**
 * Tests for applyImportedBuild (paste-import target/merge semantics) and
 * clearSetupSection. Guards the data-loss paths flagged in review: no silent
 * overwrite at the setup cap, and merge-not-replace so an import never wipes
 * data it didn't include.
 */

// Treat item id 9999 as a two-handed weapon so we can assert off-hand clearing
// without coupling the test to the real itemIdMap.
jest.mock('../../loadout-manager/utils/itemIconResolver', () => ({
  isTwoHandedWeapon: (id: number) => id === 9999,
}));

import reducer, {
  addSetup,
  applyImportedBuild,
  clearSetupSection,
  setActiveSetupIndex,
  setChampionPassive,
  setConsumables,
  setGearSlot,
} from './buildEditorSlice';
import type { BuildEditorState } from './buildEditorSlice';

const fresh = (): BuildEditorState => reducer(undefined, { type: '@@test/init' });

describe('buildEditorSlice — applyImportedBuild', () => {
  it('target "new" (under cap) creates a setup and applies the imported gear', () => {
    let s = fresh(); // starts with 1 setup
    s = reducer(s, applyImportedBuild({ setup: { gear: { 0: { id: 123 } } }, target: 'new' }));
    expect(s.build.setups).toHaveLength(2);
    expect(s.activeSetupIndex).toBe(1);
    expect(s.build.setups[1].gear[0]).toEqual({ id: 123 });
  });

  it('target "new" at the 5-setup cap is a no-op (no 6th setup, active untouched)', () => {
    let s = fresh();
    for (let i = 0; i < 4; i++) s = reducer(s, addSetup()); // → 5 setups
    expect(s.build.setups).toHaveLength(5);
    s = reducer(s, setActiveSetupIndex(2));
    const before = JSON.parse(JSON.stringify(s.build.setups[2]));

    s = reducer(s, applyImportedBuild({ setup: { gear: { 0: { id: 999 } } }, target: 'new' }));

    expect(s.build.setups).toHaveLength(5); // no setup created
    expect(s.build.setups[2]).toEqual(before); // active setup NOT overwritten
  });

  it('target "active" merges gear, preserving slots not in the import', () => {
    let s = fresh();
    s = reducer(s, setGearSlot({ slot: 1, itemId: 555 })); // existing neck
    s = reducer(s, applyImportedBuild({ setup: { gear: { 0: { id: 123 } } }, target: 'active' }));
    expect(s.build.setups[0].gear[0]).toEqual({ id: 123 }); // imported head
    expect(s.build.setups[0].gear[1]).toEqual({ id: 555 }); // preserved neck
  });

  it('target "active" with food-only consumables preserves existing potions', () => {
    let s = fresh();
    s = reducer(
      s,
      setConsumables({ potions: [{ id: 7, name: 'Tri-Pot', effects: [] }], food: {} }),
    );
    s = reducer(
      s,
      applyImportedBuild({
        setup: { consumables: { potions: [], food: { name: 'Bewitched Sugar Skulls' } } },
        target: 'active',
      }),
    );
    expect(s.build.setups[0].consumables.potions).toEqual([
      { id: 7, name: 'Tri-Pot', effects: [] },
    ]);
    expect(s.build.setups[0].consumables.food).toEqual({ name: 'Bewitched Sugar Skulls' });
  });

  it('clears a stale off-hand when the imported main-hand is two-handed', () => {
    let s = fresh();
    // Active setup: dual wield (front main + front off, back main + back off).
    s = reducer(s, setGearSlot({ slot: 4, itemId: 111 }));
    s = reducer(s, setGearSlot({ slot: 5, itemId: 222 }));
    s = reducer(s, setGearSlot({ slot: 20, itemId: 333 }));
    s = reducer(s, setGearSlot({ slot: 21, itemId: 444 }));

    // Import a two-handed staff into both main-hands, with no off-hand rows.
    s = reducer(
      s,
      applyImportedBuild({
        setup: { gear: { 4: { id: 9999 }, 20: { id: 9999 } } },
        target: 'active',
      }),
    );

    expect(s.build.setups[0].gear[4]).toEqual({ id: 9999 });
    expect(s.build.setups[0].gear[20]).toEqual({ id: 9999 });
    // Paired off-hands must be cleared (no phantom weapon behind the 2H).
    expect(s.build.setups[0].gear[5]).toBeUndefined();
    expect(s.build.setups[0].gear[21]).toBeUndefined();
  });

  it('keeps existing CP passive-star points when importing slotted perks', () => {
    let s = fresh();
    // Seed a passive-star allocation on the active setup (via action — state is frozen).
    s = reducer(s, setChampionPassive({ tree: 'warfare', cpId: 'piercing', points: 5 }));
    s = reducer(
      s,
      applyImportedBuild({
        setup: {
          cp: {
            warfare: { slots: [264, null, null, null], passives: {} },
            fitness: { slots: [null, null, null, null], passives: {} },
            craft: { slots: [null, null, null, null], passives: {} },
          },
        },
        target: 'active',
      }),
    );
    expect(s.build.setups[0].cp.warfare.slots[0]).toBe(264); // imported perk
    expect(s.build.setups[0].cp.warfare.passives).toEqual({ piercing: 5 }); // preserved stars
  });
});

describe('buildEditorSlice — clearSetupSection', () => {
  it('clears the active setup gear', () => {
    let s = fresh();
    s = reducer(s, setGearSlot({ slot: 0, itemId: 123 }));
    expect(s.build.setups[0].gear[0]).toEqual({ id: 123 });
    s = reducer(s, clearSetupSection({ section: 'gear' }));
    expect(s.build.setups[0].gear).toEqual({});
    expect(s.isDirty).toBe(true);
  });
});
