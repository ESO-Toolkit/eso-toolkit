// Jest auto-applies manual mocks in `<rootDir>/__mocks__/<package>` for
// node_modules. `@pmndrs/detect-gpu` is ESM-only (exports field resolves
// to .mjs), which Jest's CJS resolver can't walk — without this stub,
// every test that transitively imports detectPerfTier.ts (App.test,
// HeaderBar tests reaching PerfTierProvider, etc.) fails with
// "Cannot find module '@pmndrs/detect-gpu'".
//
// Tests that want to control return values (detectPerfTier.test.ts) use
// jest.mock('@pmndrs/detect-gpu', ...) at the top of the file, which
// overrides this default.
export const getGPUTier = async (): Promise<{ tier: number; isMobile: boolean }> => ({
  tier: 3,
  isMobile: false,
});
