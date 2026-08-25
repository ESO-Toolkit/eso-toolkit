import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import React from 'react';

import type { DpsParseBuildResponse } from '../../types/dpsParses.types';
import { gearIconUrl } from '../BuildInspector';
import { ASSET_ICON_ROOT, RepresentativeBuildEvidence } from '../RepresentativeBuildEvidence';

const theme = createTheme();

/**
 * The old `if (icon.startsWith('http')) return icon` branch let combatant data
 * (user-influenced) point images at arbitrary hosts. These tests pin the
 * contract: every icon resolves against the asset host only.
 */
describe('gear/asset icon URLs', () => {
  it('builds gear icons from the asset host regardless of the raw value', () => {
    expect(gearIconUrl('gear_test_head')).toBe(`${ASSET_ICON_ROOT}gear_test_head.png`);
  });

  it('never passes a remote-looking icon straight through', () => {
    const hostile = 'http://evil.example/track.png';
    expect(gearIconUrl(hostile)).toBe(`${ASSET_ICON_ROOT}${encodeURIComponent(hostile)}.png`);
    expect(gearIconUrl(hostile)).not.toContain('evil.example/track.png');
  });

  it('returns undefined for missing icons', () => {
    expect(gearIconUrl(undefined)).toBeUndefined();
    expect(gearIconUrl('')).toBeUndefined();
  });
});

describe('RepresentativeBuildEvidence icon handling', () => {
  const HOSTILE_ICON = 'http://evil.example/evil.png';

  function renderEvidence(icon?: string): void {
    const build: DpsParseBuildResponse = {
      parseId: 'p1',
      playerName: 'Top Parser',
      combatant: {
        gear: [{ slot: 0, itemId: 1, setId: 11, name: 'Hostile Helm', icon }],
        // One talent so the skill tiles render through their own path too.
        talents: [{ slot: 0, abilityId: 100_000, name: 'Ability', icon }],
        sets: [{ setId: 11, name: 'Hostile Set' }],
      },
    };

    render(
      <ThemeProvider theme={theme}>
        <RepresentativeBuildEvidence build={build} esoClass="Arcanist" />
      </ThemeProvider>,
    );
  }

  it('loads set-piece icons only from the asset host', () => {
    renderEvidence(HOSTILE_ICON);

    const srcs = Array.from(document.querySelectorAll('img')).map((img) => img.getAttribute('src'));
    expect(srcs).toContain(`${ASSET_ICON_ROOT}${encodeURIComponent(HOSTILE_ICON)}.png`);
    srcs.forEach((src) => expect(src).not.toMatch(/^https?:\/\/evil\.example/));
  });

  it('still shows the placeholder when no icon is provided', () => {
    renderEvidence(undefined);
    expect(screen.getByText('SET')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /view hostile set set details/i }),
    ).toBeInTheDocument();
  });
});
