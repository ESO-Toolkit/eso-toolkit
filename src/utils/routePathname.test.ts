import { stripBasePath } from './routePathname';

describe('stripBasePath', () => {
  it('leaves a root-deployed path untouched', () => {
    expect(stripBasePath('/latest-reports', '/')).toBe('/latest-reports');
    expect(stripBasePath('/', '/')).toBe('/');
  });

  it('drops a trailing slash so prefix matching is exact', () => {
    expect(stripBasePath('/latest-reports/', '/')).toBe('/latest-reports');
  });

  it('strips a preview deploy base path', () => {
    // The case that made the entry-module gates no-op on every dev preview.
    expect(stripBasePath('/dev-previews/pr-1497/latest-reports/', '/dev-previews/pr-1497/')).toBe(
      '/latest-reports',
    );
    expect(
      stripBasePath('/dev-previews/pr-1497/report/AbC123/fight/5', '/dev-previews/pr-1497/'),
    ).toBe('/report/AbC123/fight/5');
  });

  it('maps the base root itself to /', () => {
    expect(stripBasePath('/dev-previews/pr-1497/', '/dev-previews/pr-1497/')).toBe('/');
  });

  it('does not strip a base that only looks like a prefix', () => {
    expect(stripBasePath('/dev-previews/pr-14970/latest-reports', '/dev-previews/pr-1497/')).toBe(
      '/dev-previews/pr-14970/latest-reports',
    );
  });
});
