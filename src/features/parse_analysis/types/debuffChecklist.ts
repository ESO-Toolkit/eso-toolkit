/**
 * Debuff Checklist Types
 * Types for analyzing debuffs applied to the trial dummy
 */

export interface DebuffChecklistItem {
  debuffName: string;
  abilityIds: number[];
  category: 'major' | 'minor' | 'support';
  isAppliedByPlayer: boolean;
  isAppliedByDummy: boolean;
}

export interface DebuffChecklistResult {
  majorDebuffs: DebuffChecklistItem[];
  minorDebuffs: DebuffChecklistItem[];
  summary: {
    totalTrackedDebuffs: number;
    totalPlayerDebuffs: number;
    totalDummyDebuffs: number;
  };
}
