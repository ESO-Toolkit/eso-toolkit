import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from '@mui/material';
import type { TooltipItem } from 'chart.js';
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
import { useSearchParams } from 'react-router-dom';

import { StatChecklist } from '../../../components/StatChecklist';
import { FightFragment } from '../../../graphql/generated';
import {
  useCombatantInfoEvents,
  useDamageEvents,
  useDebuffEvents,
  useFriendlyBuffEvents,
} from '../../../hooks';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { KnownAbilities, CriticalDamageValues } from '../../../types/abilities';
import {
  CombatantGear,
  CombatantInfoEvent,
  CombatantAura,
  LogEvent,
  DamageEvent,
  DebuffEvent,
  BuffEvent,
} from '../../../types/combatlogEvents';

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

// Chart callback functions - extracted to module level for performance
const formatTooltipTitle = (context: TooltipItem<'line'>[]): string => {
  return `Time: ${Number(context[0].parsed.x).toFixed(1)}s`;
};

const formatTooltipLabel = (context: TooltipItem<'line'>): string => {
  return `${context.parsed.y}% critical damage`;
};

const formatXAxisTick = (value: number | string): string => {
  return `${Number(value).toFixed(1)}s`;
};

const formatYAxisTick = (value: number | string): string => {
  return `${value}%`;
};

// Helper functions for array operations - extracted to module level for performance
const sumDamageAmount = (sum: number, event: DamageEvent): number => sum + (event.amount ?? 0);

const findMaxCriticalDamagePoint = (
  max: CriticalDamageDataPoint,
  point: CriticalDamageDataPoint
): CriticalDamageDataPoint => (point.criticalDamage > max.criticalDamage ? point : max);

const isTimeWindowPoint =
  (startTime: number, endTime: number) =>
  (point: CriticalDamageDataPoint): boolean =>
    point.relativeTime >= startTime && point.relativeTime < endTime;

const isMediumArmor = (gear: CombatantGear): boolean => gear.type === 2;

// Configuration for all critical damage effects - moved to later in file

interface CriticalDamageDataPoint {
  timestamp: number;
  criticalDamage: number;
  relativeTime: number; // Time since fight start in seconds
}

interface PlayerCriticalDamageData {
  playerId: number;
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

interface CriticalMultiplierInfo {
  abilityName: string;
  abilityId: number;
  criticalDamage: number;
  normalDamage: number;
  criticalMultiplier: number;
  foundPair: boolean;
  criticalTimestamp: number;
  accountedCritDamagePercent: number;
  unaccountedCritDamagePercent: number;
  activeSources: CriticalDamageSource[];
}

/**
 * Props for the PlayerCriticalDamageDetails component
 */
interface PlayerCriticalDamageDetailsProps {
  /**
   * The unique identifier for the player
   * @example 123
   */
  id: number;
  /**
   * The display name of the player
   * @example "PlayerOne"
   */
  name: string;
  /**
   * Fight data containing start time, end time, and other fight metadata
   */
  fight: FightFragment;
  /**
   * Whether the component should be rendered in expanded state initially
   * @default false
   */
  expanded?: boolean;
  /**
   * Callback function called when the user expands or collapses the component
   * @param event - The synthetic event triggered by the user interaction
   * @param isExpanded - Whether the component is expanded after the change
   */
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

// Helper function to get active critical damage sources at a specific timestamp
function getActiveCriticalDamageSourcesAtTimestamp(
  timestamp: number,
  debuffEvents: DebuffEvent[],
  friendlyBuffEvents: BuffEvent[],
  combatantInfoEvents: CombatantInfoEvent[],
  playerId: number,
  targetId: string,
  fightData: FightFragment
): CriticalDamageSource[] {
  const sources: CriticalDamageSource[] = [];
  const fightEnd = fightData.endTime;

  // Find combatant info for auras
  const combatantInfoEvent = combatantInfoEvents.find(
    (event) => event.sourceID === playerId && event.fight === fightData.id
  );
  const latestAuras = combatantInfoEvent?.auras ?? [];
  const mediumArmorCount = combatantInfoEvent?.gear?.filter(isMediumArmor).length || 0;

  // Process all critical damage effects
  for (const effect of CRITICAL_DAMAGE_EFFECTS) {
    let isActive = false;
    let value = effect.value;
    let description = effect.description;

    if (effect.name === 'Base Critical Damage') {
      // Base critical damage is always active
      isActive = true;
    } else if (effect.isPassive) {
      // Check if passive aura exists
      isActive = hasAura(latestAuras, effect.abilityId, effect.abilityNameFragment);

      if (effect.requiresMediumArmor && isActive) {
        // Special handling for Dexterity
        value = mediumArmorCount * effect.value;
        description = `${effect.description} (${mediumArmorCount} pieces)`;
        isActive = mediumArmorCount > 0;
      }
    } else if (effect.isDebuff) {
      // Check debuff activity on target
      const debuffFilteredEvents = debuffEvents.filter(
        (event) =>
          (event.type === 'applydebuff' || event.type === 'removedebuff') &&
          String(event.targetID) === targetId &&
          event.abilityGameID === effect.abilityId
      );
      isActive = isDebuffActiveAtTimestamp(timestamp, debuffFilteredEvents, fightEnd);
    } else {
      // Check buff activity on player
      const buffFilteredEvents = friendlyBuffEvents.filter(
        (event) =>
          (event.type === 'applybuff' || event.type === 'removebuff') &&
          event.targetID === playerId &&
          event.abilityGameID === effect.abilityId
      );
      isActive = isBuffActiveAtTimestamp(timestamp, buffFilteredEvents, fightEnd);
    }

    if (isActive) {
      sources.push({
        name: effect.name,
        value,
        wasActive: true,
        description,
      });
    }
  }

  return sources.filter((source) => source.wasActive);
}

// Helper function to check if an aura exists in the combatant's auras
function hasAura(auras: CombatantAura[], abilityId: number, abilityNameFragment?: string): boolean {
  return auras.some(
    (aura) =>
      aura.ability === abilityId ||
      (abilityNameFragment && aura.name?.includes(abilityNameFragment))
  );
}

// Helper function to build active intervals for an effect
function buildEffectIntervals(
  events: LogEvent[],
  fightEnd: number,
  applyType: string,
  removeType: string
): Array<{ start: number; end: number }> {
  const intervals: Array<{ start: number; end: number }> = [];
  let activeStart: number | null = null;

  for (const event of events) {
    if (event.type === applyType) {
      if (activeStart === null) activeStart = event.timestamp;
    } else if (event.type === removeType) {
      if (activeStart !== null) {
        intervals.push({ start: activeStart, end: event.timestamp });
        activeStart = null;
      }
    }
  }

  if (activeStart !== null) {
    intervals.push({ start: activeStart, end: fightEnd });
  }

  return intervals;
}

// Helper function to calculate uptime percentage
function calculateUptimePercentage(
  intervals: Array<{ start: number; end: number }>,
  fightDurationMs: number
): number {
  const totalActiveTime = intervals.reduce(
    (sum, interval) => sum + (interval.end - interval.start),
    0
  );
  return (totalActiveTime / fightDurationMs) * 100;
}

// Configuration for critical damage effects
interface CriticalDamageEffectConfig {
  name: string;
  abilityId: number;
  value: number;
  description: string;
  abilityNameFragment?: string;
  isPassive?: boolean;
  requiresMediumArmor?: boolean;
  isDebuff?: boolean;
}

const CRITICAL_DAMAGE_EFFECTS: CriticalDamageEffectConfig[] = [
  {
    name: 'Base Critical Damage',
    abilityId: 0, // Special case for base
    value: 50,
    description: 'Default critical damage bonus that all players start with',
    isPassive: true,
  },
  {
    name: 'Hemorrhage',
    abilityId: KnownAbilities.HEMORRHAGE,
    value: CriticalDamageValues.HEMORRHAGE,
    description: 'Passive that provides 10% critical damage bonus',
    abilityNameFragment: 'Hemorrhage',
    isPassive: true,
  },
  {
    name: 'Piercing Spear',
    abilityId: KnownAbilities.PIERCING_SPEAR,
    value: CriticalDamageValues.PIERCING_SPEAR,
    description: 'Passive that provides 12% critical damage bonus',
    abilityNameFragment: 'Piercing Spear',
    isPassive: true,
  },
  {
    name: 'Advanced Species',
    abilityId: KnownAbilities.ADVANCED_SPECIES,
    value: CriticalDamageValues.ADVANCED_SPECIES,
    description: 'Passive that provides 15% critical damage bonus',
    abilityNameFragment: 'Advanced Species',
    isPassive: true,
  },
  {
    name: 'Fated Fortune',
    abilityId: KnownAbilities.FATED_FORTUNE_STAGE_ONE,
    value: CriticalDamageValues.FATED_FORTUNE,
    description: 'Passive that provides 12% critical damage bonus',
    abilityNameFragment: 'Fated Fortune',
    isPassive: true,
  },
  {
    name: 'Dexterity',
    abilityId: KnownAbilities.DEXTERITY,
    value: CriticalDamageValues.DEXTERITY_PER_PIECE,
    description: 'Passive that provides 2% critical damage per piece of medium armor worn',
    abilityNameFragment: 'Dexterity',
    isPassive: true,
    requiresMediumArmor: true,
  },
  {
    name: 'Lucent Echoes',
    abilityId: KnownAbilities.LUCENT_ECHOES,
    value: CriticalDamageValues.LUCENT_ECHOES,
    description: 'Buff that provides 11% critical damage bonus',
  },
  {
    name: 'Minor Force',
    abilityId: KnownAbilities.MINOR_FORCE,
    value: 10,
    description: 'Buff that provides 10% critical damage',
  },
  {
    name: 'Major Force',
    abilityId: KnownAbilities.MAJOR_FORCE,
    value: 20,
    description: 'Buff that provides 20% critical damage',
  },
  {
    name: 'Minor Brittle',
    abilityId: KnownAbilities.MINOR_BRITTLE,
    value: 10,
    description: 'Debuff that provides 10% critical damage',
    isDebuff: true,
  },
  {
    name: 'Major Brittle',
    abilityId: KnownAbilities.MAJOR_BRITTLE,
    value: 20,
    description: 'Debuff that provides 20% critical damage',
    isDebuff: true,
  },
];

// Helper function to check if an effect is active at a timestamp
function isEffectActiveAtTimestamp(
  timestamp: number,
  events: LogEvent[],
  fightEnd: number,
  applyType: string,
  removeType: string
): boolean {
  const intervals: Array<{ start: number; end: number }> = [];
  let activeStart: number | null = null;

  for (const event of events) {
    if (event.type === applyType) {
      if (activeStart === null) activeStart = event.timestamp;
    } else if (event.type === removeType) {
      if (activeStart !== null) {
        intervals.push({ start: activeStart, end: event.timestamp });
        activeStart = null;
      }
    }
  }

  if (activeStart !== null) {
    intervals.push({ start: activeStart, end: fightEnd });
  }

  return intervals.some((interval) => timestamp >= interval.start && timestamp < interval.end);
}

// Helper function to check if a buff is active at a timestamp
function isBuffActiveAtTimestamp(
  timestamp: number,
  buffEvents: LogEvent[],
  fightEnd: number
): boolean {
  return isEffectActiveAtTimestamp(timestamp, buffEvents, fightEnd, 'applybuff', 'removebuff');
}

// Helper function to check if a debuff is active at a timestamp
function isDebuffActiveAtTimestamp(
  timestamp: number,
  debuffEvents: LogEvent[],
  fightEnd: number
): boolean {
  return isEffectActiveAtTimestamp(
    timestamp,
    debuffEvents,
    fightEnd,
    'applydebuff',
    'removedebuff'
  );
}

// Helper function to calculate critical damage percentage at a specific timestamp
function calculateCriticalDamageAtTimestamp(
  timestamp: number,
  debuffEvents: DebuffEvent[],
  friendlyBuffEvents: BuffEvent[],
  combatantInfoEvents: CombatantInfoEvent[],
  playerId: number,
  targetId: string,
  fightData: FightFragment
): number {
  const fightEnd = fightData.endTime;

  // Find combatant info for auras
  const combatantInfoEvent = combatantInfoEvents.find(
    (event): event is CombatantInfoEvent =>
      event.sourceID === playerId && event.fight === fightData.id
  );
  const latestAuras = combatantInfoEvent?.auras ?? [];
  const mediumArmorCount = combatantInfoEvent?.gear?.filter(isMediumArmor).length || 0;

  // Start with base critical damage
  let critDmg = 50;

  // Process all critical damage effects
  for (const effect of CRITICAL_DAMAGE_EFFECTS) {
    if (effect.name === 'Base Critical Damage') {
      continue; // Already added above
    }

    let isActive = false;
    let value = effect.value;

    if (effect.isPassive) {
      // Check if passive aura exists
      isActive = hasAura(latestAuras, effect.abilityId, effect.abilityNameFragment);

      if (effect.requiresMediumArmor && isActive) {
        // Special handling for Dexterity
        value = mediumArmorCount * effect.value;
        isActive = mediumArmorCount > 0;
      }
    } else if (effect.isDebuff) {
      // Check debuff activity on target
      const debuffFilteredEvents = debuffEvents.filter(
        (event) =>
          (event.type === 'applydebuff' || event.type === 'removedebuff') &&
          String(event.targetID) === targetId &&
          event.abilityGameID === effect.abilityId
      );
      isActive = isDebuffActiveAtTimestamp(timestamp, debuffFilteredEvents, fightEnd);
    } else {
      // Check buff activity on player
      const buffFilteredEvents = friendlyBuffEvents.filter(
        (event) =>
          (event.type === 'applybuff' || event.type === 'removebuff') &&
          event.targetID === playerId &&
          event.abilityGameID === effect.abilityId
      );
      isActive = isBuffActiveAtTimestamp(timestamp, buffFilteredEvents, fightEnd);
    }

    if (isActive) {
      critDmg += value;
    }
  }

  return critDmg;
}

export const PlayerCriticalDamageDetails: React.FC<PlayerCriticalDamageDetailsProps> = ({
  id,
  name,
  fight,
  expanded = false,
  onExpandChange,
}) => {
  const [searchParams] = useSearchParams();
  const { reportId, fightId } = useSelectedReportAndFight();

  const selectedTargetId = searchParams.get('target') || '';

  // State for computed data
  const [criticalDamageSources, setCriticalDamageSources] = React.useState<CriticalDamageSource[]>(
    []
  );
  const [criticalMultiplier, setCriticalMultiplier] = React.useState<CriticalMultiplierInfo | null>(
    null
  );

  const { friendlyBuffEvents } = useFriendlyBuffEvents();
  const { damageEvents } = useDamageEvents();
  const { combatantInfoEvents } = useCombatantInfoEvents();
  const { debuffEvents } = useDebuffEvents();

  // Calculate base critical damage for this specific player
  const playerBaseCriticalDamage = React.useMemo(() => {
    if (!selectedTargetId) {
      return 0;
    }

    // Find the combatantinfo event for this player in this specific fight
    const combatantInfoEvent = combatantInfoEvents.find(
      (event) => event.sourceID === id && event.fight === fight.id
    );

    const latestData = combatantInfoEvent;
    const latestAuras = latestData?.auras ?? [];

    if (!latestData) return 50; // Default base critical damage is 50%

    // Base critical damage - every player starts with 50% critical damage
    let baseCriticalDamage = 50;

    const mediumArmorCount = latestData?.gear?.filter(isMediumArmor).length || 0;

    // Process all passive critical damage effects
    for (const effect of CRITICAL_DAMAGE_EFFECTS) {
      if (!effect.isPassive || effect.name === 'Base Critical Damage') {
        continue;
      }

      const isActive = hasAura(latestAuras, effect.abilityId, effect.abilityNameFragment);

      if (isActive) {
        if (effect.requiresMediumArmor) {
          // Special handling for Dexterity
          if (mediumArmorCount > 0) {
            baseCriticalDamage += mediumArmorCount * effect.value;
          }
        } else {
          baseCriticalDamage += effect.value;
        }
      }
    }

    return baseCriticalDamage;
  }, [combatantInfoEvents, selectedTargetId, fight, id]);

  // Calculate critical multiplier by finding pairs of critical and normal hits
  const criticalMultiplierData = React.useMemo(() => {
    if (!selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return null;
    }

    // Get damage events for this player against the selected target
    const playerDamageEvents = damageEvents.filter(
      (event) =>
        event.sourceID === id && String(event.targetID) === selectedTargetId && event.amount > 0
    );

    // Group damage events by ability
    const damageByAbility = new Map<number, { critical: DamageEvent[]; normal: DamageEvent[] }>();

    playerDamageEvents.forEach((event) => {
      const abilityId = event.abilityGameID;
      if (!abilityId) return;

      if (!damageByAbility.has(abilityId)) {
        damageByAbility.set(abilityId, { critical: [], normal: [] });
      }

      const group = damageByAbility.get(abilityId);
      if (!group) return;

      if (event.hitType === 2) {
        // Critical hit
        group.critical.push(event);
      } else if (event.hitType === 1) {
        // Normal hit
        group.normal.push(event);
      }
    });

    // Find the first ability that has both critical and normal hits
    for (const [abilityId, { critical, normal }] of Array.from(damageByAbility.entries())) {
      if (critical.length > 0 && normal.length > 0) {
        // Calculate average damage for critical and normal hits
        const avgCriticalDamage = critical.reduce(sumDamageAmount, 0) / critical.length;
        const avgNormalDamage = normal.reduce(sumDamageAmount, 0) / normal.length;

        if (avgNormalDamage > 0) {
          const multiplier = avgCriticalDamage / avgNormalDamage;

          // Use the first critical hit for timestamp analysis
          const criticalEvent = critical[0];
          const criticalTimestamp = criticalEvent.timestamp;

          // Calculate what the critical damage % should be at this timestamp
          const accountedCritDamage = calculateCriticalDamageAtTimestamp(
            criticalTimestamp,
            debuffEvents,
            friendlyBuffEvents,
            combatantInfoEvents,
            id,
            selectedTargetId,
            fight
          );

          // Convert multiplier to critical damage percentage
          // If multiplier is 1.75x, that means 175% damage = 75% critical damage bonus
          const actualCritDamagePercent = (multiplier - 1) * 100;

          // The accounted critical damage already includes base 50%, convert to bonus for comparison
          const expectedCritDamageBonus = accountedCritDamage - 50;
          const unaccountedPercent = Math.max(0, actualCritDamagePercent - expectedCritDamageBonus);

          // Get active sources at this timestamp
          const activeSources = getActiveCriticalDamageSourcesAtTimestamp(
            criticalTimestamp,
            debuffEvents,
            friendlyBuffEvents,
            combatantInfoEvents,
            id,
            selectedTargetId,
            fight
          );

          return {
            abilityName: `Ability ${abilityId}`,
            abilityId,
            criticalDamage: Math.round(avgCriticalDamage),
            normalDamage: Math.round(avgNormalDamage),
            criticalMultiplier: multiplier,
            foundPair: true,
            criticalTimestamp,
            accountedCritDamagePercent: expectedCritDamageBonus,
            unaccountedCritDamagePercent: unaccountedPercent,
            activeSources,
          };
        }
      }
    }

    return null;
  }, [
    friendlyBuffEvents,
    debuffEvents,
    combatantInfoEvents,
    damageEvents,
    selectedTargetId,
    fight,
    id,
  ]);

  // Update the critical multiplier state when data changes
  React.useEffect(() => {
    setCriticalMultiplier(criticalMultiplierData);
  }, [criticalMultiplierData]);

  // Compute critical damage data for this specific player
  const criticalDamageData = React.useMemo(() => {
    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;

    if (!selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return null;
    }

    // Build intervals for all dynamic effects (buffs/debuffs) using helper function
    const effectIntervals = new Map<string, Array<{ start: number; end: number }>>();

    for (const effect of CRITICAL_DAMAGE_EFFECTS) {
      if (effect.isPassive) continue; // Skip static passives

      let events: LogEvent[] = [];

      if (effect.isDebuff) {
        // Get debuff events on target
        events = debuffEvents.filter(
          (event) =>
            (event.type === 'applydebuff' || event.type === 'removedebuff') &&
            String(event.targetID) === selectedTargetId &&
            event.abilityGameID === effect.abilityId
        );
      } else {
        // Get buff events on player
        events = friendlyBuffEvents.filter(
          (event) =>
            (event.type === 'applybuff' || event.type === 'removebuff') &&
            event.targetID === id &&
            event.abilityGameID === effect.abilityId
        );
      }

      const intervals = buildEffectIntervals(
        events,
        fightEnd,
        effect.isDebuff ? 'applydebuff' : 'applybuff',
        effect.isDebuff ? 'removedebuff' : 'removebuff'
      );
      effectIntervals.set(effect.name, intervals);
    }

    // Find combatant info for static sources
    const combatantInfoEvent = combatantInfoEvents.find(
      (event) => event.type === 'combatantinfo' && event.sourceID === id && event.fight === fight.id
    );
    const latestAuras = combatantInfoEvent?.auras ?? [];
    const mediumArmorCount = combatantInfoEvent?.gear?.filter(isMediumArmor).length || 0;

    // Create sources list with uptime calculations
    const sources: CriticalDamageSource[] = [];
    const fightDurationMs = fightEnd - fightStart;

    for (const effect of CRITICAL_DAMAGE_EFFECTS) {
      let wasActive = false;
      let value = effect.value;
      let description = effect.description;

      if (effect.name === 'Base Critical Damage') {
        wasActive = true;
      } else if (effect.isPassive) {
        wasActive = hasAura(latestAuras, effect.abilityId, effect.abilityNameFragment);

        if (effect.requiresMediumArmor && wasActive) {
          value = mediumArmorCount * effect.value;
          description = `${effect.description} (${mediumArmorCount} pieces)`;
          wasActive = mediumArmorCount > 0;
        }
      } else {
        // Dynamic effect - check if it has any uptime
        const intervals = effectIntervals.get(effect.name) || [];
        wasActive = intervals.length > 0;

        if (wasActive) {
          const uptimePercent = calculateUptimePercentage(intervals, fightDurationMs);
          description = `${effect.description}. Uptime: ${uptimePercent.toFixed(1)}%`;

          // Add ESO Logs link
          let link: string | undefined;
          if (reportId) {
            if (effect.isDebuff && selectedTargetId) {
              link = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&spells=debuffs&hostility=1&ability=${effect.abilityId}&source=${selectedTargetId}`;
            } else if (!effect.isDebuff) {
              link = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&spells=buffs&hostility=0&ability=${effect.abilityId}&source=${id}`;
            }
          }

          sources.push({
            name: effect.name,
            value,
            wasActive,
            description,
            link,
          });
        } else {
          sources.push({
            name: effect.name,
            value,
            wasActive,
            description,
          });
        }
      }
    }

    setCriticalDamageSources(sources);

    // Create high-resolution timeline data
    const fightDurationSeconds = (fightEnd - fightStart) / 1000;
    const highResDataPoints: CriticalDamageDataPoint[] = [];

    // Generate high-resolution data (0.1 second increments)
    const resolution = 0.1; // seconds
    const totalSteps = Math.ceil(fightDurationSeconds / resolution);

    for (let step = 0; step <= totalSteps; step++) {
      const relativeTime = step * resolution;
      const timestamp = fightStart + relativeTime * 1000;

      let critDmg = 50; // Base critical damage

      // Add all effects active at this timestamp
      for (const effect of CRITICAL_DAMAGE_EFFECTS) {
        if (effect.name === 'Base Critical Damage') continue; // Already added

        let isActive = false;
        let value = effect.value;

        if (effect.isPassive) {
          isActive = hasAura(latestAuras, effect.abilityId, effect.abilityNameFragment);

          if (effect.requiresMediumArmor && isActive) {
            value = mediumArmorCount * effect.value;
            isActive = mediumArmorCount > 0;
          }
        } else {
          // Check if dynamic effect is active at this timestamp
          const intervals = effectIntervals.get(effect.name) || [];
          isActive = intervals.some(
            (interval) => timestamp >= interval.start && timestamp < interval.end
          );
        }

        if (isActive) {
          critDmg += value;
        }
      }

      highResDataPoints.push({
        timestamp,
        criticalDamage: critDmg,
        relativeTime,
      });
    }

    // Downsample to 0.5 second increments using the highest value within each increment
    const dataPoints: CriticalDamageDataPoint[] = [];
    const downsampleInterval = 0.5; // seconds
    const downsampleSteps = Math.ceil(fightDurationSeconds / downsampleInterval);

    for (let downsampleStep = 0; downsampleStep <= downsampleSteps; downsampleStep++) {
      const startTime = downsampleStep * downsampleInterval;
      const endTime = (downsampleStep + 1) * downsampleInterval;

      // Find all high-res points within this 0.5 second window
      const windowPoints = highResDataPoints.filter(isTimeWindowPoint(startTime, endTime));

      if (windowPoints.length > 0) {
        // Find the point with the highest critical damage value
        const maxPoint = windowPoints.reduce(findMaxCriticalDamagePoint);

        // Create the downsampled point using the timestamp of the max point but with rounded relative time
        dataPoints.push({
          timestamp: fightStart + startTime * 1000, // Use start of window for consistent timing
          criticalDamage: maxPoint.criticalDamage,
          relativeTime: startTime,
        });
      }
    }

    const playerData: PlayerCriticalDamageData = {
      playerId: id,
      playerName: name,
      dataPoints,
    };

    return playerData;
  }, [
    id,
    name,
    debuffEvents,
    friendlyBuffEvents,
    combatantInfoEvents,
    fight,
    selectedTargetId,
    fightId,
    reportId,
  ]);

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
            {criticalMultiplier && (
              <Typography variant="body2" color="#d32f2f" sx={{ fontWeight: 'bold' }}>
                Crit Multiplier: {criticalMultiplier.criticalMultiplier.toFixed(2)}x
                {criticalMultiplier.unaccountedCritDamagePercent > 0 && (
                  <span style={{ color: '#ff9800', fontSize: '0.75rem', marginLeft: '4px' }}>
                    (+{criticalMultiplier.unaccountedCritDamagePercent.toFixed(1)}% unknown)
                  </span>
                )}
              </Typography>
            )}
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
            <StatChecklist
              sources={criticalDamageSources}
              title="Critical Damage Sources"
              loading={!criticalDamageSources.length}
            />

            {/* Critical Multiplier Information */}
            {criticalMultiplier && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Critical Multiplier Analysis
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Ability:</strong> {criticalMultiplier.abilityName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Normal Damage (Avg):</strong>{' '}
                  {criticalMultiplier.normalDamage.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Critical Damage (Avg):</strong>{' '}
                  {criticalMultiplier.criticalDamage.toLocaleString()}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#d32f2f', mb: 2 }}>
                  <strong>Critical Multiplier:</strong>{' '}
                  {criticalMultiplier.criticalMultiplier.toFixed(2)}x
                </Typography>

                <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem' }}>
                  Critical Damage Analysis at Critical Hit Timestamp:
                </Typography>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Actual Critical Damage Bonus:</strong>{' '}
                  {((criticalMultiplier.criticalMultiplier - 1) * 100).toFixed(1)}%
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    (multiplier: {criticalMultiplier.criticalMultiplier.toFixed(2)}x)
                  </span>
                </Typography>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Expected from Known Sources:</strong>{' '}
                  {(criticalMultiplier.accountedCritDamagePercent + 50).toFixed(1)}% total
                  <span style={{ color: '#666', marginLeft: '4px' }}>
                    (50% base + {criticalMultiplier.accountedCritDamagePercent.toFixed(1)}% bonus)
                  </span>
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mb: 2,
                    color:
                      criticalMultiplier.unaccountedCritDamagePercent > 0 ? '#d32f2f' : '#2e7d32',
                    fontWeight: 'bold',
                  }}
                >
                  <strong>Unaccounted Critical Damage:</strong>{' '}
                  {criticalMultiplier.unaccountedCritDamagePercent.toFixed(1)}%
                  {criticalMultiplier.unaccountedCritDamagePercent > 0 &&
                    ' (This could be from unknown sources like gear sets, mundus stones, or other effects)'}
                </Typography>

                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Active Critical Damage Sources at Critical Hit:
                </Typography>
                {criticalMultiplier.activeSources.map((source, index) => (
                  <Typography key={index} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                    • {source.name}: +{source.value}% ({source.description})
                  </Typography>
                ))}

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2, fontStyle: 'italic' }}
                >
                  Critical damage bonuses are additive before being applied as a multiplier. For
                  example, if you have 75% critical damage total (50% base + 25% from sources), your
                  critical hits will do 175% of normal damage (1.75x multiplier). This analysis
                  compares the actual multiplier observed in combat against what we expect from
                  known additive sources.
                </Typography>
              </Paper>
            )}

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
                          title: formatTooltipTitle,
                          label: formatTooltipLabel,
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
                          targetLine: {
                            type: 'line',
                            yMin: 125,
                            yMax: 125,
                            borderColor: '#2e7d32',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                              content: 'Target: 125%',
                              display: true,
                              position: 'end',
                              backgroundColor: 'rgba(46, 125, 50, 0.8)',
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
                          callback: formatXAxisTick,
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
                          callback: formatYAxisTick,
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
