import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ABILITY_ICON_BASE_URL } from '../../../../utils/abilityIconCorrections';
import type { DpsParseBuildResponse } from '../../types/dpsParses.types';
import { assetIconUrl, gearIconUrl } from '../../utils/buildIconUrls';
import { RepresentativeBuildEvidence } from '../RepresentativeBuildEvidence';

const theme = createTheme();

/**
 * The old `if (icon.startsWith('http')) return icon` branch let combatant data
 * (user-influenced) point images at arbitrary hosts. These tests pin the
 * contract: every icon resolves against the asset host only.
 */
describe('gear/asset icon URLs', () => {
  it('builds gear icons from the asset host regardless of the raw value', () => {
    expect(gearIconUrl('gear_test_head')).toBe(`${ABILITY_ICON_BASE_URL}gear_test_head.png`);
    expect(assetIconUrl('gear_test_head')).toBe(`${ABILITY_ICON_BASE_URL}gear_test_head.png`);
  });

  it('never passes a remote-looking icon straight through', () => {
    const hostile = 'http://evil.example/track.png';
    expect(gearIconUrl(hostile)).toBe(`${ABILITY_ICON_BASE_URL}${encodeURIComponent(hostile)}.png`);
    expect(gearIconUrl(hostile)).not.toContain('evil.example/track.png');
  });

  it('returns undefined for missing icons', () => {
    expect(gearIconUrl(undefined)).toBeUndefined();
    expect(gearIconUrl('')).toBeUndefined();
  });
});

describe('RepresentativeBuildEvidence icon handling', () => {
  const HOSTILE_ICON = 'http://evil.example/evil.png';

  function renderEvidence(icon?: string, setName = 'Hostile Set', pieceCount = 1): void {
    const build: DpsParseBuildResponse = {
      parseId: 'p1',
      playerName: 'Top Parser',
      combatant: {
        gear: Array.from({ length: pieceCount }, (_, slot) => ({
          slot,
          itemId: 1,
          setId: 11,
          name: 'Hostile Helm',
          icon,
        })),
        // One talent so the skill tiles render through their own path too.
        talents: [{ slot: 0, abilityId: 100_000, name: 'Ability', icon }],
        sets: [{ setId: 11, name: setName }],
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
    expect(srcs).toContain(`${ABILITY_ICON_BASE_URL}${encodeURIComponent(HOSTILE_ICON)}.png`);
    srcs.forEach((src) => expect(src).not.toMatch(/^https?:\/\/evil\.example/));
  });

  it('still shows the placeholder when no icon is provided', () => {
    renderEvidence(undefined);
    expect(screen.getByText('SET')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /hostile set, 1 piece/i })).toBeInTheDocument();
  });

  it('uses focusable non-action semantics for tooltip-only evidence', () => {
    renderEvidence(undefined);

    expect(screen.getByRole('group', { name: /hostile set, 1 piece/i })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByRole('img', { name: 'Ability' })).toHaveAttribute('tabindex', '0');
    expect(screen.queryByRole('button', { name: /hostile set/i })).not.toBeInTheDocument();
  });

  it('supports keyboard focus and exposes tooltip descriptions without button semantics', async () => {
    const user = userEvent.setup();
    renderEvidence(undefined, 'Deadly Strike');

    const setTile = screen.getByRole('group', { name: /deadly strike set, 1 piece/i });
    const skillTile = screen.getByRole('img', { name: 'Ability' });

    await user.tab();
    expect(document.activeElement).toBe(setTile);
    await screen.findByRole('tooltip', { name: /deadly strike/i });
    expect(setTile).toHaveAccessibleName(/deadly strike/i);
    expect(setTile).not.toHaveAttribute('role', 'button');

    await user.tab();
    expect(document.activeElement).toBe(skillTile);
    await screen.findByRole('tooltip', { name: 'Ability' });
    expect(skillTile).toHaveAccessibleName('Ability');
    expect(skillTile).not.toHaveAttribute('role', 'button');
  });

  it('keeps set names and piece counts grammatically correct', () => {
    renderEvidence(undefined, 'Hostile Set');

    const singlePieceTile = screen.getByRole('group', { name: 'Hostile Set, 1 piece' });
    expect(singlePieceTile).not.toHaveAccessibleName(/set set|1 pieces/i);
  });

  it('uses the plural piece label for multi-piece sets', () => {
    renderEvidence(undefined, 'Deadly Strike', 2);

    expect(screen.getByRole('group', { name: 'Deadly Strike set, 2 pieces' })).toBeInTheDocument();
  });
});
