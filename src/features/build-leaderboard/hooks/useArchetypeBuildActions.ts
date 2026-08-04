/**
 * "Open in Build Editor" / "Save to My Builds" for an archetype.
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
import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { saveBuild } from '../../../store/saved_builds/savedBuildsSlice';
import type { GearTrait, GearType, PlayerGear, PlayerTalent } from '../../../types/playerDetails';
import type { ItemQuality } from '../../../utils/gearUtilities';
import { playerToBuild } from '../../../utils/playerToBuild';
import type { Build } from '../../build-editor/types/build.types';
import { dpsParsesApi } from '../api/dpsParsesApi';
import type { BuildCluster } from '../types/clustering.types';
import type { DpsParseBuildResponse } from '../types/dpsParses.types';

/**
 * `characterRankings` reports enchant quality but not item quality; every top
 * parse is gold in practice, and this only affects display.
 */
const ASSUMED_ITEM_QUALITY = 5;

/**
 * Map the stored combatant payload onto the shape `playerToBuild` consumes.
 *
 * Two fields are absent upstream and defaulted here:
 *  - `type` (GearType): not returned. convertGear is called with
 *    `resolveWeaponType`, so it infers weapon types from the item itself.
 *  - `quality`: the API's `quality` field is a bar designation
 *    ("primary"/"backup"), NOT an item tier — deliberately not forwarded.
 */
function toExtractionData(response: DpsParseBuildResponse): Parameters<typeof playerToBuild>[0] {
  const gear: PlayerGear[] = response.combatant.gear.map((piece) => ({
    id: piece.itemId,
    slot: piece.slot,
    quality: ASSUMED_ITEM_QUALITY as ItemQuality,
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

export interface UseArchetypeBuildActionsResult {
  /** Cluster id whose fetch is in flight, for button busy state. */
  pendingClusterId: string | null;
  openInEditor: (cluster: BuildCluster) => Promise<void>;
  saveToMyBuilds: (cluster: BuildCluster) => Promise<void>;
}

export function useArchetypeBuildActions(): UseArchetypeBuildActionsResult {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [pendingClusterId, setPendingClusterId] = useState<string | null>(null);

  const buildFor = useCallback(
    async (cluster: BuildCluster): Promise<{ build: Build; savedId: string } | null> => {
      const response = await dpsParsesApi.getBuild(cluster.medoidParseId);
      const build = playerToBuild(toExtractionData(response));
      build.name = cluster.label;
      build.shortDescription = `Top-parse archetype — ${cluster.size} of the fastest logs run this.`;

      // saveBuild generates the id in its `prepare`, so build the action first and
      // read the id off it, then dispatch. Reading it off the dispatch RESULT
      // would need a cast, since middleware is free to change that return type.
      const action = saveBuild(build);
      dispatch(action);
      return { build, savedId: action.payload.id };
    },
    [dispatch],
  );

  const openInEditor = useCallback(
    async (cluster: BuildCluster) => {
      setPendingClusterId(cluster.id);
      try {
        const result = await buildFor(cluster);
        if (!result) return;
        navigate(`/build-editor?id=${result.savedId}`);
      } catch (err) {
        enqueueSnackbar(err instanceof Error ? err.message : 'Could not load that build', {
          variant: 'error',
        });
      } finally {
        setPendingClusterId(null);
      }
    },
    [buildFor, navigate, enqueueSnackbar],
  );

  const saveToMyBuilds = useCallback(
    async (cluster: BuildCluster) => {
      setPendingClusterId(cluster.id);
      try {
        await buildFor(cluster);
        enqueueSnackbar(`Saved “${cluster.label}” to My Builds`, { variant: 'success' });
      } catch (err) {
        enqueueSnackbar(err instanceof Error ? err.message : 'Could not save that build', {
          variant: 'error',
        });
      } finally {
        setPendingClusterId(null);
      }
    },
    [buildFor, enqueueSnackbar],
  );

  return { pendingClusterId, openInEditor, saveToMyBuilds };
}
