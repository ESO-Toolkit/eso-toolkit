import { createTheme } from '@mui/material/styles';

import {
  REPLAY_Z,
  overlayIconButton,
  overlayPanelSurface,
  overlayPillSurface,
} from './replayDesign';

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
    const sx = overlayPanelSurface(darkTheme);
    expect(sx.backdropFilter).toContain('blur');
    expect(sx.transform).toBeUndefined();
  });

  it('drops the blur and adds a GPU compositing layer in solid mode', () => {
    const sx = overlayPanelSurface(darkTheme, { solid: true });
    expect(sx.backdropFilter).toBeUndefined();
    expect(sx.transform).toBe('translateZ(0)');
  });

  it('derives its tint from the live theme so light mode differs from dark mode', () => {
    const dark = overlayPanelSurface(darkTheme);
    const light = overlayPanelSurface(lightTheme);
    expect(dark.backgroundColor).not.toEqual(light.backgroundColor);
  });
});

describe('overlayPillSurface', () => {
  it('is fully rounded', () => {
    expect(overlayPillSurface(darkTheme).borderRadius).toBe('999px');
  });

  it('accepts a semantic accent override for the border/glow', () => {
    const warn = overlayPillSurface(darkTheme, { accent: 'rgba(252,211,77,1)' });
    const dflt = overlayPillSurface(darkTheme);
    expect(warn.border).not.toEqual(dflt.border);
  });
});

describe('overlayIconButton', () => {
  it('adds a visible focus-visible ring', () => {
    const sx = overlayIconButton(darkTheme) as Record<string, unknown>;
    expect(sx['&:focus-visible']).toBeDefined();
  });

  it('floors inactive-icon contrast above the old 0.55 alpha', () => {
    const sx = overlayIconButton(darkTheme, false);
    expect(sx.color).toBe('rgba(255, 255, 255, 0.7)');
  });

  it('renders fully white when active or when no active state applies', () => {
    expect(overlayIconButton(darkTheme, true).color).toBe('white');
    expect(overlayIconButton(darkTheme).color).toBe('white');
  });
});
