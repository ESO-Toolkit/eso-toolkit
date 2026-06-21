/**
 * Engine + dataset-integrity tests for the Scribing simulator.
 *
 * These lock in the accuracy guarantees: every grimoire is fully described, the
 * focus availability matches the game-extracted name transformations (minus the
 * one research-refuted entry), and the derivation produces the real in-game
 * skill name / ability id.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

import { FOCUS_META, SIGNATURE_META, AFFIX_META, GRIMOIRE_META } from '../data/scribingMetadata';
import { JsonScribingDataRepository } from '../infrastructure/data/JsonScribingDataRepository';
import type { ScribingData } from '../shared/types';

import {
  deriveScribedSkill,
  getCompatibleScripts,
  getFocusScriptIdsForGrimoire,
  summarizeScribedSkill,
} from './scribingEngine';

let data: ScribingData;

beforeAll(async () => {
  data = await new JsonScribingDataRepository().loadScribingData();
});

describe('grimoire metadata integrity', () => {
  it('describes all 12 grimoires with icon, skill line and acquisition', () => {
    const grimoires = Object.values(data.grimoires);
    expect(grimoires).toHaveLength(12);
    for (const g of grimoires) {
      expect(g.icon).toMatch(/^ability_grimoire_/);
      expect(g.skillLine).toBeTruthy();
      expect(g.acquisition).toBeTruthy();
      expect(g.baseEffect).toBeTruthy();
      expect(g.targetType).toBeTruthy();
      expect(g.castType).toBeTruthy();
      expect(GRIMOIRE_META[g.id]).toBeDefined();
    }
  });

  it('maps the documented skill lines from game-data icons', () => {
    expect(data.grimoires['banner-bearer'].skillLine).toBe('Support');
    expect(data.grimoires['trample'].skillLine).toBe('Assault');
    expect(data.grimoires['ulfsilds-contingency'].skillLine).toBe('Mages Guild');
    expect(data.grimoires['torchbearer'].skillLine).toBe('Fighters Guild');
    expect(data.grimoires['traveling-knife'].skillLine).toBe('Dual Wield');
    expect(data.grimoires['vault'].skillLine).toBe('Bow');
    expect(data.grimoires['elemental-explosion'].skillLine).toBe('Destruction Staff');
    expect(data.grimoires['menders-bond'].skillLine).toBe('Restoration Staff');
    expect(data.grimoires['soul-burst'].skillLine).toBe('Soul Magic');
  });
});

describe('script metadata integrity', () => {
  const isMeaningful = (id: string, desc: string): void => {
    expect(desc.length).toBeGreaterThan(8);
    // Reject the old placeholder pattern where description == script name.
    expect(desc.toLowerCase()).not.toBe(id.replace(/-/g, ' '));
  };

  it('gives every focus/signature/affix script a real effect description', () => {
    for (const s of Object.values(data.focusScripts)) isMeaningful(s.id, s.description);
    for (const s of Object.values(data.signatureScripts)) isMeaningful(s.id, s.description);
    for (const s of Object.values(data.affixScripts)) isMeaningful(s.id, s.description);
  });

  it('covers every dataset script slug with curated metadata', () => {
    for (const id of Object.keys(data.focusScripts)) expect(FOCUS_META[id]).toBeDefined();
    for (const id of Object.keys(data.signatureScripts)) expect(SIGNATURE_META[id]).toBeDefined();
    for (const id of Object.keys(data.affixScripts)) expect(AFFIX_META[id]).toBeDefined();
  });

  it('applies the Update 50 "Class Mastery" -> "Class Flourish" rename', () => {
    expect(data.signatureScripts['class-mastery'].name).toBe('Class Flourish');
  });

  it('corrects affix buff tiers to the game-data oracle values', () => {
    expect(data.affixScripts['force'].description).toMatch(/Minor Force/);
    expect(data.affixScripts['force'].description).toMatch(/Critical Damage/);
    expect(data.affixScripts['maim'].description).toMatch(/Minor Maim/);
    expect(data.affixScripts['berserk'].description).toMatch(/Minor Berserk/);
    expect(data.affixScripts['empower'].description).toMatch(/Heavy Attack/);
  });
});

describe('focus availability', () => {
  it('is a strict subset per grimoire (not every focus on every grimoire)', () => {
    const tk = getFocusScriptIdsForGrimoire(data.grimoires['traveling-knife']);
    expect(tk.length).toBeGreaterThan(0);
    expect(tk.length).toBeLessThan(Object.keys(data.focusScripts).length);
    // Traveling Knife supports physical but not taunt.
    expect(tk).toContain('physical-damage');
    expect(tk).not.toContain('taunt');
  });

  it('drops the research-refuted Shield Throw + Healing transform', () => {
    const st = getFocusScriptIdsForGrimoire(data.grimoires['shield-throw']);
    expect(st).not.toContain('healing');
    expect(data.focusScripts['healing'].compatibleGrimoires).not.toContain('shield-throw');
  });

  it('keeps a focus.compatibleGrimoires consistent with the engine derivation', () => {
    for (const focus of Object.values(data.focusScripts)) {
      for (const grimoireId of focus.compatibleGrimoires) {
        expect(getFocusScriptIdsForGrimoire(data.grimoires[grimoireId])).toContain(focus.id);
      }
    }
  });
});

describe('deriveScribedSkill', () => {
  it('resolves the real in-game name + ability id for a focused grimoire', () => {
    const result = deriveScribedSkill(data, {
      grimoireId: 'traveling-knife',
      focusId: 'physical-damage',
    });
    expect(result).not.toBeNull();
    expect(result?.skillName).toBe('Sundering Knife');
    expect(result?.abilityId).toBe(217359);
    expect(result?.resourceType).toBe('stamina');
    expect(result?.icon).toBe('ability_grimoire_dualwield');
    expect(result?.skillLine).toBe('Dual Wield');
  });

  it('composes one effect line per chosen script and flags completeness', () => {
    const result = deriveScribedSkill(data, {
      grimoireId: 'traveling-knife',
      focusId: 'physical-damage',
      signatureId: 'lingering-torment',
      affixId: 'off-balance',
    });
    expect(result?.effects.map((e) => e.slot)).toEqual(['focus', 'signature', 'affix']);
    expect(result?.isComplete).toBe(true);
    expect(result?.warnings).toHaveLength(0);
  });

  it('does not reuse the base ability id for a transform with no matched ability', () => {
    // Elemental Explosion + Shock Damage ("Shocking Explosion") is a real focus
    // but the dataset has no matched ability id (matchCount: 0). The result must
    // not fall back to the grimoire's base ability id.
    const result = deriveScribedSkill(data, {
      grimoireId: 'elemental-explosion',
      focusId: 'shock-damage',
    });
    expect(result?.skillName).toBe('Shocking Explosion');
    expect(result?.abilityId).toBeUndefined();
  });

  it('warns (but does not crash) on an incompatible focus', () => {
    const result = deriveScribedSkill(data, {
      grimoireId: 'traveling-knife',
      focusId: 'taunt',
    });
    expect(result?.skillName).toBe('Traveling Knife'); // no transform
    expect(result?.warnings.length).toBeGreaterThan(0);
  });

  it('excludes an incompatible script from effects and completeness', () => {
    // lingering-torment is not available on Banner Bearer.
    const result = deriveScribedSkill(data, {
      grimoireId: 'banner-bearer',
      focusId: 'flame-damage',
      signatureId: 'lingering-torment',
      affixId: 'brutality-and-sorcery',
    });
    expect(result?.effects.map((e) => e.slot)).toEqual(['focus', 'affix']); // no signature
    expect(result?.isComplete).toBe(false);
    expect(result?.warnings.some((w) => /Lingering Torment/.test(w))).toBe(true);
  });

  it('returns null for an unknown grimoire', () => {
    expect(deriveScribedSkill(data, { grimoireId: 'nope' })).toBeNull();
  });

  it('summarises a build as a single readable line', () => {
    const result = deriveScribedSkill(data, {
      grimoireId: 'banner-bearer',
      focusId: 'flame-damage',
    });
    expect(summarizeScribedSkill(result!)).toContain('Banner Bearer');
  });
});

describe('getCompatibleScripts', () => {
  it('returns non-empty, grimoire-appropriate scripts for every grimoire', () => {
    for (const grimoireId of Object.keys(data.grimoires)) {
      const c = getCompatibleScripts(data, grimoireId);
      expect(c.focusScripts.length).toBeGreaterThan(0);
      // All returned scripts must list this grimoire as compatible.
      for (const s of [...c.signatureScripts, ...c.affixScripts]) {
        expect(s.compatibleGrimoires).toContain(grimoireId);
      }
    }
  });
});
