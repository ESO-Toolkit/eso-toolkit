import {
  useFriendlyBuffEvents,
  useHostileBuffEvents,
  useCombatantInfoEvents,
  useResourceEvents,
  useResolvedReportFightContext,
} from '../hooks';
import { useDebuffEvents } from '../hooks/events/useDebuffEvents';
import type { ReportFightContextInput } from '../store/contextTypes';

/**
 * Eagerly triggers fetching of all event types needed for the PlayerCardModal.
 *
 * Most tabs only fetch a subset of events (e.g. Damage tab fetches damageEvents + castEvents).
 * This hook ensures the remaining event types (buffs, debuffs, resources, combatantInfo) are
 * pre-fetched so the PlayerCardModal opens without delay.
 *
 * All event hooks use Redux caching with deduplication — calling them here is a no-op
 * if the data is already cached from another tab.
 *
 * Mount this hook on a parent component that persists across tab switches (e.g. the fight
 * details page container).
 */
export function useEagerEventPrefetch(context?: ReportFightContextInput): void {
  const resolvedContext = useResolvedReportFightContext(context);

  // These hook calls trigger the Redux thunks which have condition guards
  // to skip fetching if data is already cached. No wasted network requests.
  useFriendlyBuffEvents({ context: resolvedContext });
  useHostileBuffEvents({ context: resolvedContext });
  useDebuffEvents({ context: resolvedContext });
  useResourceEvents({ context: resolvedContext });
  useCombatantInfoEvents({ context: resolvedContext });
}
