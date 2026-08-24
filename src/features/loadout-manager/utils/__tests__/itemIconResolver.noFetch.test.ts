/**
 * jsdom does not guarantee a fetch global. Synchronous consumers of the icon
 * resolver must still degrade to their generic-name behavior until the asset
 * can be loaded, while an explicit preload should report the environment
 * limitation clearly.
 */

describe('itemIconResolver without fetch', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as { fetch?: typeof fetch }).fetch;
    }
  });

  it('keeps synchronous weapon lookups fail-soft and rejects explicit preload', async () => {
    delete (globalThis as { fetch?: typeof fetch }).fetch;

    let preload: Promise<void>;
    jest.isolateModules(() => {
      const resolver = require('../itemIconResolver') as typeof import('../itemIconResolver');

      expect(() => resolver.getWeaponTypeLabel(1)).not.toThrow();
      expect(resolver.getWeaponTypeLabel(1)).toBeNull();
      preload = resolver.preloadIconData();
    });

    await expect(preload!).rejects.toThrow('Item icon data fetch is unavailable');
  });
});
