export interface EsoLogsReportUrl {
  code: string;
  fightId?: number;
}

/** Parse an ESO Logs report link without silently broadening an invalid fight filter. */
export function parseEsoLogsReportUrl(input: string): EsoLogsReportUrl | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (
    !['https:', 'http:'].includes(url.protocol) ||
    !['esologs.com', 'www.esologs.com'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.port
  ) {
    return null;
  }

  const reportPath = /^\/reports\/([A-Za-z0-9]{16})\/?$/.exec(url.pathname);
  if (!reportPath) return null;

  const fightValues = [
    ...url.searchParams.getAll('fight'),
    ...new URLSearchParams(url.hash.slice(1)).getAll('fight'),
  ];
  if (fightValues.length === 0) return { code: reportPath[1] };

  // Reject conflicting filters instead of choosing a potentially unintended fight.
  if (new Set(fightValues).size !== 1 || !/^[1-9]\d*$/.test(fightValues[0])) return null;
  const fightId = Number(fightValues[0]);
  // The API accepts GraphQL Int (signed 32-bit), and fight IDs are positive.
  if (!Number.isSafeInteger(fightId) || fightId > 2_147_483_647) return null;

  return { code: reportPath[1], fightId };
}
