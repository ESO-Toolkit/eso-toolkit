import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { useCombatantInfoEvents, useDebuffEvents, usePlayerData } from '../../../hooks';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import { KnownAbilities, KnownSetIDs, PenetrationValues } from '../../../types/abilities';
import {
  DebuffEvent,
  CombatantInfoEvent,
  CombatantGear,
  CombatantAura,
} from '../../../types/combatlogEvents';
import { getSetCount } from '../../../utils/gearUtilities';

import {
  PlayerPenetrationData,
  PlayerPenetrationDetailsView,
} from './PlayerPenetrationDetailsView';

// Configuration for all penetration effects
interface PenetrationEffect {
  abilityId: number;
  penetrationValue: number;
  abilityNames: string[];
}

const PENETRATION_EFFECTS: PenetrationEffect[] = [
  {
    abilityId: KnownAbilities.MAJOR_BREACH,
    penetrationValue: PenetrationValues.MAJOR_BREACH,
    abilityNames: ['Major Breach'],
  },
  {
    abilityId: KnownAbilities.MINOR_BREACH,
    penetrationValue: PenetrationValues.MINOR_BREACH,
    abilityNames: ['Minor Breach'],
  },
  {
    abilityId: KnownAbilities.CRUSHER_ENCHANT,
    penetrationValue: PenetrationValues.CRUSHER_ENCHANT,
    abilityNames: ['Crusher', 'Glyph of Crushing'],
  },
  {
    abilityId: KnownAbilities.RUNIC_SUNDER,
    penetrationValue: PenetrationValues.RUNIC_SUNDER,
    abilityNames: ['Runic Sunder'],
  },
  {
    abilityId: KnownAbilities.TREMORSCALE,
    penetrationValue: PenetrationValues.TREMORSCALE,
    abilityNames: ['Tremorscale', 'Stony Carapace'],
  },
  {
    abilityId: KnownAbilities.CRIMSON_OATH,
    penetrationValue: PenetrationValues.CRIMSON_OATH,
    abilityNames: ['Crimson Oath', "Crimson Oath's Rive"],
  },
  {
    abilityId: KnownAbilities.ROAR_OF_ALKOSH,
    penetrationValue: PenetrationValues.ROAR_OF_ALKOSH,
    abilityNames: ['Roar of Alkosh', 'Line Breaker'],
  },
];

// Herald of the Tome abilities for Splintered Secrets passive
const HERALD_ABILITIES = [
  KnownAbilities.CEPHALIARCHS_FLAIL,
  KnownAbilities.PRAGMATIC_FATECARVER,
  KnownAbilities.INSPIRED_SCHOLARSHIP,
  KnownAbilities.THE_LANGUID_EYE,
  KnownAbilities.WRITHING_RUNEBLADES,
  KnownAbilities.TENTACULAR_DREAD,
  KnownAbilities.FULMINATING_RUNE,
  KnownAbilities.RECUPERATIVE_TREATISE,
];

interface PenetrationDataPoint {
  timestamp: number;
  penetration: number;
  relativeTime: number; // Time since fight start in seconds
}

interface PenetrationSource {
  name: string;
  value: number;
  wasActive: boolean;
  description: string;
  link?: string; // Optional external link for detailed analysis
}

interface PlayerPenetrationDetailsProps {
  id: string;
  name: string;
  fight: FightFragment;
  player: PlayerDetailsWithRole;
  expanded?: boolean;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const PlayerPenetrationDetails: React.FC<PlayerPenetrationDetailsProps> = ({
  id,
  name,
  fight,
  player,
  expanded = false,
  onExpandChange,
}) => {
  // SIMPLIFIED: Use basic selectors directly instead of complex object-creating selectors
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { playerData, isPlayerDataLoading } = usePlayerData();

  const isLoading = isDebuffEventsLoading || isCombatantInfoEventsLoading || isPlayerDataLoading;

  const { reportId, fightId } = useSelectedReportAndFight();
  const selectedTargetId = useSelector(selectSelectedTargetId);

  // State for computed data
  const [penetrationSources, setPenetrationSources] = React.useState<PenetrationSource[]>([]);

  // Helper function to check if an ability matches any penetration effect
  const matchesPenetrationEffect = React.useCallback((event: DebuffEvent): boolean => {
    return PENETRATION_EFFECTS.some((effect) => event.abilityGameID === effect.abilityId);
  }, []);

  // Helper function to find which penetration effect matches an event
  const findPenetrationEffect = React.useCallback(
    (event: DebuffEvent): PenetrationEffect | undefined => {
      return PENETRATION_EFFECTS.find((effect) => effect.abilityId === event.abilityGameID);
    },
    []
  );

  // Memoize filtered debuff events for the selected target
  const targetDebuffEvents = React.useMemo(() => {
    if (!selectedTargetId || !debuffEvents.length) return [];

    return debuffEvents
      .filter((event: DebuffEvent) => {
        return (
          (event.type === 'applydebuff' || event.type === 'removedebuff') &&
          String(event.targetID) === selectedTargetId &&
          matchesPenetrationEffect(event)
        );
      })
      .sort((a: DebuffEvent, b: DebuffEvent) => a.timestamp - b.timestamp);
  }, [debuffEvents, selectedTargetId, matchesPenetrationEffect]);

  // Calculate base penetration for this specific player
  const playerBasePenetration = React.useMemo(() => {
    if (!combatantInfoEvents.length || !selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return 0;
    }

    // Get player data from eventPlayers for talents and find combatantinfo auras
    const player = playerData?.playersById[id];
    const talents = player?.combatantInfo?.talents ?? [];

    // Find the combatantinfo event for this player in this specific fight
    const combatantInfoEvent = combatantInfoEvents.find(
      (event) => String(event.sourceID) === id && event.fight === fight.id
    );

    const latestData = combatantInfoEvent;
    const latestGear = latestData?.gear;
    const latestAuras = latestData?.auras ?? [];

    if (!latestData) return 0;

    let basePenetration = 0;

    // Check Velothi Ur-Mage's Amulet buff from player auras
    const hasVelothiAmulet = latestAuras.some(
      (aura: CombatantAura) => aura.ability === KnownAbilities.VELOTHI_UR_MAGE_BUFF
    );

    // Add Velothi Ur-Mage's Amulet
    if (hasVelothiAmulet) {
      basePenetration += PenetrationValues.VELOTHI_UR_MAGE_AMULET;
    }

    // Check Concentration passive from player auras
    const hasConcentration = latestAuras.some(
      (aura: CombatantAura) =>
        aura.ability === KnownAbilities.CONCENTRATION || aura.name?.includes('Concentration')
    );

    const lightArmorCount = hasConcentration
      ? latestGear?.filter((gear: CombatantGear) => gear.type === 1).length || 0
      : 0;
    const concentrationPenetration = lightArmorCount * PenetrationValues.CONCENTRATION_PER_PIECE;

    // Add Concentration passive
    basePenetration += concentrationPenetration;

    // Check Splintered Secrets buff stacks from player auras
    const splinteredSecretsAuras = latestAuras.filter(
      (aura: CombatantAura) =>
        aura.ability === KnownAbilities.SPLINTERED_SECRETS ||
        aura.ability === 184885 || // Alternative Splintered Secrets ID
        aura.name?.includes('Splintered Secrets')
    );

    // Assume 2 stacks because I don't know how to track this
    const totalSplinteredSecretsStacks = splinteredSecretsAuras.length > 0 ? 2 : 0;

    const slottedHeraldAbilities =
      totalSplinteredSecretsStacks > 0
        ? talents.filter((talent: { guid: number }) => HERALD_ABILITIES.includes(talent.guid))
            .length
        : 0;
    const splinteredSecretsPenetration =
      totalSplinteredSecretsStacks *
      slottedHeraldAbilities *
      PenetrationValues.SPLINTERED_SECRETS_PER_ABILITY;

    // Add Splintered Secrets
    basePenetration += splinteredSecretsPenetration;

    // Check Ansuul's Torment 4-piece set bonus
    const ansuulsGearCount =
      latestGear?.filter((gear: CombatantGear) => gear.setID === KnownSetIDs.ANSUULS_TORMENT_SET)
        .length || 0;
    const hasAnsuulsTorment4Piece = ansuulsGearCount >= 4;
    const ansuulsPenetration = hasAnsuulsTorment4Piece
      ? PenetrationValues.ANSUULS_TORMENT_4_PIECE
      : 0;

    // Add Ansuul's Torment 4-piece
    basePenetration += ansuulsPenetration;

    // Check Tide-born Wildstalker 4-piece set bonus
    const tidebornGearCount = getSetCount(latestGear, KnownSetIDs.TIDEBORN_WILDSTALKER_SET);
    const hasTidebornWildstalker4Piece = tidebornGearCount >= 4;
    const tidebornPenetration = hasTidebornWildstalker4Piece
      ? PenetrationValues.TIDEBORN_WILDSTALKER_4_PIECE
      : 0;

    // Add Tide-born Wildstalker 4-piece
    basePenetration += tidebornPenetration;

    return basePenetration;
  }, [combatantInfoEvents, selectedTargetId, fight, id, playerData]);

  // Compute penetration data for this specific player
  const penetrationData = React.useMemo(() => {
    if (!combatantInfoEvents.length || !selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return;
    }

    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;

    // Analyze penetration sources for this player
    const sources: PenetrationSource[] = [];

    // Get player data from eventPlayers for talents and find combatantinfo auras
    const player = playerData?.playersById[id];
    const talents = player?.combatantInfo?.talents ?? [];

    // Find the combatantinfo event for this player in this specific fight
    const combatantInfoEvent = combatantInfoEvents.find(
      (event: CombatantInfoEvent) =>
        event.type === 'combatantinfo' &&
        String(event.sourceID) === id &&
        'fight' in event &&
        event.fight === fight.id
    );

    const latestData = combatantInfoEvent;
    const latestGear = latestData?.gear;
    const latestAuras = latestData?.auras ?? [];

    // Check Velothi Ur-Mage's Amulet buff from player auras
    const hasVelothiAmulet = latestAuras.some(
      (aura: CombatantAura) =>
        aura.ability === KnownAbilities.VELOTHI_UR_MAGE_BUFF ||
        aura.name?.includes("Velothi Ur-Mage's Amulet")
    );

    sources.push({
      name: "Velothi Ur-Mage's Amulet",
      value: PenetrationValues.VELOTHI_UR_MAGE_AMULET,
      wasActive: hasVelothiAmulet,
      description: hasVelothiAmulet
        ? 'Mythic amulet buff providing flat penetration (detected)'
        : `Mythic amulet buff not detected.`,
    });

    // Check Concentration passive from player auras
    const hasConcentration = latestAuras.some(
      (aura: CombatantAura) =>
        aura.ability === KnownAbilities.CONCENTRATION || aura.name?.includes('Concentration')
    );

    const lightArmorCount = hasConcentration
      ? latestGear?.filter((gear: CombatantGear) => gear.type === 1).length || 0
      : 0;
    const concentrationPenetration = lightArmorCount * PenetrationValues.CONCENTRATION_PER_PIECE;

    sources.push({
      name: 'Concentration (Light Armor)',
      value: concentrationPenetration,
      wasActive: concentrationPenetration > 0,
      description: `939 penetration per light armor piece worn (${lightArmorCount} pieces)`,
    });

    // Check Splintered Secrets buff stacks from player auras
    const splinteredSecretsAuras = latestAuras.filter(
      (aura: CombatantAura) =>
        aura.ability === KnownAbilities.SPLINTERED_SECRETS ||
        aura.ability === 184885 || // Alternative Splintered Secrets ID
        aura.name?.includes('Splintered Secrets')
    );

    // const totalSplinteredSecretsStacks = splinteredSecretsAuras.reduce(
    //   (total, aura) => total + (aura.stacks || 1),
    //   0
    // );
    // Assume 2 stacks because I don't know how to track this
    const totalSplinteredSecretsStacks = splinteredSecretsAuras.length > 0 ? 2 : 0;

    const slottedHeraldAbilities =
      totalSplinteredSecretsStacks > 0
        ? talents.filter((talent: { guid: number }) => HERALD_ABILITIES.includes(talent.guid))
            .length
        : 0;
    const splinteredSecretsPenetration =
      totalSplinteredSecretsStacks *
      slottedHeraldAbilities *
      PenetrationValues.SPLINTERED_SECRETS_PER_ABILITY;

    sources.push({
      name: 'Splintered Secrets (Herald of the Tome)',
      value: splinteredSecretsPenetration,
      wasActive: splinteredSecretsPenetration > 0,
      description: `620 penetration per stack per Herald ability slotted (${totalSplinteredSecretsStacks} stacks × ${slottedHeraldAbilities} abilities)`,
    });

    // Check Ansuul's Torment 4-piece set bonus
    const ansuulsGearCount =
      latestGear?.filter((gear: CombatantGear) => gear.setID === KnownSetIDs.ANSUULS_TORMENT_SET)
        .length || 0;
    const hasAnsuulsTorment4Piece = ansuulsGearCount >= 4;
    const ansuulsPenetration = hasAnsuulsTorment4Piece
      ? PenetrationValues.ANSUULS_TORMENT_4_PIECE
      : 0;

    sources.push({
      name: "Ansuul's Torment (4-piece)",
      value: ansuulsPenetration,
      wasActive: hasAnsuulsTorment4Piece,
      description: hasAnsuulsTorment4Piece
        ? `4-piece set bonus providing 1487 penetration (${ansuulsGearCount} pieces equipped)`
        : `4-piece set bonus not active (${ansuulsGearCount} pieces equipped)`,
    });

    // Check Tide-born Wildstalker 4-piece set bonus
    const tidebornGearCount =
      latestGear?.filter(
        (gear: CombatantGear) => gear.setID === KnownSetIDs.TIDEBORN_WILDSTALKER_SET
      ).length || 0;
    const hasTidebornWildstalker4Piece = tidebornGearCount >= 4;
    const tidebornPenetration = hasTidebornWildstalker4Piece
      ? PenetrationValues.TIDEBORN_WILDSTALKER_4_PIECE
      : 0;

    sources.push({
      name: 'Tide-born Wildstalker (4-piece)',
      value: tidebornPenetration,
      wasActive: hasTidebornWildstalker4Piece,
      description: hasTidebornWildstalker4Piece
        ? `4-piece set bonus providing 1487 penetration (${tidebornGearCount} pieces equipped)`
        : `4-piece set bonus not active (${tidebornGearCount} pieces equipped)`,
    });

    // Check debuff-based sources (optimized to filter once)
    const debuffApplications = new Map<number, number>();
    debuffEvents.forEach((buffEvent: DebuffEvent) => {
      if (buffEvent.type === 'applydebuff' && String(buffEvent.targetID) === selectedTargetId) {
        const effect = findPenetrationEffect(buffEvent);
        if (effect) {
          debuffApplications.set(
            effect.abilityId,
            (debuffApplications.get(effect.abilityId) || 0) + 1
          );
        }
      }
    });

    PENETRATION_EFFECTS.forEach((effect) => {
      const instanceCount = debuffApplications.get(effect.abilityId) || 0;
      const wasActive = instanceCount > 0;

      // Create external link for debuffs if reportId and selectedTargetId are available
      let externalLink: string | undefined;
      if (
        reportId &&
        selectedTargetId &&
        (effect.abilityId === KnownAbilities.MAJOR_BREACH ||
          effect.abilityId === KnownAbilities.MINOR_BREACH ||
          effect.abilityId === KnownAbilities.CRUSHER_ENCHANT ||
          effect.abilityId === KnownAbilities.RUNIC_SUNDER)
      ) {
        externalLink = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&spells=debuffs&hostility=1&ability=${effect.abilityId}&source=${selectedTargetId}`;
      }

      sources.push({
        name: effect.abilityNames[0],
        value: effect.penetrationValue,
        wasActive: wasActive,
        description: wasActive
          ? `Debuff reducing target's resistance`
          : `Debuff reducing target's resistance (not applied during fight)`,
        link: externalLink,
      });
    });

    setPenetrationSources(sources);

    // Create timeline data points
    const dataPoints: PenetrationDataPoint[] = [];
    let currentPenetration = playerBasePenetration;
    const activeDebuffs = new Set<number>();

    // Add initial data point
    dataPoints.push({
      timestamp: fightStart,
      penetration: currentPenetration,
      relativeTime: 0,
    });

    // Process debuff events to track penetration changes over time
    // Use pre-computed and memoized debuff events for better performance
    targetDebuffEvents.forEach((buffEvent: DebuffEvent) => {
      const effect = findPenetrationEffect(buffEvent);
      if (!effect) return;

      if (buffEvent.type === 'applydebuff') {
        if (!activeDebuffs.has(effect.abilityId)) {
          activeDebuffs.add(effect.abilityId);
          currentPenetration += effect.penetrationValue;
        }
      } else if (buffEvent.type === 'removedebuff') {
        if (activeDebuffs.has(effect.abilityId)) {
          activeDebuffs.delete(effect.abilityId);
          currentPenetration -= effect.penetrationValue;
        }
      }

      dataPoints.push({
        timestamp: buffEvent.timestamp as number,
        penetration: currentPenetration,
        relativeTime: ((buffEvent.timestamp as number) - fightStart) / 1000,
      });
    });

    // Add final data point
    if (dataPoints[dataPoints.length - 1]?.timestamp !== fightEnd) {
      dataPoints.push({
        timestamp: fightEnd,
        penetration: currentPenetration,
        relativeTime: (fightEnd - fightStart) / 1000,
      });
    }

    // Voxelize data points - sample every 1 second and take highest value in each voxel
    const voxelizeDataPoints = (
      points: PenetrationDataPoint[],
      voxelSizeSeconds = 1
    ): PenetrationDataPoint[] => {
      if (points.length === 0) return points;

      const fightDurationSeconds = (fightEnd - fightStart) / 1000;
      const numVoxels = Math.ceil(fightDurationSeconds / voxelSizeSeconds);
      const voxelizedPoints: PenetrationDataPoint[] = [];

      for (let i = 0; i < numVoxels; i++) {
        const voxelStartTime = i * voxelSizeSeconds;
        const voxelEndTime = (i + 1) * voxelSizeSeconds;

        // Find all points that fall within this voxel
        const pointsInVoxel = points.filter(
          (point) => point.relativeTime >= voxelStartTime && point.relativeTime < voxelEndTime
        );

        if (pointsInVoxel.length > 0) {
          // Find the point with the highest penetration value in this voxel
          const maxPoint = pointsInVoxel.reduce((max, current) =>
            current.penetration > max.penetration ? current : max
          );

          // Create a new point at the center of the voxel with the max penetration
          voxelizedPoints.push({
            timestamp: fightStart + (voxelStartTime + voxelSizeSeconds / 2) * 1000,
            penetration: maxPoint.penetration,
            relativeTime: voxelStartTime + voxelSizeSeconds / 2,
          });
        } else if (voxelizedPoints.length > 0) {
          // If no points in this voxel, carry forward the last known value
          const lastPoint = voxelizedPoints[voxelizedPoints.length - 1];
          voxelizedPoints.push({
            timestamp: fightStart + (voxelStartTime + voxelSizeSeconds / 2) * 1000,
            penetration: lastPoint.penetration,
            relativeTime: voxelStartTime + voxelSizeSeconds / 2,
          });
        } else {
          // First voxel with no points, use base penetration
          voxelizedPoints.push({
            timestamp: fightStart + (voxelStartTime + voxelSizeSeconds / 2) * 1000,
            penetration: playerBasePenetration,
            relativeTime: voxelStartTime + voxelSizeSeconds / 2,
          });
        }
      }

      return voxelizedPoints;
    };

    const voxelizedDataPoints = voxelizeDataPoints(dataPoints);

    const playerPenetrationData: PlayerPenetrationData = {
      playerId: id,
      playerName: name,
      dataPoints: voxelizedDataPoints,
      max: Math.max(
        ...voxelizedDataPoints.map((point: PenetrationDataPoint) => point.penetration),
        0
      ),
      effective:
        voxelizedDataPoints.reduce((acc, cv) => acc + cv.penetration, 0) /
        voxelizedDataPoints.length,
    };

    return playerPenetrationData;
  }, [
    id,
    name,
    combatantInfoEvents,
    debuffEvents,
    targetDebuffEvents,
    fight,
    selectedTargetId,
    reportId,
    fightId,
    findPenetrationEffect,
    playerData,
    playerBasePenetration,
  ]);

  if (!penetrationData) {
    return (
      <PlayerPenetrationDetailsView
        id={id}
        name={name}
        expanded={expanded}
        isLoading={isLoading}
        player={player}
        penetrationData={null}
        penetrationSources={[]}
        playerBasePenetration={0}
        fightDurationSeconds={(fight.endTime - fight.startTime) / 1000}
        onExpandChange={onExpandChange}
      />
    );
  }

  return (
    <PlayerPenetrationDetailsView
      id={id}
      name={name}
      expanded={expanded}
      isLoading={isLoading}
      penetrationData={penetrationData}
      player={player}
      penetrationSources={penetrationSources}
      playerBasePenetration={playerBasePenetration}
      fightDurationSeconds={(fight.endTime - fight.startTime) / 1000}
      onExpandChange={onExpandChange}
    />
  );
};
