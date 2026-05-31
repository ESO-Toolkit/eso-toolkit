/**
 * TimelineLegend Component Tests
 *
 * Verifies the legend only surfaces the marker types actually present.
 *
 * @module TimelineLegend.test
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TimelineLegend } from './TimelineLegend';
import {
  PhaseMarker,
  DeathMarker,
  CustomMarker,
  TimelineAnnotation,
} from '../../../types/timelineAnnotations';

const phase: PhaseMarker = {
  id: 'phase-1',
  timestamp: 30000,
  type: 'phase',
  label: 'Phase 1',
  phaseId: 1,
};

const friendlyDeath: DeathMarker = {
  id: 'death-1',
  timestamp: 45000,
  type: 'death',
  label: '💀 Ally',
  actorId: 1,
  actorName: 'Ally',
  isFriendly: true,
};

const enemyDeath: DeathMarker = {
  id: 'death-2',
  timestamp: 50000,
  type: 'death',
  label: '☠️ Enemy',
  actorId: 2,
  actorName: 'Enemy',
  isFriendly: false,
};

const custom: CustomMarker = {
  id: 'custom-1',
  timestamp: 60000,
  type: 'custom',
  label: 'Note',
};

describe('TimelineLegend', () => {
  it('renders nothing when there are no markers', () => {
    const { container } = render(<TimelineLegend markers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows only the marker types present', () => {
    render(<TimelineLegend markers={[friendlyDeath]} />);
    expect(screen.getByText('Ally death')).toBeInTheDocument();
    expect(screen.queryByText('Enemy death')).not.toBeInTheDocument();
    expect(screen.queryByText('Phase')).not.toBeInTheDocument();
    expect(screen.queryByText('Marker')).not.toBeInTheDocument();
  });

  it('distinguishes friendly and enemy deaths', () => {
    render(<TimelineLegend markers={[friendlyDeath, enemyDeath]} />);
    expect(screen.getByText('Ally death')).toBeInTheDocument();
    expect(screen.getByText('Enemy death')).toBeInTheDocument();
  });

  it('renders all four entries when every type is present', () => {
    const all: TimelineAnnotation[] = [phase, friendlyDeath, enemyDeath, custom];
    render(<TimelineLegend markers={all} />);
    expect(screen.getByText('Phase')).toBeInTheDocument();
    expect(screen.getByText('Ally death')).toBeInTheDocument();
    expect(screen.getByText('Enemy death')).toBeInTheDocument();
    expect(screen.getByText('Marker')).toBeInTheDocument();
  });
});
