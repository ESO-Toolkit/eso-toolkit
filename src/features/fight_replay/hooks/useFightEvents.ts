import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { RootState } from '../../../store/storeWithHistory';
import { DamageEvent, HealEvent, DeathEvent } from '../../../types/combatlogEvents';

interface FightEvents {
  damage: DamageEvent[];
  heal: HealEvent[];
  death: DeathEvent[];
}

interface UseFightEventsReturn {
  events: FightEvents | null;
  loading: boolean;
  error: string | null;
}

export const useFightEvents = (reportId?: string, fight?: FightFragment): UseFightEventsReturn => {
  const [events, setEvents] = useState<FightEvents | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get events from Redux store
  const damageEvents = useSelector((state: RootState) => state.events.damage.events);
  const healingEvents = useSelector((state: RootState) => state.events.healing.events);
  const deathEvents = useSelector((state: RootState) => state.events.deaths.events);

  // Check if we have events loading states
  const damageLoading = useSelector((state: RootState) => state.events.damage.loading);
  const healingLoading = useSelector((state: RootState) => state.events.healing.loading);
  const deathLoading = useSelector((state: RootState) => state.events.deaths.loading);

  // Check for errors
  const damageError = useSelector((state: RootState) => state.events.damage.error);
  const healingError = useSelector((state: RootState) => state.events.healing.error);
  const deathError = useSelector((state: RootState) => state.events.deaths.error);

  useEffect(() => {
    if (!reportId || !fight) {
      setEvents(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Set loading state
    const isLoading = damageLoading || healingLoading || deathLoading;
    setLoading(isLoading);

    // Set error state
    const hasError = damageError || healingError || deathError;
    if (hasError) {
      setError(hasError);
      return;
    }

    // Filter events for this specific fight
    const fightDamageEvents = damageEvents.filter((event: DamageEvent) => event.fight === fight.id);

    const fightHealingEvents = healingEvents.filter((event: HealEvent) => event.fight === fight.id);

    const fightDeathEvents = deathEvents.filter((event: DeathEvent) => event.fight === fight.id);

    // Set filtered events
    setEvents({
      damage: fightDamageEvents,
      heal: fightHealingEvents,
      death: fightDeathEvents,
    });

    setError(null);
  }, [
    reportId,
    fight,
    damageEvents,
    healingEvents,
    deathEvents,
    damageLoading,
    healingLoading,
    deathLoading,
    damageError,
    healingError,
    deathError,
  ]);

  return { events, loading, error };
};
