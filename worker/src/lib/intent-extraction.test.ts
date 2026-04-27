import { extractIntent } from './intent-extraction';

describe('extractIntent', () => {
  it('extracts weapon types', () => {
    const result = extractIntent('What is the best dual wield build?');
    expect(result.weapons).toContain('dual wield');
  });

  it('extracts abbreviations', () => {
    const result = extractIntent('Is DW better than 2H for DPS?');
    expect(result.weapons).toContain('dual wield');
    expect(result.weapons).toContain('two handed');
    expect(result.roles).toContain('dps');
  });

  it('extracts traits', () => {
    const result = extractIntent('Should I use nirnhoned or precise on front bar?');
    expect(result.traits).toContain('nirnhoned');
    expect(result.traits).toContain('precise');
    expect(result.keywords).toContain('front bar');
  });

  it('extracts enchants', () => {
    const result = extractIntent('Is crusher or weakening better for tanks?');
    expect(result.enchants).toContain('crusher');
    expect(result.enchants).toContain('weakening');
    expect(result.roles).toContain('tank');
  });

  it('extracts classes', () => {
    const result = extractIntent('Best DK tank build?');
    expect(result.classes).toContain('dragonknight');
    expect(result.roles).toContain('tank');
  });

  it('extracts multiple classes', () => {
    const result = extractIntent('Is nightblade or sorc better for magicka dps?');
    expect(result.classes).toContain('nightblade');
    expect(result.classes).toContain('sorcerer');
    expect(result.roles).toContain('magicka dps');
  });

  it('extracts game keywords', () => {
    const result = extractIntent('How do I improve my parse score in vet trials?');
    expect(result.keywords).toContain('parse');
    expect(result.keywords).toContain('trial');
    expect(result.keywords).toContain('vet');
  });

  it('extracts destruction staff variants', () => {
    const result = extractIntent('Should I use inferno staff or lightning staff on back bar?');
    expect(result.weapons).toContain('destruction staff');
    expect(result.keywords).toContain('back bar');
  });

  it('handles empty message', () => {
    const result = extractIntent('');
    expect(result.weapons).toHaveLength(0);
    expect(result.traits).toHaveLength(0);
    expect(result.enchants).toHaveLength(0);
    expect(result.roles).toHaveLength(0);
    expect(result.classes).toHaveLength(0);
  });

  it('handles message with no ESO terms', () => {
    const result = extractIntent('Hello, how are you today?');
    expect(result.weapons).toHaveLength(0);
    expect(result.traits).toHaveLength(0);
    expect(result.enchants).toHaveLength(0);
    expect(result.roles).toHaveLength(0);
    expect(result.classes).toHaveLength(0);
  });
});
