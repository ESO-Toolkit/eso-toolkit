import fixture from './support-contract-fixture.json';
import type { SupportTicketPayload } from './support-draft';

export interface SupportContractCase {
  name: string;
  payload: SupportTicketPayload;
  report: string;
}

/** Every cross-repository contract case, including the legacy version-1 report. */
export function supportContractCases(): SupportContractCase[] {
  return JSON.parse(JSON.stringify(fixture.cases)) as SupportContractCase[];
}

function currentCase(): SupportContractCase {
  const latest = supportContractCases().at(-1);
  if (!latest) throw new Error('The support contract fixture has no cases');
  return latest;
}

export const SUPPORT_REPORT_GOLDEN = currentCase().report;

export function supportDraftFixture(): SupportTicketPayload {
  return currentCase().payload;
}
