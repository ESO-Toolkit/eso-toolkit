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
  targetResources?: Resources;
}

export interface BuffEvent {
  type: 'applybuff' | 'removebuff' | 'applydebuff' | 'removedebuff';
  targetID?: number | string;
  target?: number | string;
  victimID?: number | string;
  victim?: number | string;
  timestamp: number;
  abilityName?: string;
  abilityId?: number;
  abilityGameID?: number;
  sourceID?: number | string;
}

export interface PlayerEnterCombatEvent {
  timestamp: number;
  type: 'playerentercombat';
  fight: number;
  sourceID?: number;
}

export interface CombatantInfoEvent {
  timestamp: number;
  type: 'combatantinfo';
  fight: number;
  sourceID: number;
  gear: CombatantGear[];
  auras: CombatantAura[];
}

export interface CombatantGear {
  id: number;
  quality: number;
  icon: string;
  name?: string;
  championPoints: number;
  trait: number;
  enchantType: number;
  enchantQuality: number;
  setID: number;
  type: number;
}

export interface CombatantAura {
  source: number;
  ability: number;
  stacks: number;
  icon: string;
  name: string;
}

export interface HealEvent {
  timestamp: number;
  type: 'heal';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
  hitType: number;
  amount: number;
  overheal: number;
  castTrackID: number;
  sourceResources: Resources;
  targetResources: Resources;
}

export interface Resources {
  hitPoints: number;
  maxHitPoints: number;
  magicka: number;
  maxMagicka: number;
  stamina: number;
  maxStamina: number;
  ultimate: number;
  maxUltimate: number;
  werewolf: number;
  maxWerewolf: number;
  absorb: number;
  championPoints: number;
  x: number;
  y: number;
  facing: number;
}

export interface CastEvent {
  timestamp: number;
  type: 'cast';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
}

export interface BeginCastEvent {
  timestamp: number;
  type: 'begincast';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
  castTrackID: number;
  sourceResources: Resources;
  targetResources: Resources;
}

export interface ApplyBuffStackEvent {
  timestamp: number;
  type: 'applybuffstack';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
  stack: number;
}

export type EventType =
  | DamageEvent
  | DeathEvent
  | ResourceChangeEvent
  | BuffEvent
  | CombatantInfoEvent
  | PlayerEnterCombatEvent
  | HealEvent
  | CastEvent
  | BeginCastEvent
  | ApplyBuffStackEvent;
