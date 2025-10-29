export type ReportFightCacheKey = string;

export interface ReportFightContextInput {
  reportCode?: string | null;
  fightId?: number | string | null;
}

export interface ReportFightContext {
  reportCode: string | null;
  fightId: number | null;
}

export type ReportScopedContextInput = Pick<ReportFightContextInput, 'reportCode'>;

export interface SelectorCacheOptions {
  cacheLimit?: number;
}
