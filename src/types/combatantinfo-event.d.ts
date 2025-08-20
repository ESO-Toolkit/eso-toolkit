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
