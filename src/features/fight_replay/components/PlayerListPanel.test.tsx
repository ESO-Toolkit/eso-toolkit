/**
 * PlayerListPanel smoke tests
 *
 * The panel is a DOM overlay listing every player with visibility + path toggles. These
 * tests cover the render contract React owns: a row per player (no clipping — the old canvas
 * silently dropped players past row 12), the header count, and the toggle callbacks. Live
 * per-frame health is written imperatively by an rAF loop and is not asserted here.
 *
 * @module PlayerListPanel.test
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { PlayerListPanel } from './PlayerListPanel';
import {
  ActorPosition,
  TimestampPositionLookup,
} from '../../../workers/calculations/CalculateActorPositions';

function makeLookup(players: ActorPosition[]): TimestampPositionLookup {
  const positionsByTimestamp: Record<number, Record<number, ActorPosition>> = { 0: {} };
  for (const p of players) positionsByTimestamp[0][p.id] = p;
  return {
    positionsByTimestamp,
    sortedTimestamps: [0],
    fightDuration: 0,
    fightStartTime: 0,
    sampleInterval: 0,
    hasRegularIntervals: false,
  };
}

const player = (id: number, name: string): ActorPosition => ({
  id,
  name,
  type: 'player',
  role: 'dps',
  position: [0, 0, 0],
  rotation: 0,
  isDead: false,
  health: { current: 100, max: 100, percentage: 100 },
});

// 14 players — deliberately more than the old 12-row canvas cap, to prove no clipping.
const PLAYERS = Array.from({ length: 14 }, (_, i) => player(i + 1, `@Player${i + 1}`));
const LOOKUP = makeLookup(PLAYERS);
const IDS = PLAYERS.map((p) => p.id);

function renderPanel(overrides: Partial<React.ComponentProps<typeof PlayerListPanel>> = {}) {
  const props: React.ComponentProps<typeof PlayerListPanel> = {
    playerIds: IDS,
    lookup: LOOKUP,
    timeRef: { current: 0 },
    selectedPlayerIds: new Set<number>(),
    onPlayerSelectionChange: jest.fn(),
    playerVisibility: new Map<number, boolean>(),
    onPlayerVisibilityChange: jest.fn(),
    playerColorOverrides: new Map<number, string>(),
    onPlayerColorChange: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<PlayerListPanel {...props} />) };
}

describe('PlayerListPanel', () => {
  it('renders nothing when there are no players', () => {
    const { container } = render(
      <PlayerListPanel
        playerIds={[]}
        lookup={makeLookup([])}
        timeRef={{ current: 0 }}
        selectedPlayerIds={new Set()}
        onPlayerSelectionChange={jest.fn()}
        playerVisibility={new Map()}
        onPlayerVisibilityChange={jest.fn()}
        playerColorOverrides={new Map()}
        onPlayerColorChange={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a row for every player — including past the old 12-row cap', () => {
    renderPanel();
    // First, last, and a row that the old fixed-height canvas would have clipped.
    expect(screen.getByText('@Player1')).toBeInTheDocument();
    expect(screen.getByText('@Player13')).toBeInTheDocument();
    expect(screen.getByText('@Player14')).toBeInTheDocument();
    // Header shows the full count.
    expect(screen.getByText(String(PLAYERS.length))).toBeInTheDocument();
  });

  it('toggles path selection via the path button', () => {
    const onPlayerSelectionChange = jest.fn();
    renderPanel({ onPlayerSelectionChange });
    fireEvent.click(screen.getByLabelText('Show @Player1 path'));
    expect(onPlayerSelectionChange).toHaveBeenCalledTimes(1);
    const arg = onPlayerSelectionChange.mock.calls[0][0] as Set<number>;
    expect(arg.has(1)).toBe(true);
  });

  it('toggles actor visibility via the eye button', () => {
    const onPlayerVisibilityChange = jest.fn();
    renderPanel({ onPlayerVisibilityChange });
    // Defaults to visible, so the control offers "Hide".
    fireEvent.click(screen.getByLabelText('Hide @Player1'));
    expect(onPlayerVisibilityChange).toHaveBeenCalledWith(1, false);
  });

  it('sets a per-player color override from the picker', () => {
    const onPlayerColorChange = jest.fn();
    renderPanel({ onPlayerColorChange });
    // Open the first player's color picker, then choose a palette swatch.
    fireEvent.click(screen.getByLabelText('Change @Player1 figure color'));
    const swatches = screen.getAllByLabelText(/^Set color #/);
    expect(swatches.length).toBeGreaterThan(0);
    fireEvent.click(swatches[3]);
    expect(onPlayerColorChange).toHaveBeenCalledTimes(1);
    const [id, color] = onPlayerColorChange.mock.calls[0];
    expect(id).toBe(1);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('clears a color override via reset-to-role', () => {
    const onPlayerColorChange = jest.fn();
    renderPanel({
      onPlayerColorChange,
      playerColorOverrides: new Map([[1, '#ff4757']]),
    });
    fireEvent.click(screen.getByLabelText('Change @Player1 figure color'));
    fireEvent.click(screen.getByText('Reset to role color'));
    expect(onPlayerColorChange).toHaveBeenCalledWith(1, null);
  });
});
