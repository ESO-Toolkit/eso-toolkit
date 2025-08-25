export enum HitType {
  Normal = 1,
  Critical = 2,
}

export interface DamageEvent {
  timestamp: number;
  type: 'damage';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: false;
  abilityGameID: number;
  fight: number;
  hitType: HitType;
  amount: number;
  castTrackID: number;
  sourceResources: Resources;
  targetResources: Resources;
  blocked?: number;
}

export interface DeathEvent {
  timestamp: number;
  type: 'death';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetInstance: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
  castTrackID: number;
  sourceResources: Resources;
  targetResources: Resources;
  amount: number;
}

export interface ResourceChangeEvent {
  timestamp: number;
  type: 'resourcechange';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
  resourceChange: number;
  resourceChangeType: number;
  otherResourceChange: number;
  maxResourceAmount: number;
  waste: number;
  castTrackID: number;
  sourceResources: Resources;
  targetResources: Resources;
}

export interface PlayerEnterCombatEvent {
  timestamp: number;
  type: 'playerentercombat';
  fight: number;
  sourceID: number;
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
  name: string;
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
  fake?: boolean;
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

export interface ApplyDebuffEvent {
  timestamp: number;
  type: 'applydebuff';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
}

export interface RemoveDebuffEvent {
  timestamp: number;
  type: 'removedebuff';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
}

export interface ApplyBuffEvent {
  timestamp: 4812643;
  type: 'applybuff';
  sourceID: 8;
  sourceIsFriendly: true;
  targetID: 8;
  targetIsFriendly: true;
  abilityGameID: 247975;
  fight: 74;
  extraAbilityGameID: 38901;
}

export interface RemoveBuffEvent {
  timestamp: number;
  type: 'removebuff';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
}

export interface ApplyDebuffStackEvent {
  timestamp: number;
  type: 'applydebuffstack';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
  stack: number;
}

export interface RemoveBuffStackEvent {
  timestamp: number;
  type: 'removebuffstack';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
  stack: number;
}

export type BuffEvent =
  | ApplyBuffEvent
  | ApplyBuffStackEvent
  | RemoveBuffEvent
  | RemoveBuffStackEvent;

export type DebuffEvent =
  | ApplyDebuffEvent
  | ApplyDebuffStackEvent
  | RemoveDebuffEvent
  | RemoveDebuffStackEvent;

export type LogEvent =
  | ApplyBuffStackEvent
  | BeginCastEvent
  | BuffEvent
  | CastEvent
  | CombatantInfoEvent
  | DamageEvent
  | DeathEvent
  | DebuffEvent
  | HealEvent
  | PlayerEnterCombatEvent
  | ResourceChangeEvent;
