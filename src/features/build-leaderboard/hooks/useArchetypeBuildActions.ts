/**
 * "Save copy & open editor" / "Save to My Builds" for an archetype.
 *
 * Both go through the same path — convert the cluster's medoid parse into a
 * `Build`, save it, then optionally navigate. The editor loads builds by
 * `?id=<savedBuildId>` (see MyBuildsPage / PublicProfilePage); there is no
 * router-state handoff to piggyback on, so saving first is what makes the link
 * work at all.
 *
 * The medoid is a REAL observed parse, so what opens is a build someone actually
 * played — not a synthetic average of the cluster.
 */

import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { saveBuild } from '../../../store/saved_builds/savedBuildsSlice';
import type { GearTrait, GearType, PlayerTalent } from '../../../types/playerDetails';
import { playerToBuild, type PlayerBuildExtractionGear } from '../../../utils/playerToBuild';
import type { Build } from '../../build-editor/types/build.types';
import { dpsParsesApi } from '../api/dpsParsesApi';
import type { BuildCluster } from '../types/clustering.types';
import type { DpsParseBuildResponse } from '../types/dpsParses.types';

/**
 * Map the stored combatant payload onto the shape `playerToBuild` consumes.
 *
 * Two fields are absent upstream:
 *  - `type` (GearType): not returned. convertGear is called with
 *    `resolveWeaponType`, so it infers weapon types from the item itself.
 *  - `quality`: the API's `quality` field is a bar designation
 *    ("primary"/"backup"), NOT an item tier — deliberately not forwarded.
 */
export function toBuildExtractionData(
  response: DpsParseBuildResponse,
): Parameters<typeof playerToBuild>[0] {
  const gear: PlayerBuildExtractionGear[] = response.combatant.gear.map((piece) => ({
    id: piece.itemId,
    slot: piece.slot,
    icon: piece.icon ?? '',
    name: piece.name,
    championPoints: piece.cp ?? 160,
    trait: (piece.trait ?? 0) as GearTrait,
    enchantType: piece.enchantType ?? 0,
    enchantQuality: piece.enchantQuality ?? 0,
    setID: piece.setId,
    type: 0 as GearType,
    setName: response.combatant.sets.find((set) => set.setId === piece.setId)?.name,
  }));

  const talents: PlayerTalent[] = response.combatant.talents.map((talent) => ({
    name: talent.name ?? '',
    guid: talent.abilityId,
    type: 0,
    abilityIcon: talent.icon ?? '',
    flags: 0,
  }));

  return {
    playerName: response.playerName,
    gear,
    talents,
    // Neither is returned by characterRankings; the build simply has no mundus or
    // CP data, which the UI already communicates via `build.missing`.
    mundusBuffs: [],
    championPoints: [],
  };
}

/** Which action is in flight, so the UI can label and disable accurately. */
export interface PendingArchetypeAction {
  clusterId: string;
  kind: 'open' | 'save';
}

export interface UseArchetypeBuildActionsResult {
  /**
   * The action currently in flight, if any.
   *
   * Carries the kind as well as the id: a single boolean made "Save to My
   * Builds" render the primary button as the opening action, and left Save clickable
   * during its own request so a double click saved the build twice.
   */
  pendingAction: PendingArchetypeAction | null;
  openInEditor: (cluster: BuildCluster) => Promise<void>;
  saveToMyBuilds: (cluster: BuildCluster) => Promise<void>;
}

export function useArchetypeBuildActions(): UseArchetypeBuildActionsResult {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [pendingAction, setPendingAction] = useState<PendingArchetypeAction | null>(null);
  const mountedRef = useRef(true);
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // StrictMode replays effects during development. Re-arm the lifecycle guard
    // on setup so the replayed hook remains usable after its first cleanup.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
    };
  }, []);

  const buildFor = useCallback(
    // Resolves with a saved build, returns null after cancellation, or throws.
    async (
      cluster: BuildCluster,
      signal: AbortSignal,
    ): Promise<{ build: Build; savedId: string } | null> => {
      const response = await dpsParsesApi.getBuild(cluster.medoidParseId, signal);
      if (!mountedRef.current || signal.aborted) return null;
      const build = playerToBuild(toBuildExtractionData(response));
      build.name = cluster.label;
      build.shortDescription = `Observed sampled archetype — ${cluster.size} sampled top-ranked ${
        cluster.size === 1 ? 'parse shares' : 'parses share'
      } this pattern.`;

      // saveBuild generates the id in its `prepare`, so build the action first and
      // read the id off it, then dispatch. Reading it off the dispatch RESULT
      // would need a cast, since middleware is free to change that return type.
      const action = saveBuild(build);
      if (!mountedRef.current || signal.aborted) return null;
      dispatch(action);
      return { build, savedId: action.payload.id };
    },
    [dispatch],
  );

  const openInEditor = useCallback(
    async (cluster: BuildCluster) => {
      // Ignore a repeat click while anything is already running, rather than
      // firing a second fetch-and-save for the same build.
      if (pendingAction || activeControllerRef.current || !mountedRef.current) return;
      const controller = new AbortController();
      activeControllerRef.current = controller;
      setPendingAction({ clusterId: cluster.id, kind: 'open' });
      try {
        const result = await buildFor(cluster, controller.signal);
        if (!result || !mountedRef.current || controller.signal.aborted) return;
        const { savedId } = result;
        navigate(`/build-editor?id=${savedId}`);
      } catch (err) {
        if (!mountedRef.current || controller.signal.aborted) return;
        enqueueSnackbar(err instanceof Error ? err.message : 'Could not load that build', {
          variant: 'error',
        });
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
          if (mountedRef.current) setPendingAction(null);
        }
      }
    },
    [buildFor, navigate, enqueueSnackbar, pendingAction],
  );

  const saveToMyBuilds = useCallback(
    async (cluster: BuildCluster) => {
      if (pendingAction || activeControllerRef.current || !mountedRef.current) return;
      const controller = new AbortController();
      activeControllerRef.current = controller;
      setPendingAction({ clusterId: cluster.id, kind: 'save' });
      try {
        const result = await buildFor(cluster, controller.signal);
        if (!result || !mountedRef.current || controller.signal.aborted) return;
        enqueueSnackbar(`Saved “${cluster.label}” to My Builds`, { variant: 'success' });
      } catch (err) {
        if (!mountedRef.current || controller.signal.aborted) return;
        enqueueSnackbar(err instanceof Error ? err.message : 'Could not save that build', {
          variant: 'error',
        });
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
          if (mountedRef.current) setPendingAction(null);
        }
      }
    },
    [buildFor, enqueueSnackbar, pendingAction],
  );

  return { pendingAction, openInEditor, saveToMyBuilds };
}
