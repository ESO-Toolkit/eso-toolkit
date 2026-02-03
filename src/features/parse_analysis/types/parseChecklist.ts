export type ParseChecklistStatus = 'pass' | 'warn' | 'fail' | 'info';

export interface ParseChecklistItem {
  id: string;
  title: string;
  status: ParseChecklistStatus;
  detail?: string;
}
