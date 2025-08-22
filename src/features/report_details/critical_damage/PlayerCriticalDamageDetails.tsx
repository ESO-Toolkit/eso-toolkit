import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
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

import StatChecklist from '../../../components/StatChecklist';
import { FightFragment } from '../../../graphql/generated';
import { useReportFightParams } from '../../../hooks/useReportFightParams';
import { RootState } from '../../../store/storeWithHistory';
import { KnownAbilities, CriticalDamageValues } from '../../../types/abilities';
import { CombatantGear, CombatantInfoEvent, LogEvent } from '../../../types/combatlogEvents';

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
  expanded?: boolean;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

const PlayerCriticalDamageDetails: React.FC<PlayerCriticalDamageDetailsProps> = ({
  id,
  name,
  fight,
  expanded = false,
  onExpandChange,
}) => {
  const events = useSelector((state: RootState) => state.events.events);
  const [searchParams] = useSearchParams();
  const { reportId, fightId } = useReportFightParams();

  const selectedTargetId = searchParams.get('target') || '';

  // State for computed data
  const [criticalDamageSources, setCriticalDamageSources] = React.useState<CriticalDamageSource[]>(
    []
  );

  const fightEvents = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime) {
      return [];
    }

    return (events as LogEvent[]).filter(
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
    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;

    // Track Major Brittle debuff uptimes for the selected target
    const majorBrittleEvents = fightEvents.filter(
      (event) =>
        (event.type === 'applydebuff' || event.type === 'removedebuff') &&
        String(event.targetID ?? event.target ?? '') === selectedTargetId &&
        ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MAJOR_BRITTLE ||
          (event.abilityName ?? '').includes('Major Brittle'))
    );

    // Build a timeline of Major Brittle active intervals
    const majorBrittleIntervals: Array<{ start: number; end: number }> = [];
    let majorBrittleActiveStart: number | null = null;
    for (const event of majorBrittleEvents) {
      if (event.type === 'applydebuff') {
        if (majorBrittleActiveStart === null) majorBrittleActiveStart = event.timestamp;
      } else if (event.type === 'removedebuff') {
        if (majorBrittleActiveStart !== null) {
          majorBrittleIntervals.push({ start: majorBrittleActiveStart, end: event.timestamp });
          majorBrittleActiveStart = null;
        }
      }
    }
    // If Major Brittle was never removed, assume it lasts until fight end
    if (majorBrittleActiveStart !== null) {
      majorBrittleIntervals.push({ start: majorBrittleActiveStart, end: fightEnd });
    }
    // ...existing code...

    // Track Minor Brittle debuff uptimes for the selected target
    const minorBrittleEvents = fightEvents.filter(
      (event) =>
        (event.type === 'applydebuff' || event.type === 'removedebuff') &&
        String(event.targetID ?? event.target ?? '') === selectedTargetId &&
        ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MINOR_BRITTLE ||
          (event.abilityName ?? '').includes('Minor Brittle'))
    );

    // Build a timeline of Minor Brittle active intervals
    const minorBrittleIntervals: Array<{ start: number; end: number }> = [];
    let brittleActiveStart: number | null = null;
    for (const event of minorBrittleEvents) {
      if (event.type === 'applydebuff') {
        if (brittleActiveStart === null) brittleActiveStart = event.timestamp;
      } else if (event.type === 'removedebuff') {
        if (brittleActiveStart !== null) {
          minorBrittleIntervals.push({ start: brittleActiveStart, end: event.timestamp });
          brittleActiveStart = null;
        }
      }
    }
    // If Minor Brittle was never removed, assume it lasts until fight end
    if (brittleActiveStart !== null) {
      minorBrittleIntervals.push({ start: brittleActiveStart, end: fightEnd });
    }
    if (!fightEvents.length || !selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return null;
    }
    // ...existing code...

    // Track Minor Force buff uptimes for the selected player
    // Find all buff events for Minor Force where target is selected player
    const minorForceEvents = fightEvents.filter(
      (event) =>
        (event.type === 'applybuff' || event.type === 'removebuff') &&
        String(event.targetID ?? event.target ?? '') === id &&
        ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MINOR_FORCE ||
          (event.abilityName ?? '').includes('Minor Force'))
    );

    // Build a timeline of Minor Force active intervals
    const minorForceIntervals: Array<{ start: number; end: number }> = [];
    let activeStart: number | null = null;
    for (const event of minorForceEvents) {
      if (event.type === 'applybuff') {
        if (activeStart === null) activeStart = event.timestamp;
      } else if (event.type === 'removebuff') {
        if (activeStart !== null) {
          minorForceIntervals.push({ start: activeStart, end: event.timestamp });
          activeStart = null;
        }
      }
    }
    // If Minor Force was never removed, assume it lasts until fight end
    if (activeStart !== null) {
      minorForceIntervals.push({ start: activeStart, end: fightEnd });
    }

    // Track Major Force buff uptimes for the selected player
    // Find all buff events for Major Force where target is selected player
    const majorForceEvents = fightEvents.filter(
      (event) =>
        (event.type === 'applybuff' || event.type === 'removebuff') &&
        String(event.targetID ?? event.target ?? '') === id &&
        ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MAJOR_FORCE ||
          (event.abilityName ?? '').includes('Major Force'))
    );

    // Build a timeline of Major Force active intervals
    const majorForceIntervals: Array<{ start: number; end: number }> = [];
    let majorForceActiveStart: number | null = null;
    for (const event of majorForceEvents) {
      if (event.type === 'applybuff') {
        if (majorForceActiveStart === null) majorForceActiveStart = event.timestamp;
      } else if (event.type === 'removebuff') {
        if (majorForceActiveStart !== null) {
          majorForceIntervals.push({ start: majorForceActiveStart, end: event.timestamp });
          majorForceActiveStart = null;
        }
      }
    }
    // If Major Force was never removed, assume it lasts until fight end
    if (majorForceActiveStart !== null) {
      majorForceIntervals.push({ start: majorForceActiveStart, end: fightEnd });
    }

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
    // Add Minor Breach to sources list (ESO Logs link, checklist style)
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

    // Create timeline data points with Minor Force and Major Force uptime
    const fightDurationSeconds = (fightEnd - fightStart) / 1000;
    const dataPoints: CriticalDamageDataPoint[] = [];
    let minorForceUptimeSeconds = 0;
    let majorForceUptimeSeconds = 0;
    let minorBrittleUptimeSeconds = 0;
    let majorBrittleUptimeSeconds = 0;
    for (let second = 0; second <= Math.ceil(fightDurationSeconds); second++) {
      const timestamp = fightStart + second * 1000;
      let critDmg = playerBaseCriticalDamage;
      // Check if Minor Force is active at this timestamp
      const isMinorForceActive = minorForceIntervals.some(
        (interval) => timestamp >= interval.start && timestamp < interval.end
      );
      if (isMinorForceActive) {
        critDmg += 10;
        minorForceUptimeSeconds++;
      }
      // Check if Major Force is active at this timestamp
      const isMajorForceActive = majorForceIntervals.some(
        (interval) => timestamp >= interval.start && timestamp < interval.end
      );
      if (isMajorForceActive) {
        critDmg += 20;
        majorForceUptimeSeconds++;
      }
      // Check if Minor Brittle is active at this timestamp
      const isMinorBrittleActive = minorBrittleIntervals.some(
        (interval) => timestamp >= interval.start && timestamp < interval.end
      );
      if (isMinorBrittleActive) {
        critDmg += 10;
        minorBrittleUptimeSeconds++;
      }
      // Check if Major Brittle is active at this timestamp
      const isMajorBrittleActive = majorBrittleIntervals.some(
        (interval) => timestamp >= interval.start && timestamp < interval.end
      );
      if (isMajorBrittleActive) {
        critDmg += 20;
        majorBrittleUptimeSeconds++;
      }
      dataPoints.push({
        timestamp,
        criticalDamage: critDmg,
        relativeTime: second,
      });
    }

    // Add Minor Force to sources list (ESO Logs link)
    let minorForceLink: string | undefined;
    if (reportId && id) {
      minorForceLink = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&spells=buffs&hostility=0&ability=${KnownAbilities.MINOR_FORCE}&source=${id}`;
    }
    sources.push({
      name: 'Minor Force',
      value: 10,
      wasActive: minorForceUptimeSeconds > 0,
      description: `Buff that provides 10% critical damage. Uptime: ${((minorForceUptimeSeconds / (fightDurationSeconds + 1)) * 100).toFixed(1)}%`,
      link: minorForceLink,
    });

    // Add Major Force to sources list (ESO Logs link)
    let majorForceLink: string | undefined;
    if (reportId && id) {
      majorForceLink = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&spells=buffs&hostility=0&ability=${KnownAbilities.MAJOR_FORCE}&source=${id}`;
    }
    sources.push({
      name: 'Major Force',
      value: 20,
      wasActive: majorForceUptimeSeconds > 0,
      description: `Buff that provides 20% critical damage. Uptime: ${((majorForceUptimeSeconds / (fightDurationSeconds + 1)) * 100).toFixed(1)}%`,
      link: majorForceLink,
    });

    // Add Minor Brittle to sources list (ESO Logs link)
    let minorBrittleLink: string | undefined;
    if (reportId && selectedTargetId) {
      minorBrittleLink = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&spells=debuffs&hostility=1&ability=${KnownAbilities.MINOR_BRITTLE}&source=${selectedTargetId}`;
    }
    sources.push({
      name: 'Minor Brittle',
      value: 10,
      wasActive: minorBrittleUptimeSeconds > 0,
      description: `Debuff that provides 10% critical damage. Uptime: ${((minorBrittleUptimeSeconds / (fightDurationSeconds + 1)) * 100).toFixed(1)}%`,
      link: minorBrittleLink,
    });

    // Add Major Brittle to sources list (ESO Logs link)
    let majorBrittleLink: string | undefined;
    if (reportId && selectedTargetId) {
      majorBrittleLink = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&spells=debuffs&hostility=1&ability=${KnownAbilities.MAJOR_BRITTLE}&source=${selectedTargetId}`;
    }
    sources.push({
      name: 'Major Brittle',
      value: 20,
      wasActive: majorBrittleUptimeSeconds > 0,
      description: `Debuff that provides 20% critical damage. Uptime: ${((majorBrittleUptimeSeconds / (fightDurationSeconds + 1)) * 100).toFixed(1)}%`,
      link: majorBrittleLink,
    });

    setCriticalDamageSources(sources);

    const playerData: PlayerCriticalDamageData = {
      playerId: id,
      playerName: name,
      dataPoints,
    };

    return playerData;
  }, [id, name, fightEvents, fight, selectedTargetId, playerBaseCriticalDamage, fightId, reportId]);

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
              )}
              % Crit Damage
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

            {/* Critical Damage Sources Checklist */}
            <StatChecklist sources={criticalDamageSources} title="Critical Damage Sources" />

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
                        min: 50,
                        max: 135, // Set range from 50% to 135% for critical damage
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
