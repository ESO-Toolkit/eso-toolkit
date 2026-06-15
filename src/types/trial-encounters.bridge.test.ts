/**
 * Tests for the trial-id bridge that keeps the Roster Builder's two trial
 * selectors in sync: the top-level "Built for (Trials)" picker tags rosters
 * with loadout-manager short codes (e.g. 'RG', 'MOL', 'KA'), while Per-Fight
 * Builds keys off encounter-data slugs (e.g. 'rockgrove'). `resolveTrialId`
 * bridges the two, and must stay total/1:1 across all 15 trials.
 */

import { resolveTrialId, getTrialById, TRIAL_ENCOUNTERS } from './trial-encounters';
import { TRIALS } from '../features/loadout-manager/data/trialConfigs';

describe('resolveTrialId', () => {
  it('resolves short codes case-insensitively', () => {
    expect(resolveTrialId('RG')).toBe('rockgrove');
    expect(resolveTrialId('rg')).toBe('rockgrove');
    expect(resolveTrialId('Rg')).toBe('rockgrove');
  });

  it('resolves codes whose casing differs from trialConfigs (MOL→MoL, HOF→HoF)', () => {
    // trialConfigs uses 'MOL'/'HOF'; encounter shortNames are 'MoL'/'HoF'.
    expect(resolveTrialId('MOL')).toBe('maw_of_lorkhaj');
    expect(resolveTrialId('HOF')).toBe('halls_of_fabrication');
  });

  it('resolves the apostrophe trials (KA, SE)', () => {
    expect(resolveTrialId('KA')).toBe('kynes_aegis');
    expect(resolveTrialId('SE')).toBe('sanitys_edge');
  });

  it('passes a full encounter-data slug through unchanged', () => {
    expect(resolveTrialId('rockgrove')).toBe('rockgrove');
    expect(resolveTrialId('ossein_cage')).toBe('ossein_cage');
  });

  it('returns undefined for empty or unknown tags', () => {
    expect(resolveTrialId('')).toBeUndefined();
    expect(resolveTrialId('NOPE')).toBeUndefined();
    expect(resolveTrialId('not_a_trial')).toBeUndefined();
  });

  it('resolves every trialConfigs trial code to a real encounter trial (1:1, no gaps)', () => {
    const trialCodes = TRIALS.filter((t) => t.type === 'trial').map((t) => t.id);
    // There are 15 ESO trials; guard against silent loss of one.
    expect(trialCodes.length).toBe(15);
    for (const code of trialCodes) {
      const slug = resolveTrialId(code);
      expect(slug).toBeDefined();
      // The resolved slug must point at a real encounter-data trial.
      expect(getTrialById(slug as string)).toBeDefined();
    }
  });

  it('every encounter trial is reachable from exactly one trialConfigs code', () => {
    const trialCodes = TRIALS.filter((t) => t.type === 'trial').map((t) => t.id);
    const reached = new Set(trialCodes.map((c) => resolveTrialId(c)).filter(Boolean));
    expect(reached.size).toBe(TRIAL_ENCOUNTERS.length);
    for (const t of TRIAL_ENCOUNTERS) {
      expect(reached.has(t.id)).toBe(true);
    }
  });
});
