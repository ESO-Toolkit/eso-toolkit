import { useEffect, useRef, useState } from 'react';

import { useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import {
  GetTrialZonesMetadataDocument,
  GetTrialZonesMetadataQuery,
} from '../../../graphql/gql/graphql';

import {
  categorizeZone,
  ZONE_CATEGORY_ORDER,
  zoneDisplayLabel,
  type ZoneCategory,
} from './zoneCategory';

export interface ZoneOption {
  id: number;
  /** Raw zone name from the API (used to resolve the active-filter chip label). */
  name: string;
  /** Display label in the picker ("Dungeons" → "All Dungeons"). */
  label: string;
  /** Picker group. */
  category: ZoneCategory;
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
 * which returns ALL zones the site supports — trials, arenas and a single
 * "Dungeons" super-zone — despite the query name. We attach a picker category
 * and display label, then sort by category order (Trials → Arenas → Dungeons)
 * then name. The `id` is the ESO Logs `Zone.id` used as the `zoneID`
 * server-filter variable (id 10 = all dungeons).
 */
const CATEGORY_RANK: Record<ZoneCategory, number> = Object.fromEntries(
  ZONE_CATEGORY_ORDER.map((category, index) => [category, index]),
) as Record<ZoneCategory, number>;
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
            .map((zone) => {
              const category = categorizeZone(zone.name);
              return { id: zone.id, name: zone.name, label: zoneDisplayLabel(zone.name), category };
            })
            .sort((a, b) => {
              const rank = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
              return rank !== 0 ? rank : a.label.localeCompare(b.label);
            });
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
