import { createTheme, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

import {
  REPLAY_Z,
  overlayIconButton,
  overlayPanelSurface,
  overlayPillSurface,
} from './replayDesign';

/**
 * The token helpers return MUI's `SystemStyleObject<Theme>` — a UNION that also covers the
 * pseudo-selector and CSS-variable shapes, so TypeScript rejects a plain property read like
 * `sx.backdropFilter` even though every helper here returns a flat style object. (The app-level
 * `tsc --noEmit` never caught this: the base tsconfig excludes *.test.ts, so only the separate
 * `npm run typecheck:test` gate compiles this file.) Narrow once here instead of casting on
 * every assertion line.
 */
const styles = (sx: SystemStyleObject<Theme>): Record<string, unknown> =>
  sx as Record<string, unknown>;

const darkTheme = createTheme({ palette: { mode: 'dark' } });
const lightTheme = createTheme({ palette: { mode: 'light' } });

describe('REPLAY_Z', () => {
  it('orders rungs low to high: panel < hint < overlay < hud < help', () => {
    expect(REPLAY_Z.panel).toBeLessThan(REPLAY_Z.hint);
    expect(REPLAY_Z.hint).toBeLessThan(REPLAY_Z.overlay);
    expect(REPLAY_Z.overlay).toBeLessThan(REPLAY_Z.hud);
    expect(REPLAY_Z.hud).toBeLessThan(REPLAY_Z.help);
  });

  it('matches the values already live across the replay overlays', () => {
    expect(REPLAY_Z).toEqual({ panel: 3, hint: 4, overlay: 5, hud: 6, help: 12 });
  });
});

describe('overlayPanelSurface', () => {
  it('uses a translucent backdrop-blurred fill by default', () => {
    const sx = styles(overlayPanelSurface(darkTheme));
    expect(sx.backdropFilter).toContain('blur');
    expect(sx.transform).toBeUndefined();
  });

  it('drops the blur and adds a GPU compositing layer in solid mode', () => {
    const sx = styles(overlayPanelSurface(darkTheme, { solid: true }));
    expect(sx.backdropFilter).toBeUndefined();
    expect(sx.transform).toBe('translateZ(0)');
  });

  it('derives its tint from the live theme so light mode differs from dark mode', () => {
    const dark = styles(overlayPanelSurface(darkTheme));
    const light = styles(overlayPanelSurface(lightTheme));
    expect(dark.backgroundColor).not.toEqual(light.backgroundColor);
  });
});

describe('overlayPillSurface', () => {
  it('is fully rounded', () => {
    expect(styles(overlayPillSurface(darkTheme)).borderRadius).toBe('999px');
  });

  it('accepts a semantic accent override for the border/glow', () => {
    const warn = styles(overlayPillSurface(darkTheme, { accent: 'rgba(252,211,77,1)' }));
    const dflt = styles(overlayPillSurface(darkTheme));
    expect(warn.border).not.toEqual(dflt.border);
  });
});

describe('overlayIconButton', () => {
  it('adds a visible focus-visible ring', () => {
    const sx = styles(overlayIconButton(darkTheme));
    expect(sx['&:focus-visible']).toBeDefined();
  });

  it('floors inactive-icon contrast above the old 0.55 alpha', () => {
    const sx = styles(overlayIconButton(darkTheme, false));
    expect(sx.color).toBe('rgba(255, 255, 255, 0.7)');
  });

  it('renders fully white when active or when no active state applies', () => {
    expect(styles(overlayIconButton(darkTheme, true)).color).toBe('white');
    expect(styles(overlayIconButton(darkTheme)).color).toBe('white');
  });
});
