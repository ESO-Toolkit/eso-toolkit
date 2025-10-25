/**
 * Types for trial dummy buff checklist
 */

export interface BuffChecklistItem {
  buffName: string;
  abilityIds: number[]; // Multiple IDs may represent the same buff
  category: 'major' | 'minor' | 'support';
  isProvidedByDummy: boolean;
  isProvidedByPlayer: boolean;
  isRedundant: boolean; // True if player provides a buff that dummy already provides
}

export interface BuffChecklistResult {
  majorBuffs: BuffChecklistItem[];
  minorBuffs: BuffChecklistItem[];
  supportBuffs: BuffChecklistItem[];
  redundantBuffs: string[]; // Names of buffs that are redundant
  summary: {
    totalDummyBuffs: number;
    totalPlayerBuffs: number;
    totalRedundantBuffs: number;
  };
}
