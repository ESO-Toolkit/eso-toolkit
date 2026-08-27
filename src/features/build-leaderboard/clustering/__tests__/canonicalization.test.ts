import { buildSetAliasMap, canonicalSetName, setDisplayName } from '../canonicalization';

describe('canonicalSetName', () => {
  it('strips the perfected prefix and normalizes case/whitespace', () => {
    expect(canonicalSetName('Perfected Slivers of the Null Arca')).toBe('slivers of the null arca');
    expect(canonicalSetName('  PERFECTED torug’s pact  ')).toBe('torug’s pact');
    expect(canonicalSetName('Slivers of the Null Arca')).toBe('slivers of the null arca');
  });
});

describe('buildSetAliasMap', () => {
  it('folds a perfected variant onto its base id', () => {
    const aliases = buildSetAliasMap();
    // 772 Perfected Slivers -> 767 base; both are in SET_DISPLAY_NAMES.
    expect(aliases[772]).toBe(767);
    expect(aliases[767]).toBeUndefined();
  });

  /**
   * Regression: three placeholder ids share the literal name 'Unknown'
   * (846/2268/2342). Folding them into one id merges genuinely different
   * new-set builds and masks each row's parse-provided name behind the
   * placeholder — the same seam class as the "Set 767" labeling bug.
   */
  it('never aliases the Unknown placeholder ids', () => {
    const aliases = buildSetAliasMap();
    for (const id of [846, 2268, 2342]) {
      expect(aliases[id]).toBeUndefined();
      expect(Object.values(aliases)).not.toContain(id);
    }
  });
});

describe('setDisplayName', () => {
  it('resolves known ids and returns empty (not a raw id) for unknown ones', () => {
    expect(setDisplayName(767)).toBe('Slivers of the Null Arca');
    expect(setDisplayName(999999999)).toBe('');
  });

  it('prefers an explicit fallback name over empty', () => {
    expect(setDisplayName(999999999, 'Some Brand New Set')).toBe('Some Brand New Set');
  });

  it('still resolves placeholder ids literally so callers can detect them', () => {
    // Callers treat 'Unknown' as a placeholder and prefer parse-provided names.
    expect(setDisplayName(846)).toBe('Unknown');
  });
});
