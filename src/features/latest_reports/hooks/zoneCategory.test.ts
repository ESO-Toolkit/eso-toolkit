import { categorizeZone, zoneDisplayLabel } from './zoneCategory';

describe('categorizeZone', () => {
  it('classifies the Dungeons super-zone', () => {
    expect(categorizeZone('Dungeons')).toBe('Dungeons');
    expect(categorizeZone('dungeons')).toBe('Dungeons');
  });

  it('classifies arenas (solo + group) by name', () => {
    expect(categorizeZone('Maelstrom Arena')).toBe('Arenas');
    expect(categorizeZone('Arenas (Group)')).toBe('Arenas');
    expect(categorizeZone('Iron Atronach')).toBe('Arenas');
    expect(categorizeZone('Opulent Ordeal')).toBe('Arenas');
    expect(categorizeZone('Dragonstar Gauntlet')).toBe('Arenas');
  });

  it('classifies everything else as a trial', () => {
    expect(categorizeZone('Aetherian Archive')).toBe('Trials');
    expect(categorizeZone('Rockgrove')).toBe('Trials');
    expect(categorizeZone('Lucent Citadel')).toBe('Trials');
    expect(categorizeZone('Sanctum Ophidia')).toBe('Trials');
    // A trial whose name happens to contain none of the arena tokens.
    expect(categorizeZone("Kyne's Aegis")).toBe('Trials');
  });

  it('does not misclassify trials that merely contain an arena substring', () => {
    // "Ossein Cage" should not match \barena\b etc.
    expect(categorizeZone('Ossein Cage')).toBe('Trials');
  });
});

describe('zoneDisplayLabel', () => {
  it('relabels the Dungeons super-zone to "All Dungeons"', () => {
    expect(zoneDisplayLabel('Dungeons')).toBe('All Dungeons');
  });

  it('leaves other zone names unchanged', () => {
    expect(zoneDisplayLabel('Rockgrove')).toBe('Rockgrove');
    expect(zoneDisplayLabel('Maelstrom Arena')).toBe('Maelstrom Arena');
  });
});
