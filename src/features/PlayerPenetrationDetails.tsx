import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LaunchIcon from '@mui/icons-material/Launch';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Link,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React from 'react';
import { Line } from 'react-chartjs-2';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { FightFragment } from '../graphql/generated';
import { RootState } from '../store/storeWithHistory';
import { KnownAbilities, KnownSetIDs, PenetrationValues } from '../types/abilities';
import { CombatantInfoEvent, CombatantGear } from '../types/combatantinfo-event';
import { EventType, BuffEvent } from '../types/combatlogEvents';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  annotationPlugin
);

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

interface PlayerPenetrationData {
  playerId: string;
  playerName: string;
  dataPoints: PenetrationDataPoint[];
  finalPenetration: number;
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
  reportId?: string;
  fightId?: number;
  expanded?: boolean;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

const PlayerPenetrationDetails: React.FC<PlayerPenetrationDetailsProps> = ({
  id,
  name,
  fight,
  reportId,
  fightId,
  expanded = false,
  onExpandChange,
}) => {
  const events = useSelector((state: RootState) => state.events.events);
  const eventPlayers = useSelector((state: RootState) => state.events.players);
  const [searchParams] = useSearchParams();

  // Get selected target from URL params
  const selectedTargetId = searchParams.get('target') || '';

  // State for computed data
  const [penetrationSources, setPenetrationSources] = React.useState<PenetrationSource[]>([]);

  // Helper function to check if an ability matches any penetration effect
  const matchesPenetrationEffect = React.useCallback((event: BuffEvent): boolean => {
    return PENETRATION_EFFECTS.some((effect) => event.abilityGameID === effect.abilityId);
  }, []);

  // Helper function to find which penetration effect matches an event
  const findPenetrationEffect = React.useCallback(
    (event: BuffEvent): PenetrationEffect | undefined => {
      return PENETRATION_EFFECTS.find((effect) => effect.abilityId === event.abilityGameID);
    },
    []
  );

  // Memoize expensive computations
  const fightEvents = React.useMemo(() => {
    if (!events || !fight?.startTime || !fight?.endTime) return [];

    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;

    // Pre-filter events once for the fight timeframe
    return (events as EventType[]).filter(
      (event: EventType) => event.timestamp >= fightStart && event.timestamp <= fightEnd
    );
  }, [events, fight?.startTime, fight?.endTime]);

  // Memoize filtered debuff events for the selected target
  const targetDebuffEvents = React.useMemo(() => {
    if (!selectedTargetId || !fightEvents.length) return [];

    return fightEvents
      .filter((event) => {
        return (
          (event.type === 'applydebuff' || event.type === 'removedebuff') &&
          String(event.targetID ?? event.target ?? '') === selectedTargetId &&
          matchesPenetrationEffect(event as BuffEvent)
        );
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [fightEvents, selectedTargetId, matchesPenetrationEffect]);

  // Calculate base penetration for this specific player
  const playerBasePenetration = React.useMemo(() => {
    if (!fightEvents.length || !selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return 0;
    }

    // Get player data from eventPlayers for talents and find combatantinfo auras
    const player = eventPlayers[id];
    const talents = player?.combatantInfo?.talents ?? [];

    // Find the combatantinfo event for this player in this specific fight
    const combatantInfoEvent = fightEvents.find(
      (event): event is CombatantInfoEvent =>
        event.type === 'combatantinfo' &&
        String(event.sourceID) === id &&
        'fight' in event &&
        event.fight === fight.id
    );

    const latestData = combatantInfoEvent;
    const latestGear = latestData?.gear;
    const latestAuras = latestData?.auras ?? [];

    if (!latestData) return 0;

    let basePenetration = 0;

    // Check Velothi Ur-Mage's Amulet buff from player auras
    const hasVelothiAmulet = latestAuras.some(
      (aura) =>
        aura.ability === KnownAbilities.VELOTHI_UR_MAGE_BUFF ||
        aura.name?.includes("Velothi Ur-Mage's Amulet")
    );

    // Add Velothi Ur-Mage's Amulet
    if (hasVelothiAmulet) {
      basePenetration += PenetrationValues.VELOTHI_UR_MAGE_AMULET;
    }

    // Check Concentration passive from player auras
    const hasConcentration = latestAuras.some(
      (aura) =>
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
      (aura) =>
        aura.ability === KnownAbilities.SPLINTERED_SECRETS ||
        aura.ability === 184885 || // Alternative Splintered Secrets ID
        aura.name?.includes('Splintered Secrets')
    );

    // Assume 2 stacks because I don't know how to track this
    const totalSplinteredSecretsStacks = splinteredSecretsAuras.length > 0 ? 2 : 0;

    const slottedHeraldAbilities =
      totalSplinteredSecretsStacks > 0
        ? talents.filter((talent) => HERALD_ABILITIES.includes(talent.guid)).length
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
    const tidebornGearCount =
      latestGear?.filter(
        (gear: CombatantGear) => gear.setID === KnownSetIDs.TIDEBORN_WILDSTALKER_SET
      ).length || 0;
    const hasTidebornWildstalker4Piece = tidebornGearCount >= 4;
    const tidebornPenetration = hasTidebornWildstalker4Piece
      ? PenetrationValues.TIDEBORN_WILDSTALKER_4_PIECE
      : 0;

    // Add Tide-born Wildstalker 4-piece
    basePenetration += tidebornPenetration;

    return basePenetration;
  }, [fightEvents, selectedTargetId, fight, id, eventPlayers]);

  // Compute penetration data for this specific player
  const penetrationData = React.useMemo(() => {
    if (!fightEvents.length || !selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return;
    }

    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;

    // Analyze penetration sources for this player
    const sources: PenetrationSource[] = [];

    // Get player data from eventPlayers for talents and find combatantinfo auras
    const player = eventPlayers[id];
    const talents = player?.combatantInfo?.talents ?? [];

    // Find the combatantinfo event for this player in this specific fight
    const combatantInfoEvent = fightEvents.find(
      (event): event is CombatantInfoEvent =>
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
      (aura) =>
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
      (aura) =>
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
      (aura) =>
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
        ? talents.filter((talent) => HERALD_ABILITIES.includes(talent.guid)).length
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
    fightEvents.forEach((event) => {
      if (
        event.type === 'applydebuff' &&
        String(event.targetID ?? event.target ?? '') === selectedTargetId
      ) {
        const buffEvent = event as BuffEvent;
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
    targetDebuffEvents.forEach((event) => {
      const buffEvent = event as BuffEvent;
      const effect = findPenetrationEffect(buffEvent);
      if (!effect) return;

      if (event.type === 'applydebuff') {
        if (!activeDebuffs.has(effect.abilityId)) {
          activeDebuffs.add(effect.abilityId);
          currentPenetration += effect.penetrationValue;
        }
      } else if (event.type === 'removedebuff') {
        if (activeDebuffs.has(effect.abilityId)) {
          activeDebuffs.delete(effect.abilityId);
          currentPenetration -= effect.penetrationValue;
        }
      }

      dataPoints.push({
        timestamp: event.timestamp,
        penetration: currentPenetration,
        relativeTime: (event.timestamp - fightStart) / 1000,
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

    const playerData: PlayerPenetrationData = {
      playerId: id,
      playerName: name,
      dataPoints: voxelizedDataPoints,
      finalPenetration: currentPenetration,
    };

    return playerData;
  }, [
    id,
    name,
    fightEvents,
    targetDebuffEvents,
    fight,
    selectedTargetId,
    reportId,
    fightId,
    eventPlayers,
    findPenetrationEffect,
    playerBasePenetration,
  ]);

  if (!penetrationData) {
    return (
      <Accordion expanded={expanded} onChange={onExpandChange}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {name}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>No penetration data available for this player.</Typography>
        </AccordionDetails>
      </Accordion>
    );
  }
  return (
    <Accordion expanded={expanded} onChange={onExpandChange}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`panel-${id}-content`}
        id={`panel-${id}-header`}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {name}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography variant="body2" color="text.secondary">
              Max:{' '}
              {Math.max(
                ...penetrationData.dataPoints.map(
                  (point: PenetrationDataPoint) => point.penetration
                ),
                0
              )}{' '}
              pen
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Final: {penetrationData.finalPenetration} pen
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {/* Only render content when panel is expanded */}
        {expanded && (
          <Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Player ID:</strong> {id}
            </Typography>

            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Data Points:</strong> {penetrationData.dataPoints.length}
            </Typography>

            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Final Penetration:</strong> {penetrationData.finalPenetration}
            </Typography>

            {/* Penetration Sources Checklist */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Penetration Sources
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <List dense>
                  {penetrationSources.map((source, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          checked={source.wasActive}
                          disabled
                          size="small"
                          color={source.wasActive ? 'success' : 'default'}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                textDecoration: source.wasActive ? 'none' : 'line-through',
                                color: source.wasActive ? 'text.primary' : 'text.disabled',
                              }}
                            >
                              {source.name}
                            </Typography>
                            <Chip
                              label={`${source.value} pen`}
                              size="small"
                              variant={source.wasActive ? 'filled' : 'outlined'}
                              color={source.wasActive ? 'primary' : 'default'}
                            />
                            {source.link && (
                              <IconButton
                                size="small"
                                href={source.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ ml: 'auto', opacity: 0.7 }}
                                title="View detailed analysis on ESO Logs"
                              >
                                <LaunchIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            sx={{
                              color: source.wasActive ? 'text.secondary' : 'text.disabled',
                            }}
                          >
                            {source.description}
                            {source.link && (
                              <Link
                                href={source.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ ml: 1, fontSize: 'inherit' }}
                              >
                                View on ESO Logs
                              </Link>
                            )}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: 'block' }}
                >
                  ✓ = Source was active during this fight | ✗ = Source was not used
                </Typography>
              </Paper>
            </Box>

            {/* Penetration vs Time Chart */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Penetration vs Time
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <Line
                  data={{
                    labels: penetrationData.dataPoints.map((point) =>
                      point.relativeTime.toFixed(1)
                    ),
                    datasets: [
                      {
                        label: 'Penetration',
                        data: penetrationData.dataPoints.map((point) => ({
                          x: point.relativeTime,
                          y: point.penetration,
                        })),
                        borderColor: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        stepped: 'after',
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        tension: 0,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      intersect: false,
                      mode: 'index',
                    },
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          title: (context) => `Time: ${Number(context[0].parsed.x).toFixed(1)}s`,
                          label: (context) => `${context.parsed.y} penetration`,
                        },
                      },
                      annotation: {
                        annotations: {
                          goalLine: {
                            type: 'line',
                            yMin: 18200,
                            yMax: 18200,
                            borderColor: '#ff6b6b',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                              content: 'Goal: 18,200',
                              display: true,
                              position: 'end',
                              backgroundColor: 'rgba(255, 107, 107, 0.8)',
                              color: 'white',
                              font: {
                                size: 12,
                              },
                              padding: 4,
                            },
                          },
                          baseLine: {
                            type: 'line',
                            yMin: playerBasePenetration,
                            yMax: playerBasePenetration,
                            borderColor: '#2196f3',
                            borderWidth: 2,
                            borderDash: [3, 3],
                            label: {
                              content: `Base: ${playerBasePenetration.toLocaleString()}`,
                              display: true,
                              position: 'start',
                              backgroundColor: 'rgba(33, 150, 243, 0.8)',
                              color: 'white',
                              font: {
                                size: 12,
                              },
                              padding: 4,
                            },
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        type: 'linear',
                        display: true,
                        min: 0,
                        max: (fight.endTime - fight.startTime) / 1000,
                        title: {
                          display: true,
                          text: 'Time (seconds)',
                        },
                        ticks: {
                          callback: function (value) {
                            return `${Number(value).toFixed(1)}s`;
                          },
                        },
                      },
                      y: {
                        display: true,
                        title: {
                          display: true,
                          text: 'Penetration',
                        },
                        min: 0,
                        max: 20000,
                        ticks: {
                          callback: function (value) {
                            return `${value}`;
                          },
                        },
                      },
                    },
                    elements: {
                      point: {
                        hoverRadius: 6,
                      },
                    },
                    animation: {
                      duration: 0, // Disable animations for better performance
                    },
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Shows penetration changes over the duration of the fight. Data voxelized to 1-second
                intervals (highest value per interval). Data points:{' '}
                {penetrationData.dataPoints.length}
              </Typography>
            </Paper>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default React.memo(PlayerPenetrationDetails);
