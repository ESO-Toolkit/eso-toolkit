import fixture from './support-contract-fixture.json';
import type { SupportTicketPayload } from './support-draft';

export const SUPPORT_REPORT_GOLDEN = fixture.report;

export function supportDraftFixture(): SupportTicketPayload {
  return JSON.parse(JSON.stringify(fixture.payload)) as SupportTicketPayload;
}
