import { render, screen } from '@testing-library/react';
import React from 'react';

import { buildChampionPointsViewModel } from '@/features/loadout-manager/utils/esotkCompanionChampionPoints';
import {
  computeStatCoaching,
  PVE_PENETRATION_CAP,
} from '@/features/loadout-manager/utils/esotkCompanionCoaching';

import { CompanionBuildPanel } from '../CompanionBuildPanel';

// 25 = Deadly Aim (Warfare), 27 = Thaumaturge (Warfare)
const cpViewModel = buildChampionPointsViewModel({
  total: 3600,
  disciplines: { 1: { id: 1, skills: { 25: 50, 27: 20 } } },
  slotted: { 5: 25 },
});

describe('CompanionBuildPanel', () => {
  it('renders nothing when there is no companion data', () => {
    const { container } = render(<CompanionBuildPanel championPoints={null} coaching={[]} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('companion-build-panel')).toBeNull();
  });

  it('renders champion-point allocation grouped by tree with totals', () => {
    render(<CompanionBuildPanel championPoints={cpViewModel} coaching={[]} />);
    expect(screen.getByText('Champion Points')).toBeInTheDocument();
    expect(screen.getByText(/3,600 CP/)).toBeInTheDocument();
    expect(screen.getByText(/70 allocated/)).toBeInTheDocument(); // 50 + 20
    expect(screen.getByText('Warfare')).toBeInTheDocument();
    expect(screen.getByText('Deadly Aim 50')).toBeInTheDocument();
    expect(screen.getByText('Thaumaturge 20')).toBeInTheDocument();
  });

  it('renders slotted stars', () => {
    render(<CompanionBuildPanel championPoints={cpViewModel} coaching={[]} />);
    expect(screen.getByText('Slotted')).toBeInTheDocument();
    // slot 5 = skill 25 = Deadly Aim (appears as an allocated chip and a slotted chip)
    expect(screen.getAllByText(/Deadly Aim/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders stat-coaching insights as point-in-time readings', () => {
    const coaching = computeStatCoaching({ physicalPen: PVE_PENETRATION_CAP + 3200 });
    render(<CompanionBuildPanel championPoints={null} coaching={coaching} />);
    expect(screen.getByText('Build Coaching')).toBeInTheDocument();
    expect(screen.getByText('Penetration (character sheet)')).toBeInTheDocument();
    // Coaching without a stats prop must not render the captured-sheet section.
    expect(screen.queryByText('Sheet at Capture')).toBeNull();
  });

  it('renders captured consumables and sheet stats from companion effects', () => {
    render(
      <CompanionBuildPanel
        championPoints={null}
        coaching={[]}
        stats={{ physicalPen: 12345, weaponCrit: 10959, maxMagicka: 38000 }}
        effects={[
          { id: 13984, name: 'Boon: The Shadow', duration: 0 },
          { id: 9998, name: 'Bewitched Sugar Skulls', duration: 3_600_000 },
          { id: 68405, name: 'Major Fortitude', duration: 47_000 },
          { id: 68406, name: 'Major Intellect', duration: 47_000 },
          { id: 68408, name: 'Major Endurance', duration: 47_000 },
        ]}
        scribing={[
          {
            abilityId: 217340,
            name: 'Shattering Knife',
            bar: 'front',
            slot: 3,
            scripts: {
              1: { id: 1, slot: 1, name: 'Magic Damage' },
              2: { id: 31, slot: 2, name: 'Class Mastery' },
              3: { id: 42, slot: 3, name: 'Major Breach' },
            },
          },
        ]}
      />,
    );

    expect(screen.getByText('Captured Buffs')).toBeInTheDocument();
    expect(screen.getByText('Food: Bewitched Sugar Skulls')).toBeInTheDocument();
    expect(screen.getByText('Mundus: Shadow')).toBeInTheDocument();
    expect(
      screen.getByText('Potion: Tri-Stat Potion (Health, Magicka & Stamina)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Captured Scribing')).toBeInTheDocument();
    expect(
      screen.getByText('Shattering Knife: Magic Damage / Class Mastery / Major Breach'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sheet at Capture')).toBeInTheDocument();
    // Volatile (buff-dependent) chips.
    expect(screen.getByText('Volatile (buff-dependent)')).toBeInTheDocument();
    expect(screen.getByText('Physical Pen: 12,345')).toBeInTheDocument();
    expect(screen.getByText('Weapon Crit: 50%')).toBeInTheDocument();
    // Max-resource pools are grouped as Stable.
    expect(screen.getByText('Stable')).toBeInTheDocument();
    expect(screen.getByText('Max Magicka: 38,000')).toBeInTheDocument();
    // The point-in-time honesty surface: volatile chips carry a "point-in-time" title.
    const volatileChips = screen.getAllByTitle(/point-in-time character-sheet reading/i);
    expect(volatileChips.some((el) => el.textContent?.includes('Physical Pen'))).toBe(true);
  });

  it('shows only the Stable group when all captured stats are stable', () => {
    render(
      <CompanionBuildPanel championPoints={null} coaching={[]} stats={{ maxMagicka: 38000 }} />,
    );
    expect(screen.getByText('Sheet at Capture')).toBeInTheDocument();
    expect(screen.getByText('Stable')).toBeInTheDocument();
    expect(screen.getByText('Max Magicka: 38,000')).toBeInTheDocument();
    expect(screen.queryByText('Volatile (buff-dependent)')).toBeNull();
  });

  it('shows only the Volatile group when all captured stats are volatile', () => {
    render(
      <CompanionBuildPanel championPoints={null} coaching={[]} stats={{ physicalPen: 12345 }} />,
    );
    expect(screen.getByText('Sheet at Capture')).toBeInTheDocument();
    expect(screen.getByText('Volatile (buff-dependent)')).toBeInTheDocument();
    expect(screen.getByText('Physical Pen: 12,345')).toBeInTheDocument();
    expect(screen.queryByText('Stable')).toBeNull();
  });
});
