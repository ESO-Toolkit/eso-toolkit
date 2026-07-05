import {
  CHAMPION_POINT_ABILITIES,
  ChampionPointAbilityId,
  ChampionPointTree,
} from './champion-points';

describe('ChampionPointAbilityId — crit-damage stars', () => {
  it('locks the champion-skill ids the crit-damage gate relies on', () => {
    // A wrong id would silently under-count every player with the star slotted.
    expect(ChampionPointAbilityId.FightingFinesse).toBe(12);
    expect(ChampionPointAbilityId.Backstabber).toBe(31);
  });

  it('maps Backstabber into the Warfare tree', () => {
    const meta = CHAMPION_POINT_ABILITIES[ChampionPointAbilityId.Backstabber];
    expect(meta?.name).toBe('Backstabber');
    expect(meta?.tree).toBe(ChampionPointTree.Warfare);
  });
});
