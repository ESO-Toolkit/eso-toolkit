import { ESO_POTION_LOOKUP } from './esoPotions';

describe('Update 51 hybrid potion benefits', () => {
  it('preserves curated potion IDs while using hybridized Major buffs', () => {
    expect(ESO_POTION_LOOKUP[9001].effects).toEqual([
      'Restore Magicka',
      'Major Brutality',
      'Major Savagery',
    ]);
    expect(ESO_POTION_LOOKUP[9002].effects).toContain('Major Savagery');
    expect(ESO_POTION_LOOKUP[9011].effects).toContain('Major Brutality');
    expect(ESO_POTION_LOOKUP[9012].effects).toContain('Major Savagery');
    expect(ESO_POTION_LOOKUP[9023].effects).toContain('Major Savagery');
    expect(ESO_POTION_LOOKUP[9052].effects).toContain('Major Brutality');

    for (const id of [9001, 9002, 9011, 9012, 9023, 9024, 9052, 9053]) {
      expect(ESO_POTION_LOOKUP[id]).toBeDefined();
      expect(ESO_POTION_LOOKUP[id].effects).not.toContain('Major Sorcery');
      expect(ESO_POTION_LOOKUP[id].effects).not.toContain('Major Prophecy');
    }
  });
});
