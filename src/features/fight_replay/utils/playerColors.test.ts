import { ActorPosition } from '../../../workers/calculations/CalculateActorPositions';

import {
  PLAYER_PATH_COLORS,
  PlayerColorManager,
  getPlayerPathColor,
  globalPlayerColorManager,
  resetPlayerColors,
} from './playerColors';

function makeActor(overrides: Partial<ActorPosition> = {}): ActorPosition {
  return {
    id: 1,
    name: 'Tester',
    type: 'player',
    position: [0, 0, 0],
    rotation: 0,
    isDead: false,
    ...overrides,
  };
}

describe('PlayerColorManager', () => {
  let manager: PlayerColorManager;

  beforeEach(() => {
    manager = new PlayerColorManager();
  });

  it('assigns role-priority colors to tank/healer/dps', () => {
    expect(manager.getPlayerColor(10, makeActor({ id: 10, role: 'tank' }))).toBe(
      PLAYER_PATH_COLORS.tank,
    );
    expect(manager.getPlayerColor(11, makeActor({ id: 11, role: 'healer' }))).toBe(
      PLAYER_PATH_COLORS.healer,
    );
    expect(manager.getPlayerColor(12, makeActor({ id: 12, role: 'dps' }))).toBe(
      PLAYER_PATH_COLORS.dps,
    );
  });

  it('matches roles case-insensitively', () => {
    expect(
      manager.getPlayerColor(10, makeActor({ id: 10, role: 'TANK' as ActorPosition['role'] })),
    ).toBe(PLAYER_PATH_COLORS.tank);
  });

  it('returns a stable color for the same actor across calls', () => {
    const first = manager.getPlayerColor(5, makeActor({ id: 5, role: 'dps' }));
    const second = manager.getPlayerColor(5);
    const third = manager.getPlayerColor(5, makeActor({ id: 5, role: 'tank' }));
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('does not reassign a role color once it is taken — second tank falls through to the sequence', () => {
    const firstTank = manager.getPlayerColor(1, makeActor({ id: 1, role: 'tank' }));
    const secondTank = manager.getPlayerColor(2, makeActor({ id: 2, role: 'tank' }));
    expect(firstTank).toBe(PLAYER_PATH_COLORS.tank);
    expect(secondTank).not.toBe(PLAYER_PATH_COLORS.tank);
  });

  it('assigns distinct colors to many roleless players from the sequence', () => {
    const colors = new Set<string>();
    for (let id = 0; id < 12; id++) {
      colors.add(manager.getPlayerColor(id, makeActor({ id })));
    }
    // First 15 sequence colors are unique, so 12 players should all differ.
    expect(colors.size).toBe(12);
  });

  it('wraps around once the palette is exhausted instead of failing', () => {
    // Assign more players than there are colors in the sequence (15).
    const results: string[] = [];
    for (let id = 0; id < 20; id++) {
      results.push(manager.getPlayerColor(id, makeActor({ id })));
    }
    // No undefined / empty assignments after wraparound.
    expect(results.every((c) => typeof c === 'string' && c.length > 0)).toBe(true);
    // The 16th assignment (index 15) should reuse the first sequence color (tank).
    expect(results[15]).toBe(PLAYER_PATH_COLORS.tank);
  });

  it('records name and role metadata on assignment', () => {
    manager.getPlayerColor(7, makeActor({ id: 7, name: 'Healbot', role: 'healer' }));
    const assignment = manager.getAssignment(7);
    expect(assignment?.name).toBe('Healbot');
    expect(assignment?.role).toBe('healer');
    expect(manager.hasAssignment(7)).toBe(true);
    expect(manager.hasAssignment(999)).toBe(false);
  });

  it('falls back to "Actor <id>" name when no actor data is supplied', () => {
    manager.getPlayerColor(42);
    expect(manager.getAssignment(42)?.name).toBe('Actor 42');
  });

  it('reset() clears assignments and frees role colors for reuse', () => {
    manager.getPlayerColor(1, makeActor({ id: 1, role: 'tank' }));
    expect(manager.getAllAssignments()).toHaveLength(1);

    manager.reset();
    expect(manager.getAllAssignments()).toHaveLength(0);
    expect(manager.hasAssignment(1)).toBe(false);

    // tank color is available again after reset
    expect(manager.getPlayerColor(2, makeActor({ id: 2, role: 'tank' }))).toBe(
      PLAYER_PATH_COLORS.tank,
    );
  });
});

describe('global helpers', () => {
  beforeEach(() => {
    resetPlayerColors();
  });

  it('getPlayerPathColor delegates to the global manager', () => {
    const color = getPlayerPathColor(3, makeActor({ id: 3, role: 'tank' }));
    expect(color).toBe(PLAYER_PATH_COLORS.tank);
    expect(globalPlayerColorManager.hasAssignment(3)).toBe(true);
  });

  it('resetPlayerColors clears the global manager', () => {
    getPlayerPathColor(3, makeActor({ id: 3 }));
    resetPlayerColors();
    expect(globalPlayerColorManager.hasAssignment(3)).toBe(false);
  });
});
