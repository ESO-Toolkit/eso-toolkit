export interface PlayerSpec {
  spec: string;
  count: number;
}

export interface PlayerTalent {
  name: string;
  guid: number;
  type: number;
  abilityIcon: string;
  flags: number;
}

export interface PlayerGear {
  id: number;
  slot: number;
  quality: number;
  icon: string;
  name?: string;
  championPoints: number;
  trait: number;
  enchantType: number;
  enchantQuality: number;
  setID: number;
  type?: number;
  setName?: string;
}

export interface CombatantInfo {
  stats: number[];
  talents: PlayerTalent[];
  gear: PlayerGear[];
}

export interface PlayerDetailsEntry {
  name: string;
  id: number;
  guid: number;
  type: string;
  server: string;
  displayName: string;
  anonymous: boolean;
  icon: string;
  specs: PlayerSpec[];
  minItemLevel?: number;
  maxItemLevel?: number;
  potionUse: number;
  healthstoneUse: number;
  combatantInfo: CombatantInfo;
}

export interface PlayerDetails {
  dps: PlayerDetailsEntry[];
  healers: PlayerDetailsEntry[];
  tanks: PlayerDetailsEntry[];
}
