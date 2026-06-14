import {
  ABILITY_ICON_BASE_URL,
  ABILITY_ICON_FILE_OVERRIDES,
  ABILITY_ICON_ID_OVERRIDES,
  abilityIconUrl,
  correctAbilityIcon,
} from './abilityIconCorrections';

// The broken filename ESO Logs serves for Magma Fist / "Stone Giant".
const BROKEN = 'ability_dragonknight_013_stonefist_b';
const CORRECT = 'ability_dragonknight_013_a';

describe('abilityIconCorrections', () => {
  describe('override tables', () => {
    it('seeds the known Magma Fist ability ids to the correct icon', () => {
      // Guard so the entries cannot be silently dropped — these are the live fix.
      expect(ABILITY_ICON_ID_OVERRIDES[31816]).toBe(CORRECT);
      expect(ABILITY_ICON_ID_OVERRIDES[133027]).toBe(CORRECT);
      expect(ABILITY_ICON_ID_OVERRIDES[258293]).toBe(CORRECT);
    });

    it('seeds the broken filename to the correct icon', () => {
      expect(ABILITY_ICON_FILE_OVERRIDES[BROKEN]).toBe(CORRECT);
    });
  });

  describe('correctAbilityIcon', () => {
    it('corrects via ability id even when the raw filename is the broken one', () => {
      expect(correctAbilityIcon(BROKEN, 31816)).toBe(CORRECT);
    });

    it('corrects via ability id when the raw filename is missing', () => {
      // A U50 id absent from our dataset still resolves through the id table.
      expect(correctAbilityIcon(undefined, 258293)).toBe(CORRECT);
      expect(correctAbilityIcon('', 31816)).toBe(CORRECT);
    });

    it('corrects via the broken filename when the id is unknown/absent', () => {
      // No id in scope, but the report served the known-broken file.
      expect(correctAbilityIcon(BROKEN)).toBe(CORRECT);
      expect(correctAbilityIcon(BROKEN, 999999)).toBe(CORRECT);
    });

    it('accepts string ability ids', () => {
      expect(correctAbilityIcon(BROKEN, '31816')).toBe(CORRECT);
    });

    it('passes a normal icon through unchanged', () => {
      expect(correctAbilityIcon('ability_arcanist_005_a', 185842)).toBe('ability_arcanist_005_a');
      expect(correctAbilityIcon('ability_arcanist_005_a')).toBe('ability_arcanist_005_a');
    });

    it('returns nullish/empty input as-is when no correction applies', () => {
      expect(correctAbilityIcon(undefined)).toBeUndefined();
      expect(correctAbilityIcon(null)).toBeNull();
      expect(correctAbilityIcon('')).toBe('');
    });

    it('ignores non-finite ability ids', () => {
      expect(correctAbilityIcon('ability_arcanist_005_a', Number.NaN)).toBe(
        'ability_arcanist_005_a',
      );
      expect(correctAbilityIcon('ability_arcanist_005_a', 'not-a-number')).toBe(
        'ability_arcanist_005_a',
      );
    });
  });

  describe('abilityIconUrl', () => {
    it('builds a corrected CDN url from the broken filename', () => {
      expect(abilityIconUrl(BROKEN, 31816)).toBe(`${ABILITY_ICON_BASE_URL}${CORRECT}.png`);
    });

    it('builds a normal CDN url for an uncorrected filename', () => {
      expect(abilityIconUrl('ability_arcanist_005_a')).toBe(
        `${ABILITY_ICON_BASE_URL}ability_arcanist_005_a.png`,
      );
    });

    it('returns undefined for nullish/empty input with no id correction', () => {
      expect(abilityIconUrl(undefined)).toBeUndefined();
      expect(abilityIconUrl(null)).toBeUndefined();
      expect(abilityIconUrl('')).toBeUndefined();
    });

    it('builds a url from the id correction even when the filename is empty', () => {
      expect(abilityIconUrl('', 31816)).toBe(`${ABILITY_ICON_BASE_URL}${CORRECT}.png`);
    });
  });
});
