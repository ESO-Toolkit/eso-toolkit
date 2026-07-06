import {
  abilityIconSources,
  iconSourcesFromName,
  RPGLOGS_ICON_BASE,
  UESP_ICON_BASE,
} from './iconCdn';

describe('iconSourcesFromName', () => {
  it('returns RPGLogs first, UESP second for a bare icon name', () => {
    const sources = iconSourcesFromName('gear_undspriggan_head_a');
    expect(sources).toEqual([
      `${RPGLOGS_ICON_BASE}gear_undspriggan_head_a.png`,
      `${UESP_ICON_BASE}gear_undspriggan_head_a.png`,
    ]);
  });

  it('orders the reliable CDN ahead of the blockable one', () => {
    const [primary, fallback] = iconSourcesFromName('ability_dragonknight_002');
    expect(primary).toContain('assets.rpglogs.com');
    expect(fallback).toContain('esoicons.uesp.net');
  });

  it('returns [] for nullish / empty input', () => {
    expect(iconSourcesFromName(null)).toEqual([]);
    expect(iconSourcesFromName(undefined)).toEqual([]);
    expect(iconSourcesFromName('')).toEqual([]);
  });

  it('passes a full URL through unchanged (single source)', () => {
    const url = 'https://esotk.com/assets/food/meat.png';
    expect(iconSourcesFromName(url)).toEqual([url]);
  });

  it('passes a root-relative bundled-asset path through unchanged', () => {
    expect(iconSourcesFromName('/assets/x.png')).toEqual(['/assets/x.png']);
  });

  it('encodes unusual characters in the name', () => {
    const [primary] = iconSourcesFromName('weird name');
    expect(primary).toBe(`${RPGLOGS_ICON_BASE}weird%20name.png`);
  });

  it('abilityIconSources is the same resolver', () => {
    expect(abilityIconSources('ability_x')).toEqual(iconSourcesFromName('ability_x'));
  });
});
