import type { BuildCluster } from '../../types/clustering.types';
import { orderBuildClusters } from '../clusterOrdering';
import { getClusterQuality } from '../clusterQuality';

function cluster(id: string): BuildCluster {
  return {
    id,
    label: id,
    esoClass: 'Arcanist',
    size: 1,
    share: 1,
    memberParseIds: [id],
    medoidParseId: id,
    dps: {
      min: 1,
      q1: 1,
      median: 1,
      q3: 1,
      p90: 1,
      max: 1,
      mean: 1,
      count: 1,
    },
    core: [],
    flex: [],
    variations: [],
    cohesion: 0,
  };
}

describe('build leaderboard presentation helpers', () => {
  it('puts the recommendation first without changing alternative order', () => {
    const clusters = [cluster('alpha'), cluster('recommended'), cluster('omega')];

    expect(orderBuildClusters(clusters, 'recommended').map(({ id }) => id)).toEqual([
      'recommended',
      'alpha',
      'omega',
    ]);
    expect(clusters.map(({ id }) => id)).toEqual(['alpha', 'recommended', 'omega']);
  });

  it('returns a stable copy when there is no matching recommendation', () => {
    const clusters = [cluster('alpha'), cluster('omega')];

    expect(orderBuildClusters(clusters, null)).toEqual(clusters);
    expect(orderBuildClusters(clusters, 'missing')).toEqual(clusters);
    expect(orderBuildClusters(clusters, null)).not.toBe(clusters);
  });

  it.each([
    [0.5, 'Strong', 'These build patterns separate cleanly.'],
    [0.25, 'Moderate', 'The patterns are useful, though some builds overlap.'],
    [0.249, 'Limited', 'Top players are using many similar variations.'],
  ] as const)('maps silhouette %s to the shared quality copy', (silhouette, label, tooltip) => {
    expect(getClusterQuality(silhouette)).toEqual({ label, tooltip });
  });
});
