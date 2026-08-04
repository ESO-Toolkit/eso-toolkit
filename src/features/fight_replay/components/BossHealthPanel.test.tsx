/**
 * BossHealthPanel smoke tests
 *
 * The panel is a DOM overlay that renders a bar per boss with health, and renders nothing
 * when there are no bosses. The live per-frame health values are written imperatively by an
 * rAF loop (not asserted here — jsdom has no real rAF cadence); these tests cover the
 * render-on-boss-set behavior, which is what React owns.
 *
 * @module BossHealthPanel.test
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  ActorPosition,
  TimestampPositionLookup,
} from '../../../workers/calculations/CalculateActorPositions';

import { BossHealthPanel } from './BossHealthPanel';

function makeLookup(actors: ActorPosition[]): TimestampPositionLookup {
  const positionsByTimestamp: Record<number, Record<number, ActorPosition>> = { 0: {} };
  for (const a of actors) positionsByTimestamp[0][a.id] = a;
  return {
    positionsByTimestamp,
    sortedTimestamps: [0],
    fightDuration: 0,
    fightStartTime: 0,
    sampleInterval: 0,
    hasRegularIntervals: false,
  };
}

const boss = (id: number, name: string, pct: number): ActorPosition => ({
  id,
  name,
  type: 'boss',
  position: [0, 0, 0],
  rotation: 0,
  isDead: false,
  health: { current: pct * 1000, max: 100000, percentage: pct },
});

describe('BossHealthPanel', () => {
  it('renders nothing when there are no bosses', () => {
    const lookup = makeLookup([]);
    // Bosses state starts empty and only a boss-bearing frame would populate it, so the
    // panel renders null on mount.
    const { container } = render(<BossHealthPanel lookup={lookup} timeRef={{ current: 0 }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a bar for each boss with health', async () => {
    const lookup = makeLookup([boss(1, 'Flame-Herald Bahsei', 87.5), boss(2, 'Add', 40)]);
    render(<BossHealthPanel lookup={lookup} timeRef={{ current: 0 }} />);
    // The boss SET is discovered on the first rAF tick → React re-renders with the names.
    expect(await screen.findByText('Flame-Herald Bahsei')).toBeInTheDocument();
    expect(await screen.findByText('Add')).toBeInTheDocument();
  });

  it('renders bars only for bosses in a mixed player/boss lookup', async () => {
    // Guards the for-in boss scan over the by-id record: players and healthless
    // actors interleaved with bosses must not produce bars.
    const player = (id: number, name: string): ActorPosition => ({
      id,
      name,
      type: 'player',
      position: [0, 0, 0],
      rotation: 0,
      isDead: false,
      health: { current: 20000, max: 20000, percentage: 100 },
    });
    const lookup = makeLookup([
      player(1, 'Necrofeell'),
      boss(2, 'Taleria', 62.5),
      player(3, 'Spikejo'),
      { ...boss(4, 'Healthless Add', 0), health: undefined },
    ]);
    render(<BossHealthPanel lookup={lookup} timeRef={{ current: 0 }} />);
    expect(await screen.findByText('Taleria')).toBeInTheDocument();
    expect(screen.queryByText('Necrofeell')).not.toBeInTheDocument();
    expect(screen.queryByText('Spikejo')).not.toBeInTheDocument();
    expect(screen.queryByText('Healthless Add')).not.toBeInTheDocument();
  });
});
