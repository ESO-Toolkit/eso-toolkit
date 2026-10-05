import { useEffect, useMemo, useState } from 'react';

import { getBaseUrl } from '../../../utils/envUtils';
import type { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';
import {
  buildDraftModelOverrides,
  parseDraftModelManifest,
  type DraftModelManifest,
} from '../utils/draftReplayModels';
import { resolveReplayModelUrl } from '../utils/replayActorModelRegistry';

type DraftLoadState =
  | { status: 'idle' | 'loading' | 'error'; manifest?: never }
  | { status: 'ready'; manifest: DraftModelManifest };

/** Drafts are fetched only for an explicitly enabled recorded-fight preview. */
export function useDraftReplayModels(
  enabled: boolean,
  lookup: TimestampPositionLookup | null,
): { overrides: ReturnType<typeof buildDraftModelOverrides>; status: DraftLoadState['status'] } {
  const [state, setState] = useState<DraftLoadState>({ status: 'idle' });

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading' });
    void fetch(resolveReplayModelUrl('replay-model-drafts/manifest.json', getBaseUrl()), {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Draft models could not be loaded.');
        return parseDraftModelManifest(await response.json());
      })
      .then((manifest) => {
        if (!controller.signal.aborted) setState({ status: 'ready', manifest });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });
    return () => controller.abort();
  }, [enabled]);

  const overrides = useMemo(
    () =>
      buildDraftModelOverrides(
        lookup,
        enabled && state.status === 'ready' ? state.manifest.entries : [],
      ),
    [enabled, lookup, state],
  );
  return { overrides, status: enabled ? state.status : 'idle' };
}
