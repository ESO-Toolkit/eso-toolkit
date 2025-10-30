export const REPORT_FIGHT_KEY_SEPARATOR = '::';

export const createReportFightKey = (
  reportCode: string,
  fightId: number | string,
): string => `${reportCode}${REPORT_FIGHT_KEY_SEPARATOR}${fightId}`;

export const parseReportFightKey = (
  key: string,
): { reportCode: string; fightId: number | null } => {
  const [reportCode, fightIdPart] = key.split(REPORT_FIGHT_KEY_SEPARATOR);
  const fightId = Number.isFinite(Number(fightIdPart)) ? Number(fightIdPart) : null;
  return {
    reportCode,
    fightId,
  };
};
