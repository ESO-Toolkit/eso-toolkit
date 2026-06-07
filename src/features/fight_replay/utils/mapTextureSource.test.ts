import * as envUtils from '../../../utils/envUtils';

import { MAP_TILE_OVERRIDES, getMapTextureUrl } from './mapTextureSource';

// envUtils wraps import.meta.env (unparseable by Jest); mock it so we can drive VITE_SELF_HOSTED_MAPS.
jest.mock('../../../utils/envUtils');

describe('getMapTextureUrl', () => {
  const ORIGINAL = { ...MAP_TILE_OVERRIDES };
  const getEnvVarMock = envUtils.getEnvVar as jest.MockedFunction<typeof envUtils.getEnvVar>;

  beforeEach(() => {
    getEnvVarMock.mockReturnValue(undefined); // flag unset by default
  });

  afterEach(() => {
    // The override export is mutable; restore it between tests.
    for (const key of Object.keys(MAP_TILE_OVERRIDES)) delete MAP_TILE_OVERRIDES[key];
    Object.assign(MAP_TILE_OVERRIDES, ORIGINAL);
    jest.clearAllMocks();
  });

  it('defaults to the RPGLogs CDN for a map with no override', () => {
    expect(getMapTextureUrl('blackwood/u30_rg_map_outside_002')).toBe(
      'https://assets.rpglogs.com/img/eso/maps/blackwood/u30_rg_map_outside_002.jpg',
    );
  });

  it('returns the self-hosted override when one is registered', () => {
    MAP_TILE_OVERRIDES['systres/dsr_b3_map'] = 'https://maps.esotk.com/systres/dsr_b3_map.webp';
    expect(getMapTextureUrl('systres/dsr_b3_map')).toBe(
      'https://maps.esotk.com/systres/dsr_b3_map.webp',
    );
  });

  it('falls back to the CDN for the override kill switch (VITE_SELF_HOSTED_MAPS=false)', () => {
    MAP_TILE_OVERRIDES['systres/dsr_b3_map'] = 'https://maps.esotk.com/systres/dsr_b3_map.webp';
    getEnvVarMock.mockReturnValue('false');
    expect(getMapTextureUrl('systres/dsr_b3_map')).toBe(
      'https://assets.rpglogs.com/img/eso/maps/systres/dsr_b3_map.jpg',
    );
  });

  it('preserves the nested map-file path (zone-prefixed file names) in the default URL', () => {
    expect(getMapTextureUrl('dungeons/osscage_section1map002')).toBe(
      'https://assets.rpglogs.com/img/eso/maps/dungeons/osscage_section1map002.jpg',
    );
  });
});
