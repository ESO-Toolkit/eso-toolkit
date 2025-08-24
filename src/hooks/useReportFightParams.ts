import { useParams } from 'react-router-dom';

export function useReportFightParams() {
  const { reportId, fightId } = useParams<{ reportId: string; fightId?: string }>();
  return { reportId, fightId };
}

