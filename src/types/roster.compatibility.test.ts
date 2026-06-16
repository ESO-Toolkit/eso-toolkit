import { getSetDisplayName } from '../utils/setNameUtils';

import { KnownSetIDs } from './abilities';
import { validateCompatibility } from './roster';

/**
 * Regression tests for validateCompatibility's perfected-insensitive matching.
 *
 * COMPATIBILITY_RULES are keyed on base (non-perfected) set names, but roster
 * slots store the actual set ID and render the canonical display name — which is
 * "Perfected Saxhleel Champion" for the perfected variant (the one tank slot
 * pickers actually use, via TANK_5PIECE_SETS → PERFECTED_SAXHLEEL_CHAMPION).
 * Before the perfected-strip fix, the Saxhleel ↔ Nazaray exclusion warning only
 * fired for the bare "Saxhleel Champion" string, silently skipping the perfected
 * variant that tanks equip.
 */
describe('validateCompatibility — perfected/base set rule matching', () => {
  const NAZARAY = getSetDisplayName(KnownSetIDs.NAZARAY);
  const SAXHLEEL_BASE = getSetDisplayName(KnownSetIDs.SAXHLEEL_CHAMPION);
  const SAXHLEEL_PERFECTED = getSetDisplayName(KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION);

  it('sanity: display names are the expected canonical strings', () => {
    expect(NAZARAY).toBe('Nazaray');
    expect(SAXHLEEL_BASE).toBe('Saxhleel Champion');
    expect(SAXHLEEL_PERFECTED).toBe('Perfected Saxhleel Champion');
  });

  it('warns on Saxhleel Champion (base) + Nazaray', () => {
    const warnings = validateCompatibility([SAXHLEEL_BASE, NAZARAY]);
    expect(warnings).toContain('Saxhleel Champion cannot be paired with Nazaray');
  });

  it('warns on Perfected Saxhleel Champion + Nazaray (regression)', () => {
    const warnings = validateCompatibility([SAXHLEEL_PERFECTED, NAZARAY]);
    expect(warnings).toContain('Saxhleel Champion cannot be paired with Nazaray');
  });

  it('does not warn for Saxhleel Champion without Nazaray', () => {
    const warnings = validateCompatibility([SAXHLEEL_PERFECTED, 'Alkosh']);
    expect(warnings).not.toContain('Saxhleel Champion cannot be paired with Nazaray');
  });

  it('Nazaray required-ultimate rule still fires regardless of perfected pairing', () => {
    // Nazaray requires Warhorn or Atronach; pairing it with a non-matching ult warns.
    const warnings = validateCompatibility([NAZARAY], 'Barrier');
    expect(warnings.some((w) => w.startsWith('Nazaray should only be paired'))).toBe(true);
  });
});
