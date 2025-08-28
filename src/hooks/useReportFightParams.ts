import { useSelector } from 'react-redux';

import { RootState } from '../store/storeWithHistory';

export function useReportFightParams(): {
  reportId: string | undefined;
  fightId: string | undefined;
} {
  // Access the router state from redux-first-history
  const location = useSelector((state: RootState) => state.router.location);

  // Parse the pathname to extract reportId and fightId
  // Expected format: /report/:reportId/fight/:fightId or /report/:reportId
  const pathParts = location?.pathname?.split('/').filter(Boolean) || [];

  let reportId: string | undefined;
  let fightId: string | undefined;

  // Find reportId after 'report' segment
  const reportIndex = pathParts.indexOf('report');
  if (reportIndex !== -1 && reportIndex + 1 < pathParts.length) {
    reportId = pathParts[reportIndex + 1];
  }

  // Find fightId after 'fight' segment
  const fightIndex = pathParts.indexOf('fight');
  if (fightIndex !== -1 && fightIndex + 1 < pathParts.length) {
    fightId = pathParts[fightIndex + 1];
  }

  return { reportId, fightId };
}
