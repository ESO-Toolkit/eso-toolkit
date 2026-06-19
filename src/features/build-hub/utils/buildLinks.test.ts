import { getHubBuildViewUrl } from './buildLinks';

describe('getHubBuildViewUrl', () => {
  it('builds id-based hub view links', () => {
    expect(
      getHubBuildViewUrl({
        baseUrl: '/dev-previews/pr-1232/',
        buildId: 'private build/id',
        origin: 'https://eso-toolkit.example',
      }),
    ).toBe('https://eso-toolkit.example/dev-previews/pr-1232/bv?id=private%20build%2Fid');
  });

  it('preserves backend visibility enforcement for embedded links', () => {
    expect(
      getHubBuildViewUrl({
        baseUrl: '/',
        buildId: 'build-1',
        embed: true,
        origin: 'https://eso-toolkit.example',
      }),
    ).toBe('https://eso-toolkit.example/bv?id=build-1&embed=1');
  });
});
