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

  it('renders stat-coaching insights with the failure detail', () => {
    const coaching = computeStatCoaching({ physicalPen: PVE_PENETRATION_CAP + 3200 });
    render(<CompanionBuildPanel championPoints={null} coaching={coaching} />);
    expect(screen.getByText('Build Coaching')).toBeInTheDocument();
    expect(screen.getByText('Over the penetration cap')).toBeInTheDocument();
    expect(screen.getByText(/3,200 over/)).toBeInTheDocument();
  });
});
