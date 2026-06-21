/**
 * Data-integrity tests for the archetype preset matrix.
 *
 * These guard the two ways a preset can silently rot: (1) listing a source whose
 * context/role gate excludes the archetype (it would be dropped by
 * `compileSources`, under-populating the "typical" build with no error), and
 * (2) enabling both Minor and Major Heroism in one archetype (they are the same
 * non-stacking buff at two tiers). Plus the basic shape + resolution behavior.
 */

import { isSourceAvailable } from '../../../application/compileCatalog';
import { ESO_CLASSES, type EsoClass } from '../../types/catalog';
import { ULTIMATE_SOURCE_CATALOG } from '../catalog';
import {
  ALL_ARCHETYPE_PRESETS,
  ARCHETYPE_PRESETS,
  CLASS_PRIMARY_PROC_ID,
  classPrimaryProcId,
  getArchetypePreset,
  resolvePresetOverrides,
} from '../presets';

const sourceById = (id: string) => ULTIMATE_SOURCE_CATALOG.find((s) => s.id === id);

describe('ARCHETYPE_PRESETS data integrity', () => {
  it('has exactly the 9 (context × role) archetypes with matching ids', () => {
    expect(ALL_ARCHETYPE_PRESETS).toHaveLength(9);
    for (const preset of ALL_ARCHETYPE_PRESETS) {
      expect(preset.id).toBe(`${preset.context}-${preset.role}`);
      expect(getArchetypePreset(preset.context, preset.role)).toBe(preset);
    }
  });

  it('only references source ids that exist in the catalog', () => {
    for (const preset of ALL_ARCHETYPE_PRESETS) {
      for (const id of preset.enabledSourceIds) {
        expect(sourceById(id)).toBeDefined();
      }
      for (const id of Object.keys(preset.uptimeOverrides)) {
        expect(sourceById(id)).toBeDefined();
      }
    }
  });

  it('every enabled source is gate-valid for its archetype (context + role, all classes)', () => {
    for (const preset of ALL_ARCHETYPE_PRESETS) {
      for (const id of preset.enabledSourceIds) {
        const source = sourceById(id)!;
        for (const esoClass of ESO_CLASSES) {
          expect(
            isSourceAvailable(source, {
              context: preset.context,
              esoClass,
              role: preset.role,
            }),
          ).toBe(true);
        }
      }
    }
  });

  it('never enables both Minor and Major Heroism in the same archetype (non-stacking)', () => {
    for (const preset of ALL_ARCHETYPE_PRESETS) {
      const ids = new Set(preset.enabledSourceIds);
      expect(ids.has('minor-heroism') && ids.has('major-heroism')).toBe(false);
    }
  });

  it('keeps every uptime override within [0, 1]', () => {
    for (const preset of ALL_ARCHETYPE_PRESETS) {
      expect(preset.baseUptime).toBeGreaterThanOrEqual(0);
      expect(preset.baseUptime).toBeLessThanOrEqual(1);
      for (const v of Object.values(preset.uptimeOverrides)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('carries a non-empty summary and assumptions for each archetype', () => {
    for (const preset of ALL_ARCHETYPE_PRESETS) {
      expect(preset.summary.length).toBeGreaterThan(0);
      expect(preset.assumptions.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('classPrimaryProcId', () => {
  it('resolves each generation-passive class to a real, class-gated catalog source', () => {
    for (const esoClass of ESO_CLASSES) {
      const procId = classPrimaryProcId(esoClass);
      if (procId == null) continue;
      const source = sourceById(procId);
      expect(source).toBeDefined();
      // The proc must be gated to (at least) this class.
      expect(source!.classes).toContain(esoClass);
    }
  });

  it('has no native ult-gen passive for Sorcerer or Warden', () => {
    expect(CLASS_PRIMARY_PROC_ID.sorcerer).toBeNull();
    expect(CLASS_PRIMARY_PROC_ID.warden).toBeNull();
  });
});

describe('resolvePresetOverrides', () => {
  it('enables base income + the class proc + the archetype sources, and nothing else', () => {
    const preset = ARCHETYPE_PRESETS.groupPve.dps;
    const { enabledOverrides, uptimeOverrides } = resolvePresetOverrides(preset, 'arcanist');

    // Always-on base + arcanist proc + the two archetype sources.
    expect(enabledOverrides['base-light-attack']).toBe(true);
    expect(enabledOverrides['arcanist-implacable-outcome']).toBe(true);
    expect(enabledOverrides['minor-heroism']).toBe(true);
    expect(enabledOverrides['arkasis-genius-external']).toBe(true);
    // Not in the preset → explicitly off (deterministic, no stale carry-over).
    expect(enabledOverrides['major-heroism']).toBe(false);
    expect(enabledOverrides['bloodspawn']).toBe(false);

    // Base uptime + the preset's per-source uptime land in the override map.
    expect(uptimeOverrides['base-light-attack']).toBe(preset.baseUptime);
    expect(uptimeOverrides['minor-heroism']).toBe(0.6);
  });

  it('sets an explicit boolean for every catalog source (deterministic apply)', () => {
    const { enabledOverrides } = resolvePresetOverrides(ARCHETYPE_PRESETS.soloPve.dps, 'sorcerer');
    for (const source of ULTIMATE_SOURCE_CATALOG) {
      expect(typeof enabledOverrides[source.id]).toBe('boolean');
    }
  });

  it('omits a class proc for a class that has none (Sorcerer/Warden)', () => {
    const classesWithoutProc: EsoClass[] = ['sorcerer', 'warden'];
    for (const esoClass of classesWithoutProc) {
      const { enabledOverrides } = resolvePresetOverrides(ARCHETYPE_PRESETS.groupPve.dps, esoClass);
      // None of the class procs should be enabled for these classes.
      for (const procId of Object.values(CLASS_PRIMARY_PROC_ID)) {
        if (procId) expect(enabledOverrides[procId]).toBe(false);
      }
    }
  });
});
