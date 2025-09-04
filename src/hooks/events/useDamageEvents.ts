import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/generated';
import { useSelectedReportAndFight } from '../../ReportFightContext';
import { fetchDamageEvents } from '../../store/events_data/damageEventsSlice';
import { selectReportFights } from '../../store/report/reportSelectors';
import {
  selectDamageEvents,
  selectDamageEventsLoading,
} from '../../store/selectors/eventsSelectors';
import { useAppDispatch } from '../../store/useAppDispatch';
import { DamageEvent } from '../../types/combatlogEvents';
import { useReportMasterData } from '../useReportMasterData';

import { selectDamageEventsByPlayer } from '@/store/events_data/damageEventsSelectors';

export function useDamageEvents(): {
  damageEvents: DamageEvent[];
  isDamageEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useSelectedReportAndFight();
  const fights = useSelector(selectReportFights);

  // Move selectors BEFORE the effects that use them
  const damageEvents = useSelector(selectDamageEvents);
  const isDamageEventsLoading = useSelector(selectDamageEventsLoading);

  // Get the specific fight from the report data
  const selectedFight = React.useMemo(() => {
    if (!fightId || !fights) return null;
    const fightIdNumber = parseInt(fightId, 10);
    return fights.find((fight) => fight && fight.id === fightIdNumber) || null;
  }, [fightId, fights]);

  React.useEffect(() => {
    console.log('🔍 useDamageEvents effect triggered', {
      reportId,
      fightId,
      hasSelectedFight: !!selectedFight,
    });
    if (reportId && selectedFight) {
      console.log(
        '📡 Dispatching fetchDamageEvents for reportId:',
        reportId,
        'fightId:',
        selectedFight.id,
      );
      dispatch(
        fetchDamageEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
        }),
      );
    }
  }, [dispatch, reportId, selectedFight, client, fightId]);

  return React.useMemo(
    () => ({ damageEvents, isDamageEventsLoading, selectedFight }),
    [damageEvents, isDamageEventsLoading, selectedFight],
  );
}

export function useDamageEventsLookup(): {
  damageEventsByPlayer: Record<string, DamageEvent[]>;
  isDamageEventsLookupLoading: boolean;
} {
  const { isDamageEventsLoading } = useDamageEvents();
  const { isMasterDataLoading } = useReportMasterData();
  const damageEventsByPlayer = useSelector(selectDamageEventsByPlayer);

  return React.useMemo(
    () => ({
      damageEventsByPlayer,
      isDamageEventsLookupLoading: isDamageEventsLoading || isMasterDataLoading,
    }),
    [damageEventsByPlayer, isDamageEventsLoading, isMasterDataLoading],
  );
}
