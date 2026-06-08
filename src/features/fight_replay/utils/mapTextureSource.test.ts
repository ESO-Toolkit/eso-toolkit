import * as envUtils from '../../../utils/envUtils';

import { HIRES_MAP_FILES, getMapTextureUrl } from './mapTextureSource';

// envUtils wraps import.meta.env (unparseable by Jest); mock it so we can drive the flags.
jest.mock('../../../utils/envUtils');

describe('getMapTextureUrl', () => {
  const getEnvVarMock = envUtils.getEnvVar as jest.MockedFunction<typeof envUtils.getEnvVar>;
  // A map that is NOT in the hi-res set, for the default-path tests.
  const PLAIN_MAP = 'systres/dsr_b3_map';
  // A map that IS registered as hi-res (asserted below so the test fails loudly if the set changes).
  const HIRES_MAP = 'blackwood/u30_rg_map_outside_002';

  beforeEach(() => {
    getEnvVarMock.mockImplementation((key: string) => (key === 'BASE_URL' ? '/' : undefined));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('the map under test is registered as hi-res (guards against accidental removal)', () => {
    expect(HIRES_MAP_FILES.has(HIRES_MAP)).toBe(true);
    expect(HIRES_MAP_FILES.has(PLAIN_MAP)).toBe(false);
  });

  it('defaults to the RPGLogs CDN for a map with no hi-res tile', () => {
    expect(getMapTextureUrl(PLAIN_MAP)).toBe(
      'https://assets.rpglogs.com/img/eso/maps/systres/dsr_b3_map.jpg',
    );
  });

  it('returns the self-hosted hi-res URL (base-prefixed) for a registered map', () => {
    expect(getMapTextureUrl(HIRES_MAP)).toBe('/maps-hires/blackwood/u30_rg_map_outside_002.jpg');
  });

  it('honors a non-root BASE_URL (e.g. a dev-preview subpath)', () => {
    getEnvVarMock.mockImplementation((key: string) =>
      key === 'BASE_URL' ? '/preview/' : undefined,
    );
    expect(getMapTextureUrl(HIRES_MAP)).toBe(
      '/preview/maps-hires/blackwood/u30_rg_map_outside_002.jpg',
    );
  });

  it('falls back to the CDN for a registered map when the kill switch is set', () => {
    getEnvVarMock.mockImplementation((key: string) => {
      if (key === 'VITE_SELF_HOSTED_MAPS') return 'false';
      if (key === 'BASE_URL') return '/';
      return undefined;
    });
    expect(getMapTextureUrl(HIRES_MAP)).toBe(
      'https://assets.rpglogs.com/img/eso/maps/blackwood/u30_rg_map_outside_002.jpg',
    );
  });

  it('preserves the nested map-file path in the default URL', () => {
    expect(getMapTextureUrl('dungeons/osscage_section1map002')).toBe(
      'https://assets.rpglogs.com/img/eso/maps/dungeons/osscage_section1map002.jpg',
    );
  });
});
