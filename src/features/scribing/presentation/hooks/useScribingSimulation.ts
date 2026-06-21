/**
 * Live scribing-simulation hook.
 *
 * Loads the (small, bundled) scribing dataset once, then derives the compatible
 * scripts and the resulting scribed skill synchronously via the pure engine on
 * every selection change — no per-keystroke async round-trips and no manual
 * "simulate" step. Selection is mirrored to the URL query string so a build is
 * shareable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLogger } from '@/contexts/LoggerContext';

import {
  deriveScribedSkill,
  getCompatibleScripts,
  summarizeScribedSkill,
  type CompatibleScripts,
  type ScribedSkillResult,
} from '../../application/scribingEngine';
import { JsonScribingDataRepository } from '../../infrastructure/data/JsonScribingDataRepository';
import type { Grimoire, ScribingData } from '../../shared/types';

export interface ScribingSelection {
  grimoireId: string;
  focusId?: string;
  signatureId?: string;
  affixId?: string;
}

export interface UseScribingSimulationOptions {
  defaultGrimoire?: string;
}

export interface UseScribingSimulationResult {
  isLoading: boolean;
  error: string | null;
  isReady: boolean;

  grimoires: Grimoire[];
  selection: ScribingSelection;
  selectedGrimoire: Grimoire | null;
  compatible: CompatibleScripts;
  result: ScribedSkillResult | null;

  setGrimoire: (id: string) => void;
  setFocus: (id: string | undefined) => void;
  setSignature: (id: string | undefined) => void;
  setAffix: (id: string | undefined) => void;
  reset: () => void;
  randomize: () => void;

  shareUrl: string;
  summary: string;
}

const EMPTY_COMPATIBLE: CompatibleScripts = {
  focusScripts: [],
  signatureScripts: [],
  affixScripts: [],
};

function readSelectionFromUrl(fallbackGrimoire: string): ScribingSelection {
  if (typeof window === 'undefined') return { grimoireId: fallbackGrimoire };
  const params = new URLSearchParams(window.location.search);
  return {
    grimoireId: params.get('grimoire') || fallbackGrimoire,
    focusId: params.get('focus') || undefined,
    signatureId: params.get('signature') || undefined,
    affixId: params.get('affix') || undefined,
  };
}

function pickRandom<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;
  // Math.random is fine here — purely cosmetic "surprise me".
  return items[Math.floor(Math.random() * items.length)];
}

export function useScribingSimulation(
  options: UseScribingSimulationOptions = {},
): UseScribingSimulationResult {
  const logger = useLogger('useScribingSimulation');
  const [repository] = useState(() => new JsonScribingDataRepository());

  const [data, setData] = useState<ScribingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<ScribingSelection>({ grimoireId: '' });
  const initialisedRef = useRef(false);

  // Load + adapt the dataset once.
  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const loaded = await repository.loadScribingData();
        if (cancelled) return;
        setData(loaded);

        const grimoireIds = Object.keys(loaded.grimoires);
        const fallback = options.defaultGrimoire ?? grimoireIds[0] ?? '';
        const fromUrl = readSelectionFromUrl(fallback);
        // Only honour a URL grimoire that actually exists.
        const grimoireId = loaded.grimoires[fromUrl.grimoireId] ? fromUrl.grimoireId : fallback;
        setSelection({ ...fromUrl, grimoireId });
        initialisedRef.current = true;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load scribing data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, options.defaultGrimoire]);

  const grimoires = useMemo<Grimoire[]>(() => (data ? Object.values(data.grimoires) : []), [data]);

  const selectedGrimoire = useMemo<Grimoire | null>(
    () => (data && selection.grimoireId ? (data.grimoires[selection.grimoireId] ?? null) : null),
    [data, selection.grimoireId],
  );

  const compatible = useMemo<CompatibleScripts>(
    () =>
      data && selection.grimoireId
        ? getCompatibleScripts(data, selection.grimoireId)
        : EMPTY_COMPATIBLE,
    [data, selection.grimoireId],
  );

  const result = useMemo<ScribedSkillResult | null>(
    () => (data && selection.grimoireId ? deriveScribedSkill(data, selection) : null),
    [data, selection],
  );

  // Mirror the selection to the URL (after the first load settles).
  useEffect(() => {
    if (!initialisedRef.current || typeof window === 'undefined' || !selection.grimoireId) return;
    const params = new URLSearchParams(window.location.search);
    params.set('grimoire', selection.grimoireId);
    const setOrDelete = (key: string, value?: string): void => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    setOrDelete('focus', selection.focusId);
    setOrDelete('signature', selection.signatureId);
    setOrDelete('affix', selection.affixId);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', next);
  }, [selection]);

  // Changing the grimoire drops any scripts it doesn't support.
  const setGrimoire = useCallback(
    (id: string) => {
      setSelection((prev) => {
        if (prev.grimoireId === id) return prev;
        if (!data) return { grimoireId: id };
        const next = getCompatibleScripts(data, id);
        const keep = (scriptId: string | undefined, list: { id: string }[]): string | undefined =>
          scriptId && list.some((s) => s.id === scriptId) ? scriptId : undefined;
        return {
          grimoireId: id,
          focusId: keep(prev.focusId, next.focusScripts),
          signatureId: keep(prev.signatureId, next.signatureScripts),
          affixId: keep(prev.affixId, next.affixScripts),
        };
      });
    },
    [data],
  );

  const setFocus = useCallback((id: string | undefined) => {
    setSelection((prev) => ({ ...prev, focusId: id }));
  }, []);
  const setSignature = useCallback((id: string | undefined) => {
    setSelection((prev) => ({ ...prev, signatureId: id }));
  }, []);
  const setAffix = useCallback((id: string | undefined) => {
    setSelection((prev) => ({ ...prev, affixId: id }));
  }, []);

  const reset = useCallback(() => {
    setSelection((prev) => ({ grimoireId: prev.grimoireId }));
  }, []);

  const randomize = useCallback(() => {
    if (!data) return;
    const grimoire = pickRandom(Object.values(data.grimoires));
    if (!grimoire) return;
    const next = getCompatibleScripts(data, grimoire.id);
    setSelection({
      grimoireId: grimoire.id,
      focusId: pickRandom(next.focusScripts)?.id,
      signatureId: pickRandom(next.signatureScripts)?.id,
      affixId: pickRandom(next.affixScripts)?.id,
    });
    logger.info('Randomised scribing selection', { grimoire: grimoire.id });
  }, [data, logger]);

  const shareUrl = useMemo<string>(() => {
    if (typeof window === 'undefined' || !selection.grimoireId) return '';
    const params = new URLSearchParams();
    params.set('grimoire', selection.grimoireId);
    if (selection.focusId) params.set('focus', selection.focusId);
    if (selection.signatureId) params.set('signature', selection.signatureId);
    if (selection.affixId) params.set('affix', selection.affixId);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [selection]);

  const summary = useMemo<string>(() => (result ? summarizeScribedSkill(result) : ''), [result]);

  const isReady = !isLoading && !error && grimoires.length > 0;

  return {
    isLoading,
    error,
    isReady,
    grimoires,
    selection,
    selectedGrimoire,
    compatible,
    result,
    setGrimoire,
    setFocus,
    setSignature,
    setAffix,
    reset,
    randomize,
    shareUrl,
    summary,
  };
}
