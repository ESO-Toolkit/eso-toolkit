/**
 * JSON-based implementation of Scribing data repository
 * Loads data from static JSON files
 */

import { Logger, LogLevel } from '@/utils/logger';

import scribingCompleteData from '../../../../../data/scribing-complete.json';
import { IScribingDataRepository } from '../../core/repositories/IScribingDataRepository';
import { ERROR_MESSAGES } from '../../shared/constants';
import { validateScribingData } from '../../shared/schemas';
import {
  ScribingData,
  Grimoire,
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

  const grimoires: Record<string, Grimoire> = {};
  for (const [slug, g] of Object.entries(rawAny.grimoires ?? {})) {
    const flatCost = Number(g.cost) || 0;
    // The grimoire's numeric `id` (when present) is its base ability id.
    const baseAbilityId = typeof g.id === 'number' ? g.id : undefined;
    grimoires[slug] = {
      id: slug,
      name: String(g.name ?? slug),
      requirements: null,
      cost: { first: flatCost, additional: flatCost },
      description: '',
      resource: asResource(g.resource),
      nameTransformations: g.nameTransformations as Grimoire['nameTransformations'],
      abilityIds: baseAbilityId !== undefined ? [baseAbilityId] : undefined,
    };
  }

  const focusScripts: Record<string, FocusScript> = {};
  for (const [slug, f] of Object.entries(rawAny.focusScripts ?? {})) {
    focusScripts[slug] = {
      id: String(f.id ?? slug),
      name: String(f.name ?? slug),
      type: 'Focus',
      icon: '',
      // Focus scripts apply to any grimoire (each grimoire has a transformed
      // name per damage type); compatibility is enforced by nameTransformations.
      compatibleGrimoires: grimoireKeys,
      description: String(f.name ?? ''),
      damageType: asDamageType(f.damageType),
    };
  }

  const toListScript = (
    slug: string,
    s: Record<string, unknown>,
  ): Omit<SignatureScript, 'type'> => ({
    id: String(s.id ?? slug),
    name: String(s.name ?? slug),
    icon: '',
    compatibleGrimoires: Array.isArray(s.compatibleGrimoires)
      ? (s.compatibleGrimoires as string[])
      : grimoireKeys,
    description: String(s.description ?? ''),
    abilityIds: Array.isArray(s.abilityIds) ? (s.abilityIds as number[]) : undefined,
  });

  const signatureScripts: Record<string, SignatureScript> = {};
  for (const [slug, s] of Object.entries(rawAny.signatureScripts ?? {})) {
    signatureScripts[slug] = { ...toListScript(slug, s), type: 'Signature' };
  }

  const affixScripts: Record<string, AffixScript> = {};
  for (const [slug, s] of Object.entries(rawAny.affixScripts ?? {})) {
    affixScripts[slug] = { ...toListScript(slug, s), type: 'Affix' };
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

  async validateCombination(
    grimoireId: string,
    focusScriptId: string,
    signatureScriptId: string,
    affixScriptId: string,
  ): Promise<boolean> {
    try {
      const [grimoire, focusScript, signatureScript, affixScript] = await Promise.all([
        this.getGrimoire(grimoireId),
        this.getFocusScript(focusScriptId),
        this.getSignatureScript(signatureScriptId),
        this.getAffixScript(affixScriptId),
      ]);

      // Check if all components exist
      if (!grimoire || !focusScript || !signatureScript || !affixScript) {
        return false;
      }

      // Check compatibility
      const isCompatible =
        focusScript.compatibleGrimoires.includes(grimoireId) &&
        signatureScript.compatibleGrimoires.includes(grimoireId) &&
        affixScript.compatibleGrimoires.includes(grimoireId);

      return isCompatible;
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
