import { useMemo } from 'react';
import type { JSX } from 'react';

import type { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';

/**
 * Screen-reader equivalent of the 3D arena's cast.
 *
 * The canvas wrapper is labelled as an image/region, which exposes nothing of the scene to
 * assistive tech (WCAG 1.1.1). This visually-hidden table lists every actor the lookup knows
 * (name, kind, role) with a Follow button each, so keyboard/SR users can enumerate the cast
 * and follow an actor — the two interactions the canvas otherwise gates behind pointer input.
 *
 * Deliberately a SNAPSHOT, not live state: per-frame health/position updates would spam a live
 * region. Boss HP has its own progressbar (BossHealthPanel); the timeline markers list covers
 * events.
 */
export const ArenaCastTable = ({
  lookup,
  onFollow,
}: {
  lookup: TimestampPositionLookup | null;
  onFollow?: (actorId: number) => void;
}): JSX.Element | null => {
  const rows = useMemo(() => {
    if (!lookup || lookup.sortedTimestamps.length === 0) return [];
    const last = lookup.sortedTimestamps[lookup.sortedTimestamps.length - 1];
    const atEnd = lookup.positionsByTimestamp[last] ?? {};
    return Object.values(atEnd)
      .map((a) => ({ id: a.id, name: a.name, type: a.type, role: a.role ?? null }))
      .sort((a, b) => a.id - b.id);
  }, [lookup]);

  if (rows.length === 0) return null;

  return (
    <table
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        margin: '-1px',
        padding: 0,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      <caption>Actors in this fight replay</caption>
      <thead>
        <tr>
          <th scope="col">Actor</th>
          <th scope="col">Kind</th>
          <th scope="col">Role</th>
          <th scope="col">Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.name || `Unknown actor ${row.id}`}</td>
            <td>{row.type}</td>
            <td>{row.role ?? '—'}</td>
            <td>
              {onFollow ? (
                <button type="button" onClick={() => onFollow(row.id)}>
                  Follow {row.name || `actor ${row.id}`}
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
