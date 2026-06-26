/**
 * JSON-based implementation of Scribing data repository
 * Loads data from static JSON files
 */

import { Logger, LogLevel } from '@/utils/logger';

import scribingCompleteData from '../../../../../data/scribing-complete.json';
import { IScribingDataRepository } from '../../core/repositories/IScribingDataRepository';
import {
  GRIMOIRE_META,
  FOCUS_META,
  SIGNATURE_META,
  AFFIX_META,
  VERIFIED_FOCUS_EXCLUSIONS,
} from '../../data/scribingMetadata';
import { ERROR_MESSAGES } from '../../shared/constants';
import { validateScribingData } from '../../shared/schemas';
import {
  ScribingData,
  Grimoire,
  GrimoireNameTransformation,
  FocusScript,
  SignatureScript,
  AffixScript,
  ResourceType,
  DamageType,
} from '../../shared/types';

const RESOURCE_TYPES: ReadonlySet<string> = new Set(['magicka', 'stamina', 'health', 'hybrid']);
const DAMAGE_TYPES: ReadonlySet<string> = new Set([
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
]);

const asResource = (v: unknown): ResourceType | undefined =>
  typeof v === 'string' && RESOURCE_TYPES.has(v) ? (v as ResourceType) : undefined;
const asDamageType = (v: unknown): DamageType | undefined =>
  typeof v === 'string' && DAMAGE_TYPES.has(v) ? (v as DamageType) : undefined;

/**
 * Adapts the game-extracted `scribing-complete.json` (records keyed by slug,
 * flat grimoire cost, per-grimoire `nameTransformations`) into the typed
 * {@link ScribingData} the simulator consumes. The reference sections the
 * dataset doesn't include (quest rewards, vendors, …) are simply omitted.
 */
export function adaptScribingData(raw: typeof scribingCompleteData): ScribingData {
  const rawAny = raw as unknown as {
    version?: string;
    description?: string;
    lastUpdated?: string;
    grimoires?: Record<string, Record<string, unknown>>;
    focusScripts?: Record<string, Record<string, unknown>>;
    signatureScripts?: Record<string, Record<string, unknown>>;
    affixScripts?: Record<string, Record<string, unknown>>;
  };

  const grimoireKeys = Object.keys(rawAny.grimoires ?? {});

  // Build each grimoire's supported Focus set from its name-transformation keys,
  // dropping transforms research verified as not existing in the live game. This
  // is the ground truth for which focuses a grimoire can take.
  const focusGrimoires = new Map<string, string[]>();
  const grimoires: Record<string, Grimoire> = {};
  for (const [slug, g] of Object.entries(rawAny.grimoires ?? {})) {
    // Some grimoires have a non-numeric cost (e.g. Soul Burst "highest-resource").
    // Flag those rather than silently coercing a real variable cost to 0.
    const numericCost = typeof g.cost === 'number' ? g.cost : Number(g.cost);
    const costVaries = !Number.isFinite(numericCost);
    const flatCost = costVaries ? 0 : numericCost;
    // The grimoire's numeric `id` (when present) is its base ability id.
    const baseAbilityId = typeof g.id === 'number' ? g.id : undefined;
    const meta = GRIMOIRE_META[slug];
    const excluded = new Set(VERIFIED_FOCUS_EXCLUSIONS[slug] ?? []);

    const rawTransforms = (g.nameTransformations ?? {}) as Record<
      string,
      GrimoireNameTransformation
    >;
    const nameTransformations: Record<string, GrimoireNameTransformation> = {};
    for (const [focusSlug, t] of Object.entries(rawTransforms)) {
      if (excluded.has(focusSlug)) continue;
      nameTransformations[focusSlug] = t;
      const list = focusGrimoires.get(focusSlug) ?? [];
      list.push(slug);
      focusGrimoires.set(focusSlug, list);
    }

    grimoires[slug] = {
      id: slug,
      name: String(g.name ?? slug),
      skillLine: meta?.skillLine,
      requirements: null,
      cost: { first: flatCost, additional: flatCost },
      costVaries: costVaries || undefined,
      description: meta?.baseEffect ?? '',
      icon: meta?.icon,
      resource: asResource(g.resource),
      acquisition: meta?.acquisition,
      baseEffect: meta?.baseEffect,
      targetType: meta?.targetType,
      castType: meta?.castType,
      nameTransformations,
      abilityIds: baseAbilityId !== undefined ? [baseAbilityId] : undefined,
    };
  }

  const focusScripts: Record<string, FocusScript> = {};
  for (const [slug, f] of Object.entries(rawAny.focusScripts ?? {})) {
    const meta = FOCUS_META[slug];
    focusScripts[slug] = {
      // Key focus scripts by their slug — that is the key grimoire
      // `nameTransformations` use, and the raw `f.id` is an unrelated numeric id.
      id: slug,
      name: String(f.name ?? slug),
      type: 'Focus',
      icon: '',
      // A focus is compatible with exactly the grimoires whose (validated) name
      // transformations include it — the game-extracted ground truth.
      compatibleGrimoires: focusGrimoires.get(slug) ?? [],
      description: meta?.effect ?? String(f.name ?? ''),
      category: meta?.category,
      acquisition: meta?.acquisition,
      damageType: asDamageType(f.damageType),
    };
  }

  const toListScript = (
    slug: string,
    s: Record<string, unknown>,
    meta:
      | { effect?: string; category?: string; acquisition?: string; displayName?: string }
      | undefined,
  ): Omit<SignatureScript, 'type'> => ({
    id: String(s.id ?? slug),
    name: meta?.displayName ?? String(s.name ?? slug),
    icon: '',
    compatibleGrimoires: Array.isArray(s.compatibleGrimoires)
      ? (s.compatibleGrimoires as string[])
      : grimoireKeys,
    description: meta?.effect ?? String(s.description ?? ''),
    category: meta?.category,
    acquisition: meta?.acquisition,
    abilityIds: Array.isArray(s.abilityIds) ? (s.abilityIds as number[]) : undefined,
  });

  const signatureScripts: Record<string, SignatureScript> = {};
  for (const [slug, s] of Object.entries(rawAny.signatureScripts ?? {})) {
    signatureScripts[slug] = { ...toListScript(slug, s, SIGNATURE_META[slug]), type: 'Signature' };
  }

  const affixScripts: Record<string, AffixScript> = {};
  for (const [slug, s] of Object.entries(rawAny.affixScripts ?? {})) {
    affixScripts[slug] = { ...toListScript(slug, s, AFFIX_META[slug]), type: 'Affix' };
  }

  return {
    version: rawAny.version ?? '1.0.0',
    description: rawAny.description ?? 'ESO Scribing data',
    lastUpdated: rawAny.lastUpdated,
    grimoires,
    focusScripts,
    signatureScripts,
    affixScripts,
  } as ScribingData;
}

export class JsonScribingDataRepository implements IScribingDataRepository {
  private cachedData: ScribingData | null = null;
  private loadingPromise: Promise<ScribingData> | null = null;
  private logger = new Logger({
    level: LogLevel.WARN,
    contextPrefix: 'JsonScribingDataRepository',
  });

  async loadScribingData(): Promise<ScribingData> {
    if (this.cachedData) {
      return this.cachedData;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.fetchAndValidateData();

    try {
      this.cachedData = await this.loadingPromise;
      return this.cachedData;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async fetchAndValidateData(): Promise<ScribingData> {
    try {
      // The dataset is bundled with the app, so adapt the imported JSON directly
      // (the previous runtime fetch of /data/scribing-complete.json 404'd in the
      // built SPA — the file is not served from public/).
      const adapted = adaptScribingData(scribingCompleteData);

      // Validate the adapted structure.
      const validatedData = validateScribingData(adapted);

      return validatedData;
    } catch (error) {
      this.logger.error('Failed to load scribing data', error instanceof Error ? error : undefined);
      throw new Error(
        `${ERROR_MESSAGES.DATA_LOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getGrimoire(id: string): Promise<Grimoire | null> {
    const data = await this.loadScribingData();
    return data.grimoires[id] || null;
  }

  async getAllGrimoires(): Promise<Grimoire[]> {
    const data = await this.loadScribingData();
    return Object.values(data.grimoires);
  }

  async getFocusScript(id: string): Promise<FocusScript | null> {
    const data = await this.loadScribingData();
    return data.focusScripts[id] || null;
  }

  async getAllFocusScripts(): Promise<FocusScript[]> {
    const data = await this.loadScribingData();
    return Object.values(data.focusScripts);
  }

  async getSignatureScript(id: string): Promise<SignatureScript | null> {
    const data = await this.loadScribingData();
    return data.signatureScripts[id] || null;
  }

  async getAllSignatureScripts(): Promise<SignatureScript[]> {
    const data = await this.loadScribingData();
    return Object.values(data.signatureScripts);
  }

  async getAffixScript(id: string): Promise<AffixScript | null> {
    const data = await this.loadScribingData();
    return data.affixScripts[id] || null;
  }

  async getAllAffixScripts(): Promise<AffixScript[]> {
    const data = await this.loadScribingData();
    return Object.values(data.affixScripts);
  }

  async getCompatibleScripts(grimoireId: string): Promise<{
    focusScripts: FocusScript[];
    signatureScripts: SignatureScript[];
    affixScripts: AffixScript[];
  }> {
    const [allFocusScripts, allSignatureScripts, allAffixScripts] = await Promise.all([
      this.getAllFocusScripts(),
      this.getAllSignatureScripts(),
      this.getAllAffixScripts(),
    ]);

    return {
      focusScripts: allFocusScripts.filter((script) =>
        script.compatibleGrimoires.includes(grimoireId),
      ),
      signatureScripts: allSignatureScripts.filter((script) =>
        script.compatibleGrimoires.includes(grimoireId),
      ),
      affixScripts: allAffixScripts.filter((script) =>
        script.compatibleGrimoires.includes(grimoireId),
      ),
    };
  }

  /**
   * Validity of a (possibly partial) selection. An empty script id means "slot
   * not chosen" and is allowed; a provided id must exist AND be compatible with
   * the grimoire. This matches {@link ScribingSimulatorService.simulate} so there
   * is a single validity contract across the repository, service and engine.
   */
  async validateCombination(
    grimoireId: string,
    focusScriptId: string,
    signatureScriptId: string,
    affixScriptId: string,
  ): Promise<boolean> {
    try {
      const data = await this.loadScribingData();
      const grimoire = data.grimoires[grimoireId];
      if (!grimoire) {
        return false;
      }

      const slotOk = (
        id: string,
        script: { compatibleGrimoires: readonly string[] } | undefined,
      ): boolean => {
        if (!id) return true; // slot intentionally left empty
        if (!script) return false; // unknown id
        return script.compatibleGrimoires.includes(grimoireId);
      };

      return (
        slotOk(focusScriptId, data.focusScripts[focusScriptId]) &&
        slotOk(signatureScriptId, data.signatureScripts[signatureScriptId]) &&
        slotOk(affixScriptId, data.affixScripts[affixScriptId])
      );
    } catch (error) {
      this.logger.error(
        'Error validating combination',
        error instanceof Error ? error : undefined,
        { grimoireId, focusScriptId, signatureScriptId, affixScriptId },
      );
      return false;
    }
  }

  clearCache(): void {
    this.cachedData = null;
    this.loadingPromise = null;
  }

  isDataCached(): boolean {
    return this.cachedData !== null;
  }
}
