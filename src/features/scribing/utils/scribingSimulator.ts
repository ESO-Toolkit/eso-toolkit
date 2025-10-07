import {
  ScribingData,
  Grimoire,
  FocusScript,
  SignatureScript,
  AffixScript,
  CalculatedSkill,
  ResourceType,
  DamageType,
  validateScribingData,
  validateGrimoire,
  validateFocusScript,
  validateSignatureScript,
  validateAffixScript,
  validateCalculatedSkill,
  safeParseScribingData,
} from '../types/scribing-schemas';

/**
 * ESO Scribing Simulation Engine
 * Calculates dynamic skill properties based on script combinations
 */
export class ScribingSimulator {
  constructor(private data: ScribingData) {
    // Validate the data structure on initialization
    try {
      ScribingSimulator.validateData(data);
    } catch {
      // Continue with initialization but data may be invalid
      // In production, consider throwing the error instead
    }
  }

  /**
   * Calculate skill properties for a given script combination
   */
  calculateSkill(
    grimoireId: string,
    focusId?: string,
    signatureId?: string,
    affixId?: string,
  ): CalculatedSkill | null {
    // Validate input parameters
    if (!grimoireId || typeof grimoireId !== 'string') {
      return null;
    }

    const grimoire = this.data.grimoires[grimoireId];
    if (!grimoire) {
      return null;
    }

    // Safely retrieve and validate scripts
    const focus = focusId ? this.data.focusScripts[focusId] : null;
    const signature = signatureId ? this.data.signatureScripts?.[signatureId] : null;
    const affix = affixId ? this.data.affixScripts?.[affixId] : null;

    // Validate retrieved scripts
    try {
      if (focus) this.validateFocusScript(focus);
      if (signature) this.validateSignatureScript(signature);
      if (affix) this.validateAffixScript(affix);
    } catch {
      return null;
    }

    // Validate compatibility using nameTransformations
    if (focus && focusId) {
      const nameTransformations = (grimoire as { nameTransformations?: Record<string, unknown> })
        .nameTransformations;
      if (!nameTransformations || !nameTransformations[focusId]) {
        return null;
      }
    }
    // Signature and affix scripts are compatible with all grimoires

    // Calculate properties
    const cost = this.calculateCost(grimoire, focus, signature, affix);
    const damage = this.calculateDamage(grimoire, focus, signature, affix);
    const shield = this.calculateShield(grimoire, focus, signature, affix);
    const healing = this.calculateHealing(grimoire, focus, signature, affix);
    const mitigation = this.calculateMitigation(focus);
    const dispel = this.calculateDispel(focus);
    const duration = this.calculateDuration(grimoire, signature);
    const name = this.generateName(grimoire, focus, focusId);
    const abilityIds = this.getAbilityIds(grimoire, focus, focusId);
    const tooltip = this.generateTooltip(grimoire, focus, signature, affix, {
      cost,
      damage,
      shield,
      healing,
      mitigation,
      dispel,
      duration,
    });

    const calculatedSkill = {
      name,
      grimoire: grimoireId,
      focus: focusId,
      signature: signatureId,
      affix: affixId,
      abilityIds,
      properties: {
        cost: cost.value || 0,
        resource: this.validateResourceType(cost.resource || 'stamina'),
        castTime: (grimoire as unknown as { castTime?: number }).castTime || 1000, // Default cast time in milliseconds
        duration: duration || undefined,
        radius: (grimoire as unknown as { radius?: number }).radius || undefined,
        shape: (grimoire as unknown as { shape?: string }).shape || undefined,
        target: (grimoire as unknown as { target?: string }).target || 'Enemy',
        damage: damage?.value || undefined,
        damageType: this.validateDamageType(damage?.type),
        shield: shield?.value || undefined,
        healing: healing?.value || undefined,
        mitigationPercent: mitigation?.reductionPercent || undefined,
        dispelCount: dispel?.effectCount || undefined,
      },
      tooltip,
      effects: this.calculateEffects(focus, signature, affix),
    };

    // Validate the output before returning
    try {
      return this.validateCalculatedSkill(calculatedSkill);
    } catch {
      return null;
    }
  }

  private calculateCost(
    grimoire: Grimoire,
    focus?: FocusScript | null,
    signature?: SignatureScript | null,
    _affix?: AffixScript | null,
  ): { value: number; resource: string } {
    // Handle our enhanced database structure with flexible cost types
    const rawCost = (grimoire as unknown as { cost: string | number }).cost;
    let baseCost: number;

    if (typeof rawCost === 'string') {
      // Handle special cost values
      switch (rawCost) {
        case 'highest-resource':
          baseCost = 3000; // Default for highest resource cost
          break;
        default:
          baseCost = 0;
      }
    } else {
      baseCost = rawCost || 0;
    }

    const resource = (grimoire as unknown as { resource?: string }).resource || 'stamina';

    // Apply modifiers (simplified calculation)
    let modifier = 1.0;
    if (focus?.mechanicalEffect?.costModifier) {
      modifier *= focus.mechanicalEffect.costModifier;
    }
    if (signature?.mechanicalEffect?.costModifier) {
      modifier *= signature.mechanicalEffect.costModifier;
    }

    return {
      value: Math.round(baseCost * modifier),
      resource,
    };
  }

  private calculateDamage(
    grimoire: Grimoire,
    focus?: FocusScript | null,
    signature?: SignatureScript | null,
    affix?: AffixScript | null,
  ): { value: number; type: string } | null {
    // Only calculate damage if there's a damage-dealing focus script
    const nonDamageFocusTypes = [
      'damage-shield',
      'mitigation',
      'healing',
      'dispel',
      'restore-resources',
      'generate-ultimate',
      'taunt',
      'multi-target',
      'knockback',
      'pull',
      'immobilize',
      'stun',
    ];

    // If no focus script or if it's a non-damage focus, return null
    if (!focus || nonDamageFocusTypes.includes(focus.id)) {
      return null;
    }

    // Use a reasonable default damage value since our database doesn't have specific formulas
    const baseDamage = 10000;

    let multiplier = 1.0;
    let damageType = 'physical';

    // Apply focus script effects for damage-dealing focus scripts
    if (focus?.mechanicalEffect) {
      multiplier *= focus.mechanicalEffect.multiplier || 1.0;
      damageType = focus.mechanicalEffect.damageType || 'physical';
    }

    // Apply signature script effects
    if (signature?.mechanicalEffect?.multiplier) {
      multiplier *= signature.mechanicalEffect.multiplier;
    }

    // Apply affix script effects (damage buffs)
    if (affix?.mechanicalEffect?.multiplier) {
      multiplier *= affix.mechanicalEffect.multiplier;
    }

    return {
      value: Math.round(baseDamage * multiplier),
      type: damageType,
    };
  }

  private calculateShield(
    grimoire: Grimoire,
    focus?: FocusScript | null,
    signature?: SignatureScript | null,
    affix?: AffixScript | null,
  ): { value: number } | null {
    // Only calculate shield if using damage-shield focus
    if (!focus || focus.id !== 'damage-shield') {
      return null;
    }

    // Use a reasonable default shield value since our database doesn't have specific formulas
    const baseShield = 10000;
    let multiplier = focus.mechanicalEffect?.multiplier || 1.2;

    // Apply signature script effects to shield
    if (signature?.mechanicalEffect?.multiplier) {
      multiplier *= signature.mechanicalEffect.multiplier;
    }

    // Apply affix script effects to shield
    if (affix?.mechanicalEffect?.multiplier) {
      multiplier *= affix.mechanicalEffect.multiplier;
    }

    return {
      value: Math.round(baseShield * multiplier),
    };
  }

  private calculateHealing(
    grimoire: Grimoire,
    focus?: FocusScript | null,
    signature?: SignatureScript | null,
    affix?: AffixScript | null,
  ): { value: number } | null {
    // Only calculate healing if using healing focus
    if (!focus || focus.id !== 'healing') {
      return null;
    }

    // Use damage base values as healing base (they're typically similar in ESO)
    // Use a reasonable default healing value since our database doesn't have specific formulas
    const baseHealing = 10000;
    let multiplier = focus.mechanicalEffect?.multiplier || 1.2;

    // Apply signature script effects to healing
    if (signature?.mechanicalEffect?.multiplier) {
      multiplier *= signature.mechanicalEffect.multiplier;
    }

    // Apply affix script effects to healing
    if (affix?.mechanicalEffect?.multiplier) {
      multiplier *= affix.mechanicalEffect.multiplier;
    }

    return {
      value: Math.round(baseHealing * multiplier),
    };
  }

  private calculateMitigation(focus?: FocusScript | null): { reductionPercent: number } | null {
    // Only calculate mitigation if using mitigation focus
    if (!focus || focus.id !== 'mitigation') {
      return null;
    }

    // Default to 10% damage reduction for mitigation focus
    const damageReduction = 0.1;

    return {
      reductionPercent: Math.round(damageReduction * 100),
    };
  }

  private calculateDispel(focus?: FocusScript | null): { effectCount: number } | null {
    // Only calculate dispel if using dispel focus
    if (!focus || focus.id !== 'dispel') {
      return null;
    }

    // Default to 2 effects removed for dispel
    return {
      effectCount: 2,
    };
  }

  private calculateDuration(grimoire: Grimoire, signature?: SignatureScript | null): number {
    // Handle our enhanced database structure - duration might be flat or missing
    let baseDuration = (grimoire as unknown as { duration?: number }).duration || 0;

    if (signature?.mechanicalEffect?.durationMultiplier) {
      baseDuration *= signature.mechanicalEffect.durationMultiplier;
    }

    return baseDuration;
  }

  private generateName(grimoire: Grimoire, focus?: FocusScript | null, focusKey?: string): string {
    if (!focus || !focusKey) return grimoire.name;

    // Use our enhanced nameTransformations structure
    const nameTransformations = (
      grimoire as unknown as { nameTransformations?: Record<string, string | { name?: string }> }
    ).nameTransformations;
    if (nameTransformations && nameTransformations[focusKey]) {
      const transformation = nameTransformations[focusKey];
      // Handle both string and object formats for backward compatibility
      return typeof transformation === 'string'
        ? transformation
        : transformation.name || grimoire.name;
    }

    // Fallback to original name
    return grimoire.name;
  }

  private getAbilityIds(
    grimoire: Grimoire,
    focus?: FocusScript | null,
    focusKey?: string,
  ): number[] {
    if (!focus || !focusKey) return [];

    // Extract ability IDs from our enhanced nameTransformations structure
    const nameTransformations = (
      grimoire as unknown as { nameTransformations?: Record<string, { abilityIds?: number[] }> }
    ).nameTransformations;
    if (nameTransformations && nameTransformations[focusKey]) {
      const transformation = nameTransformations[focusKey];
      // Handle object format with abilityIds
      if (typeof transformation === 'object' && transformation.abilityIds) {
        return Array.isArray(transformation.abilityIds) ? transformation.abilityIds : [];
      }
    }

    return [];
  }

  private generateTooltip(
    grimoire: Grimoire,
    focus?: FocusScript | null,
    signature?: SignatureScript | null,
    affix?: AffixScript | null,
    calculated?: {
      cost: { value: number; resource: string };
      damage: { value: number; type: string } | null;
      shield: { value: number } | null;
      healing: { value: number } | null;
      mitigation: { reductionPercent: number } | null;
      dispel: { effectCount: number } | null;
      duration: number;
    },
  ): string {
    const template = this.data.skillTemplates?.[grimoire.id];
    if (!template || !calculated) return grimoire.name; // Use name instead of description

    let tooltip = `Cost: ${calculated.cost.value} ${calculated.cost.resource.charAt(0).toUpperCase() + calculated.cost.resource.slice(1)}\n`;

    const castTime = (grimoire as unknown as { castTime?: number }).castTime || 1000; // milliseconds
    tooltip += `Cast time: ${castTime / 1000} second${castTime !== 1000 ? 's' : ''}\n`;
    tooltip += `Target: Area\n`;

    if (calculated.duration > 0) {
      tooltip += `Duration: ${calculated.duration} seconds\n`;
    }

    const radius = (grimoire as unknown as { radius?: number }).radius;
    if (radius) {
      tooltip += `Radius: ${radius} meters\n`;
    }

    // Add a generic effect description since we don't have skill templates
    tooltip += `Effect: Scribing skill effect based on selected scripts.`;

    // Handle different focus script types
    if (focus?.id === 'damage-shield' && calculated.shield) {
      tooltip += ` Grants a damage shield that absorbs ${calculated.shield.value} damage.`;
    } else if (focus?.id === 'healing' && calculated.healing) {
      tooltip += ` Heals for ${calculated.healing.value} Health.`;
    } else if (focus?.id === 'mitigation' && calculated.mitigation) {
      tooltip += ` Reduces damage taken by ${calculated.mitigation.reductionPercent}%.`;
    } else if (focus?.id === 'dispel' && calculated.dispel) {
      tooltip += ` Removes up to ${calculated.dispel.effectCount} enemy effects.`;
    } else if (focus?.mechanicalEffect && calculated.damage) {
      tooltip += ` Deals ${calculated.damage.value} ${calculated.damage.type.charAt(0).toUpperCase() + calculated.damage.type.slice(1)} Damage`;
      if (focus.mechanicalEffect.damageType === 'bleed') {
        tooltip += ' over time';
      }
      tooltip += ' to all enemies.';
    }

    return tooltip;
  }

  private calculateEffects(
    focus?: FocusScript | null,
    signature?: SignatureScript | null,
    affix?: AffixScript | null,
  ): string[] {
    const effects: string[] = [];

    if (focus?.mechanicalEffect?.statusEffect) {
      effects.push(focus.mechanicalEffect.statusEffect);
    }

    if (signature?.mechanicalEffect?.effects) {
      effects.push(...signature.mechanicalEffect.effects);
    }

    if (affix?.mechanicalEffect?.effects) {
      effects.push(...affix.mechanicalEffect.effects);
    }

    return effects;
  }

  /**
   * Get all valid combinations for a grimoire
   */
  getValidCombinations(grimoireId: string): Array<{
    focus?: string;
    signature?: string;
    affix?: string;
  }> {
    const grimoire = this.data.grimoires[grimoireId];
    if (!grimoire) return [];

    const validFocus = Object.values(this.data.focusScripts || {})
      .filter((script: FocusScript) => script.compatibleGrimoires?.includes(grimoireId) !== false) // Allow scripts without compatibility defined
      .map((script: FocusScript) => script.id);

    // Signature scripts are compatible with all grimoires
    const validSignature = Object.values(this.data.signatureScripts || {}).map(
      (script: SignatureScript) => script.id,
    );

    // Affix scripts are compatible with all grimoires
    const validAffix = Object.values(this.data.affixScripts || {}).map(
      (script: AffixScript) => script.id,
    );

    const combinations: Array<{ focus?: string; signature?: string; affix?: string }> = [];

    // Generate all valid combinations
    for (const focus of [undefined, ...validFocus]) {
      for (const signature of [undefined, ...validSignature]) {
        for (const affix of [undefined, ...validAffix]) {
          combinations.push({ focus, signature, affix });
        }
      }
    }

    return combinations;
  }

  /**
   * Search for combinations that produce specific effects
   */
  searchByEffect(effectType: string, grimoireId?: string): CalculatedSkill[] {
    const grimoires = grimoireId ? [grimoireId] : Object.keys(this.data.grimoires);

    const results: CalculatedSkill[] = [];

    for (const gId of grimoires) {
      const combinations = this.getValidCombinations(gId);

      for (const combo of combinations) {
        const skill = this.calculateSkill(gId, combo.focus, combo.signature, combo.affix);
        if (skill && skill.effects.includes(effectType)) {
          results.push(skill);
        }
      }
    }

    return results;
  }

  /**
   * Validate and normalize resource type
   */
  private validateResourceType(resource: string): ResourceType {
    const validResources: ResourceType[] = ['magicka', 'stamina', 'health', 'hybrid'];
    return validResources.includes(resource as ResourceType)
      ? (resource as ResourceType)
      : 'stamina';
  }

  /**
   * Validate and normalize damage type
   */
  private validateDamageType(damageType?: string): DamageType | undefined {
    if (!damageType) return undefined;

    const validDamageTypes: DamageType[] = [
      'magic',
      'physical',
      'fire',
      'frost',
      'shock',
      'poison',
      'disease',
      'bleed',
      'oblivion',
      'flame',
    ];
    return validDamageTypes.includes(damageType as DamageType)
      ? (damageType as DamageType)
      : undefined;
  }

  /**
   * Validate scribing data integrity at runtime
   */
  static validateData(data: unknown): ScribingData {
    try {
      return validateScribingData(data);
    } catch (error) {
      throw new Error(
        `Invalid scribing data structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Safe validation that returns success/error results
   */
  static safeValidateData(data: unknown): ReturnType<typeof safeParseScribingData> {
    return safeParseScribingData(data);
  }

  /**
   * Validate individual script components
   */
  validateGrimoire(grimoire: unknown): Grimoire {
    return validateGrimoire(grimoire);
  }

  validateFocusScript(script: unknown): FocusScript {
    return validateFocusScript(script);
  }

  validateSignatureScript(script: unknown): SignatureScript {
    return validateSignatureScript(script);
  }

  validateAffixScript(script: unknown): AffixScript {
    return validateAffixScript(script);
  }

  /**
   * Validate calculated skill output
   */
  validateCalculatedSkill(skill: unknown): CalculatedSkill {
    return validateCalculatedSkill(skill);
  }
}

/**
 * Utility functions for working with the simulator
 */
export const scribingUtils = {
  /**
   * Parse a combination URL parameter
   */
  parseCombinationUrl(url: string): { grimoireId: string; focusIndex?: number } | null {
    const match = url.match(/combination=(\d+),(\d+)/);
    if (!match) return null;

    const [, combinationId, focusIndex] = match;

    // This would need to be mapped based on the actual combination mapping
    // For now, we know 220541 = trample
    if (combinationId === '220541') {
      return {
        grimoireId: 'trample',
        focusIndex: parseInt(focusIndex, 10),
      };
    }

    return null;
  },

  /**
   * Generate a share URL for a combination
   */
  generateShareUrl(grimoireId: string, focusIndex?: number): string {
    // This would need the reverse mapping
    const baseUrl = 'https://eso-hub.com/en/scribing-simulator';

    if (grimoireId === 'trample' && focusIndex !== undefined) {
      return `${baseUrl}?combination=220541,${focusIndex}`;
    }

    return baseUrl;
  },

  /**
   * Calculate ink costs for learning scripts
   */
  calculateInkCost(scriptCount: number, isFirst: boolean = false): number {
    if (isFirst) return 0; // First script is usually free from quests

    // Base cost scaling (simplified)
    return Math.min(50000 + (scriptCount - 1) * 10000, 100000);
  },
};
