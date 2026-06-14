import { useEffect, useRef, useState } from 'react';

import { useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import {
  GetTrialZonesMetadataDocument,
  GetTrialZonesMetadataQuery,
} from '../../../graphql/gql/graphql';

export interface ZoneOption {
  id: number;
  name: string;
}

interface ZoneOptionsState {
  zones: ZoneOption[];
  loading: boolean;
  error: string | null;
}

// Module-level cache: the zone list is effectively static for a session, so we
// fetch it once and reuse it across mounts (reportData is NOT Apollo-cached, but
// worldData.zones is stable — this avoids a redundant round-trip per visit).
let cachedZones: ZoneOption[] | null = null;
let inflight: Promise<ZoneOption[]> | null = null;

/**
 * Cache-first list of selectable zones for the Latest Reports zone filter.
 *
 * Source: `worldData.zones` (via the existing `getTrialZonesMetadata` query),
 * which returns ALL zones the site supports — trials, dungeons and arenas — not
 * only trials despite the query name. We map to `{ id, name }` and sort
 * alphabetically; the `id` is the ESO Logs `Zone.id` used as the `zoneID`
 * server-filter variable.
 */
export function useZoneOptions(): ZoneOptionsState {
  const client = useEsoLogsClientInstance();
  const [state, setState] = useState<ZoneOptionsState>(() => ({
    zones: cachedZones ?? [],
    loading: cachedZones === null,
    error: null,
  }));
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (cachedZones !== null) {
      return () => {
        mountedRef.current = false;
      };
    }

    if (!inflight) {
      inflight = client
        .query<GetTrialZonesMetadataQuery>({
          query: GetTrialZonesMetadataDocument,
          errorPolicy: 'all',
        })
        .then((result) => {
          const zones = (result.worldData?.zones ?? [])
            .filter((zone): zone is NonNullable<typeof zone> => zone !== null)
            .map((zone) => ({ id: zone.id, name: zone.name }))
            .sort((a, b) => a.name.localeCompare(b.name));
          cachedZones = zones;
          return zones;
        })
        .finally(() => {
          inflight = null;
        });
    }

    inflight
      .then((zones) => {
        if (mountedRef.current) {
          setState({ zones, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (mountedRef.current) {
          setState({
            zones: [],
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load zones',
          });
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, [client]);

  return state;
}
