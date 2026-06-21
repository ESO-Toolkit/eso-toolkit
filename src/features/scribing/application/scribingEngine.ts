/**
 * Pure scribing simulation engine.
 *
 * Operates on already-loaded {@link ScribingData} with no I/O, so it can be used
 * synchronously in React `useMemo` for live previews and wrapped by the async
 * {@link ScribingSimulatorService} for the repository/DI flow. All knowledge of
 * how a grimoire + script combination resolves into a concrete scribed skill
 * lives here, in one tested place.
 *
 * Accuracy notes:
 * - A grimoire only supports the Focus scripts present in its
 *   `nameTransformations` map (the game-extracted ground truth). Selecting a
 *   focus renames the skill to `nameTransformations[focusId].name` and points at
 *   the real resulting ability id (used for the in-game icon).
 * - Signature/Affix compatibility comes from each script's `compatibleGrimoires`
 *   list (validated combinations observed in logs).
 */

import type {
  ScribingData,
  Grimoire,
  FocusScript,
  SignatureScript,
  AffixScript,
  ResourceType,
} from '../shared/types';

export type ScribingSlot = 'focus' | 'signature' | 'affix';

export interface ScribingSelection {
  readonly grimoireId: string;
  readonly focusId?: string;
  readonly signatureId?: string;
  readonly affixId?: string;
}

export interface CompatibleScripts {
  readonly focusScripts: FocusScript[];
  readonly signatureScripts: SignatureScript[];
  readonly affixScripts: AffixScript[];
}

/** One line of the composed scribed-skill effect, one per chosen script. */
export interface ScribedEffectLine {
  readonly slot: ScribingSlot;
  readonly id: string;
  readonly name: string;
  readonly effect: string;
  readonly category?: string;
  readonly acquisition?: string;
}

export interface ScribedSkillResult {
  readonly grimoireId: string;
  readonly grimoireName: string;
  readonly skillLine?: string;
  /** The skill's in-game name once the focus is applied (falls back to grimoire name). */
  readonly skillName: string;
  /** Resulting ability id for the focused skill, used to resolve the icon/name. */
  readonly abilityId?: number;
  /** ESO Logs ability-icon filename (no extension). */
  readonly icon?: string;
  readonly resourceType: ResourceType;
  /** Base magicka/stamina cost of the grimoire ability; undefined when it varies. */
  readonly cost?: number;
  /** True when the grimoire's cost is not a fixed number (e.g. highest-resource). */
  readonly costVaries: boolean;
  readonly targetType?: string;
  readonly castType?: string;
  readonly baseEffect?: string;
  /** Effect lines for the chosen Focus/Signature/Affix scripts, in slot order. */
  readonly effects: ScribedEffectLine[];
  /** Non-fatal issues (e.g. an incompatible focus that was ignored). */
  readonly warnings: string[];
  /** True when all three script slots are filled — a fully scribed skill. */
  readonly isComplete: boolean;
}

/**
 * The Focus scripts a grimoire supports, derived from its `nameTransformations`
 * keys (game-extracted ground truth) rather than treating every focus as
 * universally available.
 */
export function getFocusScriptIdsForGrimoire(grimoire: Grimoire): string[] {
  return Object.keys(grimoire.nameTransformations ?? {});
}

/**
 * Scripts compatible with the given grimoire. Focus scripts are filtered to the
 * grimoire's supported set; Signature/Affix scripts use their own
 * `compatibleGrimoires` lists.
 */
export function getCompatibleScripts(data: ScribingData, grimoireId: string): CompatibleScripts {
  const grimoire = data.grimoires[grimoireId];
  if (!grimoire) {
    return { focusScripts: [], signatureScripts: [], affixScripts: [] };
  }

  const supportedFocusIds = new Set(getFocusScriptIdsForGrimoire(grimoire));

  return {
    focusScripts: Object.values(data.focusScripts).filter((s) => supportedFocusIds.has(s.id)),
    signatureScripts: Object.values(data.signatureScripts).filter((s) =>
      s.compatibleGrimoires.includes(grimoireId),
    ),
    affixScripts: Object.values(data.affixScripts).filter((s) =>
      s.compatibleGrimoires.includes(grimoireId),
    ),
  };
}

function effectLine(
  slot: ScribingSlot,
  script: {
    id: string;
    name: string;
    description: string;
    category?: string;
    acquisition?: string;
  },
): ScribedEffectLine {
  return {
    slot,
    id: script.id,
    name: script.name,
    effect: script.description,
    category: script.category,
    acquisition: script.acquisition,
  };
}

/**
 * Resolve a grimoire + script selection into a concrete scribed-skill preview.
 * Returns `null` only when the grimoire id is unknown.
 */
export function deriveScribedSkill(
  data: ScribingData,
  selection: ScribingSelection,
): ScribedSkillResult | null {
  const grimoire = data.grimoires[selection.grimoireId];
  if (!grimoire) {
    return null;
  }

  const warnings: string[] = [];

  const focus: FocusScript | undefined = selection.focusId
    ? data.focusScripts[selection.focusId]
    : undefined;
  const signature: SignatureScript | undefined = selection.signatureId
    ? data.signatureScripts[selection.signatureId]
    : undefined;
  const affix: AffixScript | undefined = selection.affixId
    ? data.affixScripts[selection.affixId]
    : undefined;

  // Focus drives the skill's name + resulting ability. Only a focus the grimoire
  // actually supports transforms the skill. A selected script that the grimoire
  // does NOT support is reported as a warning and excluded from the result (not
  // counted toward the effects or completeness) so the engine never renders an
  // impossible build as a valid one.
  const transform = focus ? grimoire.nameTransformations?.[focus.id] : undefined;
  const focusOk = Boolean(focus && transform);
  const signatureOk = Boolean(signature && signature.compatibleGrimoires.includes(grimoire.id));
  const affixOk = Boolean(affix && affix.compatibleGrimoires.includes(grimoire.id));

  if (focus && !focusOk) {
    warnings.push(`${focus.name} is not available on ${grimoire.name}.`);
  }
  if (signature && !signatureOk) {
    warnings.push(`${signature.name} is not available on ${grimoire.name}.`);
  }
  if (affix && !affixOk) {
    warnings.push(`${affix.name} is not available on ${grimoire.name}.`);
  }

  const skillName = transform?.name ?? grimoire.name;
  // Only fall back to the grimoire's base ability id when NO focus transform
  // applied. A transformed skill whose dataset entry has no matched ability id
  // (the many `matchCount: 0` transforms) stays undefined — its icon falls back
  // to the grimoire icon — rather than masquerading as the base ability.
  const abilityId = transform ? transform.abilityIds?.[0] : grimoire.abilityIds?.[0];

  const effects: ScribedEffectLine[] = [];
  if (focusOk && focus) effects.push(effectLine('focus', focus));
  if (signatureOk && signature) effects.push(effectLine('signature', signature));
  if (affixOk && affix) effects.push(effectLine('affix', affix));

  return {
    grimoireId: grimoire.id,
    grimoireName: grimoire.name,
    skillLine: grimoire.skillLine,
    skillName,
    abilityId,
    icon: grimoire.icon,
    // Resource is a property of the grimoire in the game-extracted data (the
    // Focus changes the damage TYPE, not Magicka vs Stamina). Cost is the
    // grimoire's base value — the exact cost scales with the Focus, so the UI
    // de-emphasises the number rather than presenting it as authoritative. A
    // grimoire with a variable cost (e.g. highest-resource) reports no number.
    resourceType: grimoire.resource ?? 'magicka',
    cost: grimoire.costVaries ? undefined : grimoire.cost.first,
    costVaries: Boolean(grimoire.costVaries),
    targetType: grimoire.targetType,
    castType: grimoire.castType,
    baseEffect: grimoire.baseEffect,
    effects,
    warnings,
    // A complete build = all three slots filled with grimoire-compatible scripts.
    isComplete: focusOk && signatureOk && affixOk,
  };
}

/**
 * Build a sharable, human-readable one-line summary of a scribed skill, e.g.
 * "Fiery Banner — Banner Bearer · Flame Damage / Class Mastery / Major Breach".
 */
export function summarizeScribedSkill(result: ScribedSkillResult): string {
  const parts = result.effects.map((e) => e.name);
  const scripts = parts.length ? ` · ${parts.join(' / ')}` : '';
  return `${result.skillName} — ${result.grimoireName}${scripts}`;
}
