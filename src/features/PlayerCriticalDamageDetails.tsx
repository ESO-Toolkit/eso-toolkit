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
import { KnownAbilities, CriticalDamageValues } from '../types/abilities';
import { CombatantGear, CombatantInfoEvent, EventType } from '../types/combatlogEvents';

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

// Configuration for all critical damage effects
interface CriticalDamageEffect {
  abilityId: number;
  criticalDamageValue: number;
  abilityNames: string[];
}

// TODO: Define critical damage effects
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CRITICAL_DAMAGE_EFFECTS: CriticalDamageEffect[] = [
  // Placeholder - will be populated with actual critical damage effects
];

interface CriticalDamageDataPoint {
  timestamp: number;
  criticalDamage: number;
  relativeTime: number; // Time since fight start in seconds
}

interface PlayerCriticalDamageData {
  playerId: string;
  playerName: string;
  dataPoints: CriticalDamageDataPoint[];
  finalCriticalDamage: number;
}

interface CriticalDamageSource {
  name: string;
  value: number;
  wasActive: boolean;
  description: string;
  link?: string; // Optional external link for detailed analysis
}

interface PlayerCriticalDamageDetailsProps {
  id: string;
  name: string;
  fight: FightFragment;
  reportId?: string;
  fightId?: number;
  expanded?: boolean;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

const PlayerCriticalDamageDetails: React.FC<PlayerCriticalDamageDetailsProps> = ({
  id,
  name,
  fight,
  reportId,
  fightId,
  expanded = false,
  onExpandChange,
}) => {
  const events = useSelector((state: RootState) => state.events.events);
  const [searchParams] = useSearchParams();

  const selectedTargetId = searchParams.get('target') || '';

  // State for computed data
  const [criticalDamageSources, setCriticalDamageSources] = React.useState<CriticalDamageSource[]>(
    []
  );

  const fightEvents = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime) {
      return [];
    }

    return (events as EventType[]).filter(
      (event) => event.timestamp >= fight.startTime && event.timestamp <= fight.endTime
    );
  }, [events, fight]);

  // Calculate base critical damage for this specific player
  const playerBaseCriticalDamage = React.useMemo(() => {
    if (!fightEvents.length || !selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return 0;
    }

    // Find the combatantinfo event for this player in this specific fight
    const combatantInfoEvent = fightEvents.find(
      (event): event is CombatantInfoEvent =>
        event.type === 'combatantinfo' &&
        String(event.sourceID) === id &&
        'fight' in event &&
        event.fight === fight.id
    );

    const latestData = combatantInfoEvent;
    const latestAuras = latestData?.auras ?? [];

    if (!latestData) return 50; // Default base critical damage is 50%

    // Base critical damage - every player starts with 50% critical damage
    let baseCriticalDamage = 50;

    // Check Lucent Echoes buff from player auras
    const hasLucentEchoes = latestAuras.some(
      (aura) =>
        aura.ability === KnownAbilities.LUCENT_ECHOES || aura.name?.includes('Lucent Echoes')
    );

    // Add Lucent Echoes critical damage bonus
    if (hasLucentEchoes) {
      baseCriticalDamage += CriticalDamageValues.LUCENT_ECHOES;
    }

    // Check Fated Fortune passive from player auras
    const hasFatedFortune = latestAuras.some(
      (aura) =>
        aura.ability === KnownAbilities.FATED_FORTUNE || aura.name?.includes('Fated Fortune')
    );

    // Add Fated Fortune critical damage bonus
    if (hasFatedFortune) {
      baseCriticalDamage += CriticalDamageValues.FATED_FORTUNE;
    }

    // Check Hemorrhage passive from player auras
    const hasHemorrhage = latestAuras.some(
      (aura) => aura.ability === KnownAbilities.HEMORRHAGE || aura.name?.includes('Hemorrhage')
    );

    // Add Hemorrhage critical damage bonus
    if (hasHemorrhage) {
      baseCriticalDamage += CriticalDamageValues.HEMORRHAGE;
    }

    // Check Piercing Spear passive from player auras
    const hasPiercingSpear = latestAuras.some(
      (aura) =>
        aura.ability === KnownAbilities.PIERCING_SPEAR || aura.name?.includes('Piercing Spear')
    );

    // Add Piercing Spear critical damage bonus
    if (hasPiercingSpear) {
      baseCriticalDamage += CriticalDamageValues.PIERCING_SPEAR;
    }

    // Check Advanced Species passive from player auras
    const hasAdvancedSpecies = latestAuras.some(
      (aura) =>
        aura.ability === KnownAbilities.ADVANCED_SPECIES || aura.name?.includes('Advanced Species')
    );

    // Add Advanced Species critical damage bonus
    if (hasAdvancedSpecies) {
      baseCriticalDamage += CriticalDamageValues.ADVANCED_SPECIES;
    }

    // Check Dexterity passive from player auras
    const hasDexterity = latestAuras.some(
      (aura) => aura.ability === KnownAbilities.DEXTERITY || aura.name?.includes('Dexterity')
    );

    if (hasDexterity && latestData?.gear) {
      // ItemType 2 = Medium Armor
      const mediumArmorCount = latestData.gear.filter(
        (gear: CombatantGear) => gear.type === 2
      ).length;
      baseCriticalDamage += mediumArmorCount * CriticalDamageValues.DEXTERITY_PER_PIECE;
    }

    // TODO: Add critical damage calculations based on:
    // - Gear sets
    // - Passives
    // - Mundus stones
    // - Other sources

    return baseCriticalDamage;
  }, [fightEvents, selectedTargetId, fight, id]);

  // Compute critical damage data for this specific player
  const criticalDamageData = React.useMemo(() => {
    if (!fightEvents.length || !selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return null;
    }

    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;

    // Analyze critical damage sources for this player
    const sources: CriticalDamageSource[] = [];

    // Find the combatantinfo event for this player to check auras
    const combatantInfoEvent = fightEvents.find(
      (event): event is CombatantInfoEvent =>
        event.type === 'combatantinfo' &&
        String(event.sourceID) === id &&
        'fight' in event &&
        event.fight === fight.id
    );
    const latestAuras = combatantInfoEvent?.auras ?? [];
    const mediumArmorCount =
      combatantInfoEvent?.gear?.filter((gear: CombatantGear) => gear.type === 2).length || 0;

    // Always show all tracked passives
    sources.push({
      name: 'Base Critical Damage',
      value: 50,
      wasActive: true,
      description: 'Default critical damage bonus that all players start with',
    });
    sources.push({
      name: 'Lucent Echoes',
      value: CriticalDamageValues.LUCENT_ECHOES,
      wasActive: latestAuras.some(
        (aura) =>
          aura.ability === KnownAbilities.LUCENT_ECHOES || aura.name?.includes('Lucent Echoes')
      ),
      description: 'Buff that provides 11% critical damage bonus',
    });
    sources.push({
      name: 'Fated Fortune',
      value: CriticalDamageValues.FATED_FORTUNE,
      wasActive: latestAuras.some(
        (aura) =>
          aura.ability === KnownAbilities.FATED_FORTUNE || aura.name?.includes('Fated Fortune')
      ),
      description: 'Passive that provides 12% critical damage bonus',
    });
    sources.push({
      name: 'Hemorrhage',
      value: CriticalDamageValues.HEMORRHAGE,
      wasActive: latestAuras.some(
        (aura) => aura.ability === KnownAbilities.HEMORRHAGE || aura.name?.includes('Hemorrhage')
      ),
      description: 'Passive that provides 10% critical damage bonus',
    });
    sources.push({
      name: 'Piercing Spear',
      value: CriticalDamageValues.PIERCING_SPEAR,
      wasActive: latestAuras.some(
        (aura) =>
          aura.ability === KnownAbilities.PIERCING_SPEAR || aura.name?.includes('Piercing Spear')
      ),
      description: 'Passive that provides 12% critical damage bonus',
    });
    sources.push({
      name: 'Advanced Species',
      value: CriticalDamageValues.ADVANCED_SPECIES,
      wasActive: latestAuras.some(
        (aura) =>
          aura.ability === KnownAbilities.ADVANCED_SPECIES ||
          aura.name?.includes('Advanced Species')
      ),
      description: 'Passive that provides 15% critical damage bonus',
    });
    sources.push({
      name: 'Dexterity',
      value: mediumArmorCount * CriticalDamageValues.DEXTERITY_PER_PIECE,
      wasActive:
        mediumArmorCount > 0 &&
        latestAuras.some(
          (aura) => aura.ability === KnownAbilities.DEXTERITY || aura.name?.includes('Dexterity')
        ),
      description: `Passive that provides 2% critical damage per piece of medium armor worn (${mediumArmorCount} pieces)`,
    });

    setCriticalDamageSources(sources);

    // Create timeline data points
    const dataPoints: CriticalDamageDataPoint[] = [];
    const currentCriticalDamage = playerBaseCriticalDamage;

    // Add initial data point
    dataPoints.push({
      timestamp: fightStart,
      criticalDamage: currentCriticalDamage,
      relativeTime: 0,
    });

    // TODO: Process debuff events to track critical damage changes over time

    // Voxelization: Reduce data points to 1-second intervals
    const voxelizedDataPoints: CriticalDamageDataPoint[] = [];
    const fightDurationSeconds = (fightEnd - fightStart) / 1000;

    for (let second = 0; second <= Math.ceil(fightDurationSeconds); second++) {
      const voxelStart = fightStart + second * 1000;
      const voxelEnd = voxelStart + 1000;

      // Find all points in this 1-second interval
      const pointsInVoxel = dataPoints.filter(
        (point) => point.timestamp >= voxelStart && point.timestamp < voxelEnd
      );

      if (pointsInVoxel.length > 0) {
        // Use the point with the highest critical damage in this interval
        const maxPoint = pointsInVoxel.reduce((max, point) =>
          point.criticalDamage > max.criticalDamage ? point : max
        );
        voxelizedDataPoints.push({
          timestamp: voxelStart,
          criticalDamage: maxPoint.criticalDamage,
          relativeTime: second,
        });
      } else {
        // First voxel with no points, use base critical damage
        if (voxelizedDataPoints.length === 0) {
          voxelizedDataPoints.push({
            timestamp: voxelStart,
            criticalDamage: playerBaseCriticalDamage,
            relativeTime: second,
          });
        } else {
          // Use the last known value
          const lastPoint = voxelizedDataPoints[voxelizedDataPoints.length - 1];
          voxelizedDataPoints.push({
            timestamp: voxelStart,
            criticalDamage: lastPoint.criticalDamage,
            relativeTime: second,
          });
        }
      }
    }

    const playerData: PlayerCriticalDamageData = {
      playerId: id,
      playerName: name,
      dataPoints: voxelizedDataPoints,
      finalCriticalDamage: currentCriticalDamage,
    };

    return playerData;
  }, [id, name, fightEvents, fight, selectedTargetId, playerBaseCriticalDamage]);

  if (!criticalDamageData) {
    return (
      <Accordion expanded={expanded} onChange={onExpandChange}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {name}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>No critical damage data available for this player.</Typography>
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
                ...criticalDamageData.dataPoints.map(
                  (point: CriticalDamageDataPoint) => point.criticalDamage
                ),
                0
              )}{' '}
              crit dmg
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Final: {criticalDamageData.finalCriticalDamage} crit dmg
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
              <strong>Data Points:</strong> {criticalDamageData.dataPoints.length}
            </Typography>

            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Final Critical Damage:</strong> {criticalDamageData.finalCriticalDamage}
            </Typography>

            {/* Critical Damage Sources Checklist */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Critical Damage Sources
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <List dense>
                  {criticalDamageSources.map((source, index) => (
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
                              label={`${source.value} crit dmg`}
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

            {/* Critical Damage vs Time Chart */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Critical Damage vs Time
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <Line
                  data={{
                    labels: criticalDamageData.dataPoints.map((point) =>
                      point.relativeTime.toFixed(1)
                    ),
                    datasets: [
                      {
                        label: 'Critical Damage',
                        data: criticalDamageData.dataPoints.map((point) => ({
                          x: point.relativeTime,
                          y: point.criticalDamage,
                        })),
                        borderColor: '#d32f2f',
                        backgroundColor: 'rgba(211, 47, 47, 0.1)',
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
                          label: (context) => `${context.parsed.y} critical damage`,
                        },
                      },
                      annotation: {
                        annotations: {
                          baseLine: {
                            type: 'line',
                            yMin: playerBaseCriticalDamage,
                            yMax: playerBaseCriticalDamage,
                            borderColor: '#d32f2f',
                            borderWidth: 2,
                            borderDash: [3, 3],
                            label: {
                              content: `Base: ${playerBaseCriticalDamage.toLocaleString()}`,
                              display: true,
                              position: 'start',
                              backgroundColor: 'rgba(211, 47, 47, 0.8)',
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
                          text: 'Critical Damage (%)',
                        },
                        min: 0,
                        max: 150, // Reasonable range for critical damage percentage
                        ticks: {
                          callback: function (value) {
                            return `${value}%`;
                          },
                        },
                      },
                    },
                    elements: {
                      point: {
                        radius: 0,
                        hoverRadius: 4,
                      },
                    },
                  }}
                />
              </Box>
            </Paper>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default PlayerCriticalDamageDetails;
