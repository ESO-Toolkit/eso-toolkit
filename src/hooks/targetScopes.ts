import type { ReportActorFragment } from '../graphql/gql/graphql';

type FightEnemy = { id?: number | null } | null;

export interface NamedEnemyTarget {
  id: number;
  name: string;
  isBoss: boolean;
}

export interface TargetScopes {
  allEnemyIds: number[];
  bossIds: number[];
  namedEnemies: NamedEnemyTarget[];
}

/**
 * Resolves aggregate target scopes from fight membership and authoritative actor metadata.
 * Fight membership remains the source of truth for "All Enemies", while only ESO Logs actors
 * explicitly classified as bosses may enter "All Bosses".
 */
export function resolveTargetScopes(
  enemyNPCs: readonly FightEnemy[] | null | undefined,
  actorsById: Readonly<Record<number, ReportActorFragment | undefined>> | null | undefined,
): TargetScopes {
  const allEnemyIds: number[] = [];
  const bossIds: number[] = [];
  const namedEnemies: NamedEnemyTarget[] = [];
  const seenIds = new Set<number>();

  for (const enemy of enemyNPCs ?? []) {
    const id = enemy?.id;
    if (id == null || !Number.isSafeInteger(id) || id < 0 || Object.is(id, -0) || seenIds.has(id))
      continue;

    seenIds.add(id);
    allEnemyIds.push(id);

    const actor = actorsById?.[id];
    const isBoss = actor?.type === 'NPC' && actor.subType === 'Boss';
    if (isBoss) bossIds.push(id);

    const name = actor?.name?.trim();
    if (name) namedEnemies.push({ id, name, isBoss });
  }

  return { allEnemyIds, bossIds, namedEnemies };
}
