export interface DamageEvent {
  type: 'damage';
  abilityGameID?: number;
  abilityName?: string;
  abilityId?: number;
  sourceName?: string;
  sourceID?: number;
  targetID?: number | string;
  target?: number | string;
  victimID?: number | string;
  victim?: number | string;
  timestamp: number;
  amount?: number;
  blocked?: boolean | number;
}

export interface DeathEvent {
  type: 'death';
  abilityGameID?: number;
  abilityName?: string;
  abilityId?: number;
  sourceName?: string;
  sourceID?: number;
  targetID?: number | string;
  target?: number | string;
  timestamp: number;
  amount?: number;
}

export interface ResourceChangeEvent {
  type: 'resourcechange';
  targetID?: number | string;
  target?: number | string;
  victimID?: number | string;
  victim?: number | string;
  timestamp: number;
  resourceChangeType: number;
  resourceChange: number;
}

export interface BuffEvent {
  type: 'applybuff' | 'removebuff';
  targetID?: number | string;
  target?: number | string;
  victimID?: number | string;
  victim?: number | string;
  timestamp: number;
  abilityName?: string;
}

export type EventType = DamageEvent | DeathEvent | ResourceChangeEvent | BuffEvent;
