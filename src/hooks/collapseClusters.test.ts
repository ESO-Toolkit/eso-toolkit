/**
 * Tests for collapseClusters — the pure same-type, time-threshold clustering used to keep a
 * dense marker burst from smearing the scrub rail. Exercised with synthetic dense data
 * because real dense fights (Rockgrove) can't be loaded locally (worker CORS blocks
 * localhost); see FIGHT-REPLAY-UX-AUDIT-2026-05-30.md.
 */

import { collapseClusters } from './useTimelineMarkers';
import {
  ClusterMarker,
  DeathMarker,
  PhaseMarker,
  TimelineAnnotation,
} from '../types/timelineAnnotations';

const phase = (id: number, timestamp: number): PhaseMarker => ({
  id: `phase-${id}`,
  timestamp,
  type: 'phase',
  label: `Phase ${id}`,
  phaseId: id,
});

const death = (id: string, timestamp: number, isFriendly: boolean): DeathMarker => ({
  id: `death-${id}`,
  timestamp,
  type: 'death',
  label: `${isFriendly ? '💀' : '☠️'} ${id}`,
  actorId: 1,
  actorName: id,
  isFriendly,
});

const isCluster = (m: TimelineAnnotation): m is ClusterMarker => m.type === 'cluster';

describe('collapseClusters', () => {
  it('passes sparse markers through unchanged (no near same-type neighbors)', () => {
    const input: TimelineAnnotation[] = [death('a', 0, true), death('b', 5000, true)];
    const out = collapseClusters(input, 100);
    expect(out).toHaveLength(2);
    expect(out.every((m) => m.type === 'death')).toBe(true);
  });

  it('collapses a dense same-type burst into one cluster (seek target = earliest)', () => {
    const input: TimelineAnnotation[] = [
      death('a', 1000, true),
      death('b', 1030, true),
      death('c', 1050, true),
    ];
    const out = collapseClusters(input, 100);
    expect(out).toHaveLength(1);
    expect(isCluster(out[0])).toBe(true);
    const cluster = out[0] as ClusterMarker;
    expect(cluster.clusterType).toBe('death');
    expect(cluster.count).toBe(3);
    expect(cluster.members).toHaveLength(3);
    // Click seeks to where the burst began.
    expect(cluster.timestamp).toBe(1000);
    expect(cluster.label).toBe('3 deaths');
    expect(cluster.isFriendly).toBe(true);
  });

  it('never merges across types — a phase between deaths stays distinct', () => {
    const input: TimelineAnnotation[] = [
      death('a', 1000, true),
      phase(1, 1020),
      death('b', 1040, true),
    ];
    const out = collapseClusters(input, 100);
    // The two deaths are within threshold of each other (gap 40ms) and cluster; the phase is
    // its own beat and survives. Result: one death-cluster + one phase.
    const clusters = out.filter(isCluster);
    const phases = out.filter((m) => m.type === 'phase');
    expect(clusters).toHaveLength(1);
    expect(phases).toHaveLength(1);
    expect((clusters[0] as ClusterMarker).count).toBe(2);
  });

  it('keeps friendly and enemy deaths in separate clusters (shape/color channel preserved)', () => {
    const input: TimelineAnnotation[] = [
      death('f1', 1000, true),
      death('e1', 1010, false),
      death('f2', 1020, true),
      death('e2', 1030, false),
    ];
    const out = collapseClusters(input, 100);
    const clusters = out.filter(isCluster) as ClusterMarker[];
    expect(clusters).toHaveLength(2);
    const friendly = clusters.find((c) => c.isFriendly === true);
    const enemy = clusters.find((c) => c.isFriendly === false);
    expect(friendly?.count).toBe(2);
    expect(enemy?.count).toBe(2);
  });

  it('does not cluster a lone marker even within a dense neighborhood of other types', () => {
    const input: TimelineAnnotation[] = [phase(1, 1000), death('a', 1010, true)];
    const out = collapseClusters(input, 100);
    // One phase, one death — neither has a same-type neighbor.
    expect(out).toHaveLength(2);
    expect(out.some(isCluster)).toBe(false);
  });

  it('breaks a long run when consecutive gaps exceed the threshold', () => {
    const input: TimelineAnnotation[] = [
      death('a', 1000, true),
      death('b', 1050, true), // gap 50 <= 100 → same cluster
      death('c', 1400, true), // gap 350 > 100 → new run
      death('d', 1430, true), // gap 30 <= 100 → joins second cluster
    ];
    const out = collapseClusters(input, 100);
    const clusters = out.filter(isCluster) as ClusterMarker[];
    expect(clusters).toHaveLength(2);
    expect(clusters.map((c) => c.count).sort()).toEqual([2, 2]);
  });

  it('returns output sorted by timestamp', () => {
    const input: TimelineAnnotation[] = [
      death('a', 1000, true),
      death('b', 1020, true),
      phase(1, 500),
      death('e', 5000, false),
    ];
    const out = collapseClusters(input, 100);
    const times = out.map((m) => m.timestamp);
    expect(times).toEqual([...times].sort((x, y) => x - y));
  });

  it('is a no-op for an empty array, a single marker, or non-positive threshold', () => {
    expect(collapseClusters([], 100)).toEqual([]);
    const single: TimelineAnnotation[] = [death('a', 1000, true)];
    expect(collapseClusters(single, 100)).toHaveLength(1);
    const dense: TimelineAnnotation[] = [death('a', 1000, true), death('b', 1005, true)];
    // threshold 0 disables clustering — both markers pass through.
    expect(collapseClusters(dense, 0)).toHaveLength(2);
  });
});
