<<<<<<< HEAD
import { useParams } from 'react-router-dom';

export function useReportFightParams(): {
  reportId: string | undefined;
  fightId: string | undefined;
} {
  const { reportId, fightId } = useParams<{ reportId: string; fightId?: string }>();
  return { reportId, fightId };
}
=======
import { useParams } from 'react-router-dom';

export function useReportFightParams() {
  const { reportId, fightId } = useParams<{ reportId: string; fightId?: string }>();
  return { reportId, fightId };
}
>>>>>>> pr-21
