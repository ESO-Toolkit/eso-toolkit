import { useParams } from 'react-router-dom';

/**
 * Hook to extract reportId and fightId from the current route
 * Works with routes like:
 * - /report/:reportId
 * - /report/:reportId/fight/:fightId
 * - /report/:reportId/fight/:fightId/replay
 */
export function useReportFightParams(): {
  reportId: string | undefined;
  fightId: string | undefined;
} {
  const params = useParams<{ reportId: string; fightId: string }>();

  return {
    reportId: params.reportId,
    fightId: params.fightId,
  };
}
