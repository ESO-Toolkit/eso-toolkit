import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import { useAppDispatch } from '../../store/useAppDispatch';
import { useFightForContext } from '../useFightForContext';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';

// Helper hook to get selected fight and basic dependencies for worker tasks
interface UseWorkerTaskDependenciesOptions {
  context?: ReportFightContextInput;
}

export function useWorkerTaskDependencies(
  options?: UseWorkerTaskDependenciesOptions,
): {
  dispatch: ReturnType<typeof useAppDispatch>;
  reportId: string | null;
  fightId: string | null;
  selectedFight: FightFragment | null;
  client: ReturnType<typeof useEsoLogsClientInstance>;
} {
  const dispatch = useAppDispatch();
  const context = useResolvedReportFightContext(options?.context);
  const client = useEsoLogsClientInstance();
  const selectedFight = useFightForContext(context);
  const reportId = context.reportCode;
  const fightId = context.fightId !== null ? String(context.fightId) : null;

  return {
    dispatch,
    reportId,
    fightId,
    selectedFight,
    client,
  };
}
