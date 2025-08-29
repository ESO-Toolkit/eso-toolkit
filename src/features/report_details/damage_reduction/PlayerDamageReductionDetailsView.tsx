import { DamageReductionSourceWithActiveState } from '../../../utils/damageReductionUtils';

export interface PlayerDamageReductionData {
  playerId: number;
  playerName: string;
  totalDamageReduction: number;
  averageDamageReduction: number;
  damageReductionSources: DamageReductionSourceWithActiveState[];
  staticDamageReduction: number;
  mitigatedDamage: number;
  actualDamageTaken: number;
  potentialDamage: number;
  uptimePercentage: number;
  maxDamageReduction: number;
  minDamageReduction: number;
}
