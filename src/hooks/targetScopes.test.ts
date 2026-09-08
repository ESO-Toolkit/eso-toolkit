import type { ReportActorFragment } from '../graphql/gql/graphql';

import { resolveTargetScopes } from './targetScopes';

function actor(
  id: number,
  name: string,
  subType: string | null,
  type: string | null = 'NPC',
): ReportActorFragment {
  return {
    __typename: 'ReportActor',
    id,
    name,
    displayName: name,
    subType,
    type,
    gameID: id,
    icon: null,
    server: null,
  };
}

describe('resolveTargetScopes', () => {
  it('uses authoritative boss identity while keeping All Enemies comprehensive', () => {
    const actorsById = {
      10: actor(10, 'Real Boss', 'Boss'),
      11: actor(11, 'Unique Add', 'NPC'),
      12: actor(12, 'Duplicate Add', 'NPC'),
      13: actor(13, 'Duplicate Add', 'NPC'),
      14: actor(14, 'Player-shaped Enemy', null, 'Player'),
    };

    const result = resolveTargetScopes(
      [
        { id: 10 },
        { id: 11 },
        { id: 12 },
        { id: 13 },
        { id: 14 },
        { id: 99 }, // Missing actor metadata must remain in All Enemies.
        { id: 12 }, // Duplicate fight membership must not duplicate the scope.
        { id: null },
      ],
      actorsById,
    );

    expect(result.bossIds).toEqual([10]);
    expect(result.allEnemyIds).toEqual([10, 11, 12, 13, 14, 99]);
    expect(result.namedEnemies.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 10, name: 'Real Boss' },
      { id: 11, name: 'Unique Add' },
      { id: 12, name: 'Duplicate Add' },
      { id: 13, name: 'Duplicate Add' },
      { id: 14, name: 'Player-shaped Enemy' },
    ]);
  });

  it('does not infer bosses from unique names and ignores invalid identifiers', () => {
    const result = resolveTargetScopes(
      [
        { id: 1 },
        { id: -1 },
        { id: -0 },
        { id: Number.NaN },
        { id: Number.POSITIVE_INFINITY },
        { id: Number.NEGATIVE_INFINITY },
        { id: Number.MAX_SAFE_INTEGER + 1 },
      ],
      { 1: actor(1, 'Uniquely Named Add', 'NPC') },
    );

    expect(result).toEqual({
      allEnemyIds: [1],
      bossIds: [],
      namedEnemies: [{ id: 1, name: 'Uniquely Named Add', isBoss: false }],
    });
  });

  it('accepts absent actor data and omits whitespace-only names without losing enemy membership', () => {
    expect(resolveTargetScopes([{ id: 7 }], null)).toEqual({
      allEnemyIds: [7],
      bossIds: [],
      namedEnemies: [],
    });

    expect(resolveTargetScopes([{ id: 8 }, { id: 8 }], { 8: actor(8, '   ', 'Boss') })).toEqual({
      allEnemyIds: [8],
      bossIds: [8],
      namedEnemies: [],
    });
  });
});
