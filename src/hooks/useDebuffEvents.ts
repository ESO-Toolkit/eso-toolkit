import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { FightFragment } from '../graphql/generated';
import { useSelectedReportAndFight } from '../ReportFightContext';
import { fetchDebuffEvents } from '../store/events_data/debuffEventsSlice';
import { selectReportFights } from '../store/report/reportSelectors';
import {
  selectDebuffEvents,
  selectDebuffEventsLoading,
  selectDebuffLookup,
} from '../store/selectors/eventsSelectors';
import { useAppDispatch } from '../store/useAppDispatch';
import { DebuffEvent } from '../types/combatlogEvents';
import { BuffLookupData } from '../utils/BuffLookupUtils';

export function useDebuffEvents(): {
  debuffEvents: DebuffEvent[];
  isDebuffEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useSelectedReportAndFight();
  const fights = useSelector(selectReportFights);

  // Get the specific fight from the report data
  const selectedFight = React.useMemo(() => {
    if (!fightId || !fights) return null;
    const fightIdNumber = parseInt(fightId, 10);
    return fights.find((fight) => fight && fight.id === fightIdNumber) || null;
  }, [fightId, fights]);

  React.useEffect(() => {
    if (reportId && selectedFight) {
      dispatch(
        fetchDebuffEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
        })
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const debuffEvents = useSelector(selectDebuffEvents);
  const isDebuffEventsLoading = useSelector(selectDebuffEventsLoading);

  return React.useMemo(
    () => ({ debuffEvents, isDebuffEventsLoading, selectedFight }),
    [debuffEvents, isDebuffEventsLoading, selectedFight]
  );
}

export function useDebuffLookup(): {
  debuffsLookup: BuffLookupData | null;
  isDebuffEventsLoading: boolean;
} {
  const { isDebuffEventsLoading } = useDebuffEvents();
  const buffLookup = useSelector(selectDebuffLookup);

  return React.useMemo(
    () => ({
      debuffsLookup: buffLookup,
      isDebuffEventsLoading: isDebuffEventsLoading,
    }),
    [buffLookup, isDebuffEventsLoading]
  );
}
