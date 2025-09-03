// Types for skill data across all classes
export interface AbilityMorph {
  name: string;
  cost?: string;
  duration?: string;
  description: string;
  damage?: string | string[];
  heal?: string;
  healing?: string;
  shield?: string;
  buff?: string;
  debuff?: string;
  debuffs?: string[];
  snare?: string;
  initialDamage?: string;
  damageIncrease?: string;
  trackingRange?: string;
  explosionRadius?: string;
  criticalRating?: string;
  durationBonus?: string;
  costReduction?: string;
  interruptImmunity?: boolean;
  delay?: string;
  detonation?: string;
  cooldown?: string;
  radius?: string;
  finalSmashStun?: string;
  pullDelay?: string;
  pullRange?: string;
  pulseInterval?: string;
  pulseDamage?: string;
  restoration?: string;
  generatesCrux?: boolean;
  cruxGeneration?: string;
  cruxBonus?: string;
  maxAbsorption?: string;
  allyShields?: string;
  blockMitigation?: string;
  charm?: string;
  effect?: string;
  immunity?: string;
  immobilize?: string;
  armorSteal?: string;
  firstSecond?: string;
  remaining?: string;
  costRefund?: string;
  spawnHealth?: string;
  maxHealing?: string;
  fullHealthBonus?: string;
  moveable?: string;
  heroism?: string;
  scalingBonus?: string;
  standingBonus?: string;
  maxTargets?: string | number;
  recastBonus?: string;
  healingOverTime?: string;
  persistence?: string;
  synergy?: string;
  lifesteal?: string;
  target?: string;

  // Additional properties found in skill data
  pathBonus?: string;
  durationExtension?: string;
  distanceBonus?: string;
  stun?: string;
  statusChance?: string;
  statusEffect?: string;
  shieldScaling?: string;
  damageOverTime?: string;
  passives?: string[];
  maxRange?: string;
  burstDamage?: string;
  classDamageBuff?: string;
  effects?: {
    [key: string]: string;
  };
  lowHealthBonus?: string;
  castTime?: string;
  secondaryHealing?: string;
  magickaRestore?: string;
  bonusHealing?: string;
  passive?: string;
  staminaRestore?: string;
  magickaRecovery?: string;
  staminaRecovery?: string;
  cleansing?: string;
  damageEscalation?: string;
  grizzlyDamage?: string;
  grizzlyAoE?: string;
  guardianWrath?: {
    cost: string;
    damage: string;
    lowHealthBonus: string;
  };
  guardianSavagery?: {
    cost: string;
    damage: string;
    lowHealthBonus: string;
  };
  respawn?: string;
  buffBonus?: string;
  firstAttack?: string;
  secondAttack?: string;
  thirdAttack?: string;
  secondCastBonus?: string;
  spreadDamage?: string;
  limitation?: string;
  instantHeal?: string;
  ultimateBonus?: string;
  persistentHealing?: string;
  buffs?:
    | string[]
    | {
        [key: string]: string;
      };
  proximityBonus?: string;
  earlyActivation?: string;
  enemyDebuffs?: string[];
  expirationHeal?: string;
  lightAttackHeal?: string;
  heavyAttackHeal?: string;
  instantHealing?: string;
  ultimateGain?: string;
  ultimateInterval?: string;
  stackingBuff?: string;
  healIfNoEnemies?: string;
  allyHeal?: string;
  absorption?: string;
  retaliation?: string;
  retaliationStun?: string;
  selfBuff?: string;
  maxPortals?: string;
  scaling?: string;
  destructionStaffBonus?: string;

  // Additional properties for complex nested structures
  [key: string]: string | number | boolean | object | string[] | undefined;
}

interface Ultimate {
  name: string;
  type?: 'ultimate';
  cost?: string;
  target: string;
  duration?: string;
  maxRange?: string;
  synergy?: string;
  radius?: string;
  description: string;
  debuff?: string;
  damage?: string;
  absorption?: string;
  retaliation?: string;
  spawnHealth?: string;
  maxBuff?: string;
  maxHealing?: string;
  morphs?:
    | {
        [key: string]: AbilityMorph;
      }
    | AbilityMorph[];

  // Additional properties found in skill data
  knockback?: string;
  stun?: string;
  damageLimit?: string;
  smashes?: number;
  healthBoost?: string;
  immediateHeal?: string;
  lightAttackHeal?: string;
  heavyAttackHeal?: string;
  criminalAct?: boolean;
  maxResurrections?: number;
  castTime?: string;
  snare?: string;
  buff?: string;
  effect?: string;
  suppression?: string;
  lightAttack?: string;
  heavyAttack?: string;
  ultimateConsumption?: string;
  arrivalDamage?: string;
  attackDamage?: string;
  initialDamage?: string;
  damageOverTime?: string;
  healing?: string;
  immunity?: string;
  immobile?: string;
  grizzlyDamage?: string;
  grizzlyAoE?: string;
  guardianWrath?: {
    cost: string;
    damage: string;
    lowHealthBonus: string;
  };
  instantHeal?: string;
  healingOverTime?: string;

  // Allow any additional properties for flexibility
  [key: string]: string | number | boolean | object | string[] | undefined;
}

export interface ActiveAbility {
  name: string;
  type?: 'active';
  cost?: string;
  castTime?: string;
  target?: string;
  duration?: string;
  maxRange?: string;
  minRange?: string;
  radius?: string;
  description: string;
  damage?: string;
  healing?: string;
  shield?: string;
  maxTargets?: number | string;
  generatesCrux?: boolean | string;
  cruxBonus?: string;
  costReduction?: string;
  cruxHealing?: string;
  immobilize?: string;
  abyssalInk?: {
    duration: string;
    bonus: string;
  };
  passiveBuff?: string;
  pulseInterval?: string;
  pulseDamage?: string;
  buff?: string;
  groupBuff?: string;
  selfBuff?: string;
  heal?: string;
  retaliation?: string;
  debuff?: string;
  taunt?: string;
  passive?: string;
  cannotBeDodged?: boolean;
  delay?: string;
  stun?: string;
  targeting?: string;
  synergy?: string;
  buffs?:
    | {
        [key: string]: string;
      }
    | string[];
  morphs?:
    | {
        [key: string]: AbilityMorph;
      }
    | AbilityMorph[];

  // Additional properties found in skill data
  knockback?: string;
  ignoresResistances?: boolean;
  cannotBeBlocked?: boolean;
  strikes?: number;
  snare?: string;
  cleansing?: string;
  [key: string]: string | number | boolean | object | string[] | undefined;
}

interface Passive {
  name: string;
  description: string;
  requirement?: string;
  trigger?: string;
  [key: string]: string | undefined;
}

interface SkillLine {
  name: string;
  icon?: string;
  ultimates?:
    | Ultimate[]
    | {
        [key: string]: Ultimate;
      };
  activeAbilities?: {
    [key: string]: ActiveAbility;
  };
  actives?: ActiveAbility[];
  passives?:
    | {
        [key: string]: Passive;
      }
    | Passive[];
}

interface Mechanic {
  name?: string;
  description?: string;
  duration?: string;
  effect?: string;
  maxStacks?: number;

  // Allow any nested mechanic structure
  [key: string]: string | number | boolean | object | undefined;
}

export interface SkillsetData {
  class?: string;
  weapon?: string;
  skillLines: {
    [key: string]: SkillLine;
  };
  mechanics?: {
    [key: string]: Mechanic;
  };
}
