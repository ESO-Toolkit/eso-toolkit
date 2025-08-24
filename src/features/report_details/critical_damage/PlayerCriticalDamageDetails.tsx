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

import { StatChecklist } from '../../../components/StatChecklist';
import { FightFragment } from '../../../graphql/generated';
import { useReportFightParams } from '../../../hooks/useReportFightParams';
import {
  selectDamageEvents,
  selectBuffEvents,
  selectDebuffEvents,
} from '../../../store/events_data/actions';
import { RootState } from '../../../store/storeWithHistory';
import { KnownAbilities, CriticalDamageValues } from '../../../types/abilities';
import {
  CombatantGear,
  CombatantInfoEvent,
  CombatantAura,
  LogEvent,
  DamageEvent,
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

interface PlayerCriticalDamageDetailsProps {
  id: string;
  name: string;
  fight: FightFragment;
  expanded?: boolean;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const PlayerCriticalDamageDetails: React.FC<PlayerCriticalDamageDetailsProps> = ({
  id,
  name,
  fight,
  expanded = false,
  onExpandChange,
}) => {
  const [searchParams] = useSearchParams();
  const { reportId, fightId } = useReportFightParams();

  const selectedTargetId = searchParams.get('target') || '';

  // State for computed data
  const [criticalDamageSources, setCriticalDamageSources] = React.useState<CriticalDamageSource[]>(
    []
  );
  const [criticalMultiplier, setCriticalMultiplier] = React.useState<CriticalMultiplierInfo | null>(
    null
  );

  const combatantInfoEvents = useSelector((state: RootState) => state.events.combatantInfo.events);

  // SIMPLIFIED: Use basic selectors directly instead of complex object-creating selectors
  const damageEvents = useSelector(selectDamageEvents);
  const buffEvents = useSelector(selectBuffEvents);
  const debuffEvents = useSelector(selectDebuffEvents);

  // Combine all events for compatibility with existing code
  const fightEvents = React.useMemo(() => {
    return [...damageEvents, ...buffEvents, ...debuffEvents, ...combatantInfoEvents];
  }, [damageEvents, buffEvents, debuffEvents, combatantInfoEvents]);

  // Calculate base critical damage for this specific player
  const playerBaseCriticalDamage = React.useMemo(() => {
    if (!selectedTargetId) {
      return 0;
    }

    // Find the combatantinfo event for this player in this specific fight
    const combatantInfoEvent = combatantInfoEvents.find(
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
      (aura: CombatantAura) =>
        aura.ability === KnownAbilities.LUCENT_ECHOES || aura.name?.includes('Lucent Echoes')
    );

    // Add Lucent Echoes critical damage bonus
    if (hasLucentEchoes) {
      baseCriticalDamage += CriticalDamageValues.LUCENT_ECHOES;
    }

    // Check Hemorrhage passive from player auras
    const hasHemorrhage = latestAuras.some(
      (aura: CombatantAura) =>
        aura.ability === KnownAbilities.HEMORRHAGE || aura.name?.includes('Hemorrhage')
    );

    // Add Hemorrhage critical damage bonus
    if (hasHemorrhage) {
      baseCriticalDamage += CriticalDamageValues.HEMORRHAGE;
    }

    // Check Piercing Spear passive from player auras
    const hasPiercingSpear = latestAuras.some(
      (aura: CombatantAura) =>
        aura.ability === KnownAbilities.PIERCING_SPEAR || aura.name?.includes('Piercing Spear')
    );

    // Add Piercing Spear critical damage bonus
    if (hasPiercingSpear) {
      baseCriticalDamage += CriticalDamageValues.PIERCING_SPEAR;
    }

    // Check Advanced Species passive from player auras
    const hasAdvancedSpecies = latestAuras.some(
      (aura: CombatantAura) =>
        aura.ability === KnownAbilities.ADVANCED_SPECIES || aura.name?.includes('Advanced Species')
    );

    // Add Advanced Species critical damage bonus
    if (hasAdvancedSpecies) {
      baseCriticalDamage += CriticalDamageValues.ADVANCED_SPECIES;
    }

    // Check Dexterity passive from player auras
    const hasDexterity = latestAuras.some(
      (aura: CombatantAura) =>
        aura.ability === KnownAbilities.DEXTERITY || aura.name?.includes('Dexterity')
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
  }, [combatantInfoEvents, selectedTargetId, fight, id]);

  // Helper function to check if a buff is active at a timestamp
  const isBuffActiveAtTimestamp = React.useCallback(
    (timestamp: number, buffEvents: LogEvent[], fightStart: number, fightEnd: number): boolean => {
      const intervals: Array<{ start: number; end: number }> = [];
      let activeStart: number | null = null;

      for (const event of buffEvents) {
        if (event.type === 'applybuff') {
          if (activeStart === null) activeStart = event.timestamp;
        } else if (event.type === 'removebuff') {
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
    },
    []
  );

  // Helper function to check if a debuff is active at a timestamp
  const isDebuffActiveAtTimestamp = React.useCallback(
    (
      timestamp: number,
      debuffEvents: LogEvent[],
      fightStart: number,
      fightEnd: number
    ): boolean => {
      const intervals: Array<{ start: number; end: number }> = [];
      let activeStart: number | null = null;

      for (const event of debuffEvents) {
        if (event.type === 'applydebuff') {
          if (activeStart === null) activeStart = event.timestamp;
        } else if (event.type === 'removedebuff') {
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
    },
    []
  );

  // Helper function to calculate critical damage percentage at a specific timestamp
  const calculateCriticalDamageAtTimestamp = React.useCallback(
    (
      timestamp: number,
      events: LogEvent[],
      playerId: string,
      targetId: string,
      fightData: FightFragment
    ): number => {
      const fightStart = fightData.startTime;
      const fightEnd = fightData.endTime;

      // Find combatant info for auras
      const combatantInfoEvent = events.find(
        (event): event is CombatantInfoEvent =>
          event.type === 'combatantinfo' &&
          String(event.sourceID) === playerId &&
          'fight' in event &&
          event.fight === fightData.id
      );
      const latestAuras = combatantInfoEvent?.auras ?? [];
      const mediumArmorCount =
        combatantInfoEvent?.gear?.filter((gear: CombatantGear) => gear.type === 2).length || 0;

      // Start with base critical damage
      let critDmg = 50;

      // Add static passives
      if (
        latestAuras.some(
          (aura) =>
            aura.ability === KnownAbilities.FATED_FORTUNE_STAGE_ONE ||
            aura.name?.includes('Fated Fortune')
        )
      ) {
        critDmg += CriticalDamageValues.FATED_FORTUNE;
      }
      if (
        latestAuras.some(
          (aura) => aura.ability === KnownAbilities.HEMORRHAGE || aura.name?.includes('Hemorrhage')
        )
      ) {
        critDmg += CriticalDamageValues.HEMORRHAGE;
      }
      if (
        latestAuras.some(
          (aura) =>
            aura.ability === KnownAbilities.PIERCING_SPEAR || aura.name?.includes('Piercing Spear')
        )
      ) {
        critDmg += CriticalDamageValues.PIERCING_SPEAR;
      }
      if (
        latestAuras.some(
          (aura) =>
            aura.ability === KnownAbilities.ADVANCED_SPECIES ||
            aura.name?.includes('Advanced Species')
        )
      ) {
        critDmg += CriticalDamageValues.ADVANCED_SPECIES;
      }
      if (
        mediumArmorCount > 0 &&
        latestAuras.some(
          (aura) => aura.ability === KnownAbilities.DEXTERITY || aura.name?.includes('Dexterity')
        )
      ) {
        critDmg += mediumArmorCount * CriticalDamageValues.DEXTERITY_PER_PIECE;
      }

      // Check dynamic buffs active at this timestamp
      // Lucent Echoes
      const lucentEchoesEvents = events.filter(
        (event) =>
          (event.type === 'applybuff' || event.type === 'removebuff') &&
          String(event.targetID ?? event.target ?? '') === playerId &&
          ((event.abilityGameID ?? event.abilityId) === KnownAbilities.LUCENT_ECHOES ||
            (event.abilityName ?? '').includes('Lucent Echoes'))
      );
      if (isBuffActiveAtTimestamp(timestamp, lucentEchoesEvents, fightStart, fightEnd)) {
        critDmg += CriticalDamageValues.LUCENT_ECHOES;
      }

      // Minor Force
      const minorForceEvents = events.filter(
        (event) =>
          (event.type === 'applybuff' || event.type === 'removebuff') &&
          String(event.targetID ?? event.target ?? '') === playerId &&
          ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MINOR_FORCE ||
            (event.abilityName ?? '').includes('Minor Force'))
      );
      if (isBuffActiveAtTimestamp(timestamp, minorForceEvents, fightStart, fightEnd)) {
        critDmg += 10;
      }

      // Major Force
      const majorForceEvents = events.filter(
        (event) =>
          (event.type === 'applybuff' || event.type === 'removebuff') &&
          String(event.targetID ?? event.target ?? '') === playerId &&
          ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MAJOR_FORCE ||
            (event.abilityName ?? '').includes('Major Force'))
      );
      if (isBuffActiveAtTimestamp(timestamp, majorForceEvents, fightStart, fightEnd)) {
        critDmg += 20;
      }

      // Minor Brittle (on target)
      const minorBrittleEvents = events.filter(
        (event) =>
          (event.type === 'applydebuff' || event.type === 'removedebuff') &&
          String(event.targetID ?? event.target ?? '') === targetId &&
          ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MINOR_BRITTLE ||
            (event.abilityName ?? '').includes('Minor Brittle'))
      );
      if (isDebuffActiveAtTimestamp(timestamp, minorBrittleEvents, fightStart, fightEnd)) {
        critDmg += 10;
      }

      // Major Brittle (on target)
      const majorBrittleEvents = events.filter(
        (event) =>
          (event.type === 'applydebuff' || event.type === 'removedebuff') &&
          String(event.targetID ?? event.target ?? '') === targetId &&
          ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MAJOR_BRITTLE ||
            (event.abilityName ?? '').includes('Major Brittle'))
      );
      if (isDebuffActiveAtTimestamp(timestamp, majorBrittleEvents, fightStart, fightEnd)) {
        critDmg += 20;
      }

      return critDmg;
    },
    [isBuffActiveAtTimestamp, isDebuffActiveAtTimestamp]
  );

  // Helper function to get active critical damage sources at a specific timestamp
  const getActiveCriticalDamageSourcesAtTimestamp = React.useCallback(
    (
      timestamp: number,
      events: LogEvent[],
      playerId: string,
      targetId: string,
      fightData: FightFragment
    ): CriticalDamageSource[] => {
      const sources: CriticalDamageSource[] = [];
      const fightStart = fightData.startTime;
      const fightEnd = fightData.endTime;

      // Find combatant info for auras
      const combatantInfoEvent = events.find(
        (event): event is CombatantInfoEvent =>
          event.type === 'combatantinfo' &&
          String(event.sourceID) === playerId &&
          'fight' in event &&
          event.fight === fightData.id
      );
      const latestAuras = combatantInfoEvent?.auras ?? [];
      const mediumArmorCount =
        combatantInfoEvent?.gear?.filter((gear: CombatantGear) => gear.type === 2).length || 0;

      // Base critical damage
      sources.push({
        name: 'Base Critical Damage',
        value: 50,
        wasActive: true,
        description: 'Default critical damage bonus that all players start with',
      });

      // Static passives
      if (
        latestAuras.some(
          (aura) => aura.ability === KnownAbilities.HEMORRHAGE || aura.name?.includes('Hemorrhage')
        )
      ) {
        sources.push({
          name: 'Hemorrhage',
          value: CriticalDamageValues.HEMORRHAGE,
          wasActive: true,
          description: 'Passive that provides 10% critical damage bonus',
        });
      }

      if (
        latestAuras.some(
          (aura) =>
            aura.ability === KnownAbilities.PIERCING_SPEAR || aura.name?.includes('Piercing Spear')
        )
      ) {
        sources.push({
          name: 'Piercing Spear',
          value: CriticalDamageValues.PIERCING_SPEAR,
          wasActive: true,
          description: 'Passive that provides 12% critical damage bonus',
        });
      }

      if (
        latestAuras.some(
          (aura) =>
            aura.ability === KnownAbilities.ADVANCED_SPECIES ||
            aura.name?.includes('Advanced Species')
        )
      ) {
        sources.push({
          name: 'Advanced Species',
          value: CriticalDamageValues.ADVANCED_SPECIES,
          wasActive: true,
          description: 'Passive that provides 15% critical damage bonus',
        });
      }

      if (
        latestAuras.some(
          (aura) =>
            aura.ability === KnownAbilities.FATED_FORTUNE_STAGE_ONE ||
            aura.name?.includes('Fated Fortune')
        )
      ) {
        sources.push({
          name: 'Fated Fortune',
          value: CriticalDamageValues.FATED_FORTUNE,
          wasActive: true,
          description: 'Passive that provides 12% critical damage bonus',
        });
      }

      if (
        mediumArmorCount > 0 &&
        latestAuras.some(
          (aura) => aura.ability === KnownAbilities.DEXTERITY || aura.name?.includes('Dexterity')
        )
      ) {
        sources.push({
          name: 'Dexterity',
          value: mediumArmorCount * CriticalDamageValues.DEXTERITY_PER_PIECE,
          wasActive: true,
          description: `Passive that provides 2% critical damage per piece of medium armor worn (${mediumArmorCount} pieces)`,
        });
      }

      // Dynamic buffs/debuffs
      const lucentEchoesEvents = events.filter(
        (event) =>
          (event.type === 'applybuff' || event.type === 'removebuff') &&
          String(event.targetID ?? event.target ?? '') === playerId &&
          ((event.abilityGameID ?? event.abilityId) === KnownAbilities.LUCENT_ECHOES ||
            (event.abilityName ?? '').includes('Lucent Echoes'))
      );
      if (isBuffActiveAtTimestamp(timestamp, lucentEchoesEvents, fightStart, fightEnd)) {
        sources.push({
          name: 'Lucent Echoes',
          value: CriticalDamageValues.LUCENT_ECHOES,
          wasActive: true,
          description: 'Buff that provides 11% critical damage bonus',
        });
      }

      const minorForceEvents = events.filter(
        (event) =>
          (event.type === 'applybuff' || event.type === 'removebuff') &&
          String(event.targetID ?? event.target ?? '') === playerId &&
          ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MINOR_FORCE ||
            (event.abilityName ?? '').includes('Minor Force'))
      );
      if (isBuffActiveAtTimestamp(timestamp, minorForceEvents, fightStart, fightEnd)) {
        sources.push({
          name: 'Minor Force',
          value: 10,
          wasActive: true,
          description: 'Buff that provides 10% critical damage',
        });
      }

      const majorForceEvents = events.filter(
        (event) =>
          (event.type === 'applybuff' || event.type === 'removebuff') &&
          String(event.targetID ?? event.target ?? '') === playerId &&
          ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MAJOR_FORCE ||
            (event.abilityName ?? '').includes('Major Force'))
      );
      if (isBuffActiveAtTimestamp(timestamp, majorForceEvents, fightStart, fightEnd)) {
        sources.push({
          name: 'Major Force',
          value: 20,
          wasActive: true,
          description: 'Buff that provides 20% critical damage',
        });
      }

      const minorBrittleEvents = events.filter(
        (event) =>
          (event.type === 'applydebuff' || event.type === 'removedebuff') &&
          String(event.targetID ?? event.target ?? '') === targetId &&
          ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MINOR_BRITTLE ||
            (event.abilityName ?? '').includes('Minor Brittle'))
      );
      if (isDebuffActiveAtTimestamp(timestamp, minorBrittleEvents, fightStart, fightEnd)) {
        sources.push({
          name: 'Minor Brittle',
          value: 10,
          wasActive: true,
          description: 'Debuff that provides 10% critical damage',
        });
      }

      const majorBrittleEvents = events.filter(
        (event) =>
          (event.type === 'applydebuff' || event.type === 'removedebuff') &&
          String(event.targetID ?? event.target ?? '') === targetId &&
          ((event.abilityGameID ?? event.abilityId) === KnownAbilities.MAJOR_BRITTLE ||
            (event.abilityName ?? '').includes('Major Brittle'))
      );
      if (isDebuffActiveAtTimestamp(timestamp, majorBrittleEvents, fightStart, fightEnd)) {
        sources.push({
          name: 'Major Brittle',
          value: 20,
          wasActive: true,
          description: 'Debuff that provides 20% critical damage',
        });
      }

      return sources.filter((source) => source.wasActive);
    },
    [isBuffActiveAtTimestamp, isDebuffActiveAtTimestamp]
  );

  // Calculate critical multiplier by finding pairs of critical and normal hits
  const criticalMultiplierData = React.useMemo(() => {
    if (!fightEvents.length || !selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return null;
    }

    // Get damage events for this player against the selected target
    const playerDamageEvents = fightEvents.filter(
      (event): event is DamageEvent =>
        event.type === 'damage' &&
        String(event.sourceID) === id &&
        String(event.targetID ?? event.target ?? '') === selectedTargetId &&
        typeof event.amount === 'number' &&
        event.amount > 0 &&
        typeof event.hitType === 'number' &&
        Boolean(event.abilityGameID || event.abilityId)
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
        const avgCriticalDamage =
          critical.reduce((sum: number, event: DamageEvent) => sum + (event.amount ?? 0), 0) /
          critical.length;
        const avgNormalDamage =
          normal.reduce((sum: number, event: DamageEvent) => sum + (event.amount ?? 0), 0) /
          normal.length;

        if (avgNormalDamage > 0) {
          const multiplier = avgCriticalDamage / avgNormalDamage;

          // Use the first critical hit for timestamp analysis
          const criticalEvent = critical[0];
          const criticalTimestamp = criticalEvent.timestamp;

          // Calculate what the critical damage % should be at this timestamp
          const accountedCritDamage = calculateCriticalDamageAtTimestamp(
            criticalTimestamp,
            fightEvents,
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
            fightEvents,
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
    fightEvents,
    selectedTargetId,
    fight,
    id,
    calculateCriticalDamageAtTimestamp,
    getActiveCriticalDamageSourcesAtTimestamp,
  ]);

  // Update the critical multiplier state when data changes
  React.useEffect(() => {
    setCriticalMultiplier(criticalMultiplierData);
  }, [criticalMultiplierData]);

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

    // Track Lucent Echoes buff uptimes for the selected player
    // Find all buff events for Lucent Echoes where target is selected player
    const lucentEchoesEvents = fightEvents.filter(
      (event) =>
        (event.type === 'applybuff' || event.type === 'removebuff') &&
        String(event.targetID ?? event.target ?? '') === id &&
        ((event.abilityGameID ?? event.abilityId) === KnownAbilities.LUCENT_ECHOES ||
          (event.abilityName ?? '').includes('Lucent Echoes'))
    );

    // Build a timeline of Lucent Echoes active intervals
    const lucentEchoesIntervals: Array<{ start: number; end: number }> = [];
    let lucentEchoesActiveStart: number | null = null;
    for (const event of lucentEchoesEvents) {
      if (event.type === 'applybuff') {
        if (lucentEchoesActiveStart === null) lucentEchoesActiveStart = event.timestamp;
      } else if (event.type === 'removebuff') {
        if (lucentEchoesActiveStart !== null) {
          lucentEchoesIntervals.push({ start: lucentEchoesActiveStart, end: event.timestamp });
          lucentEchoesActiveStart = null;
        }
      }
    }
    // If Lucent Echoes was never removed, assume it lasts until fight end
    if (lucentEchoesActiveStart !== null) {
      lucentEchoesIntervals.push({ start: lucentEchoesActiveStart, end: fightEnd });
    }

    // Track Fated Fortune buff uptimes for the selected player
    // Find all buff events for Fated Fortune where target is selected player
    const fatedFortuneEvents = fightEvents.filter(
      (event) =>
        (event.type === 'applybuff' || event.type === 'removebuff') &&
        String(event.targetID ?? event.target ?? '') === id &&
        ((event.abilityGameID ?? event.abilityId) === KnownAbilities.FATED_FORTUNE_STAGE_ONE ||
          (event.abilityName ?? '').includes('Fated Fortune'))
    );

    // Build a timeline of Fated Fortune active intervals
    const fatedFortuneIntervals: Array<{ start: number; end: number }> = [];
    let fatedFortuneActiveStart: number | null = null;
    for (const event of fatedFortuneEvents) {
      if (event.type === 'applybuff') {
        if (fatedFortuneActiveStart === null) fatedFortuneActiveStart = event.timestamp;
      } else if (event.type === 'removebuff') {
        if (fatedFortuneActiveStart !== null) {
          fatedFortuneIntervals.push({ start: fatedFortuneActiveStart, end: event.timestamp });
          fatedFortuneActiveStart = null;
        }
      }
    }
    // If Fated Fortune was never removed, assume it lasts until fight end
    if (fatedFortuneActiveStart !== null) {
      fatedFortuneIntervals.push({ start: fatedFortuneActiveStart, end: fightEnd });
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

    // Create high-resolution timeline data first (0.1 second intervals)
    const fightDurationSeconds = (fightEnd - fightStart) / 1000;
    const highResDataPoints: CriticalDamageDataPoint[] = [];
    let minorForceUptimeSeconds = 0;
    let majorForceUptimeSeconds = 0;
    let minorBrittleUptimeSeconds = 0;
    let majorBrittleUptimeSeconds = 0;
    let lucentEchoesUptimeSeconds = 0;
    let fatedFortuneUptimeSeconds = 0;

    // Generate high-resolution data (0.1 second increments)
    const resolution = 0.1; // seconds
    const totalSteps = Math.ceil(fightDurationSeconds / resolution);

    for (let step = 0; step <= totalSteps; step++) {
      const relativeTime = step * resolution;
      const timestamp = fightStart + relativeTime * 1000;

      // Start with base critical damage (without buffs that vary over time)
      // This includes passives like Fated Fortune, Hemorrhage, etc. that are always active
      let critDmg = 50; // Base critical damage

      // Add passives that are always active (from gear/talents)
      // Note: We'll recalculate these from auras since Lucent Echoes might not always be active
      const currentAuras = latestAuras; // Using latest auras as approximation for static passives

      // Add static passives that don't change during combat
      if (
        currentAuras.some(
          (aura) =>
            aura.ability === KnownAbilities.FATED_FORTUNE_STAGE_ONE ||
            aura.name?.includes('Fated Fortune')
        )
      ) {
        critDmg += CriticalDamageValues.FATED_FORTUNE;
      }
      if (
        currentAuras.some(
          (aura) => aura.ability === KnownAbilities.HEMORRHAGE || aura.name?.includes('Hemorrhage')
        )
      ) {
        critDmg += CriticalDamageValues.HEMORRHAGE;
      }
      if (
        currentAuras.some(
          (aura) =>
            aura.ability === KnownAbilities.PIERCING_SPEAR || aura.name?.includes('Piercing Spear')
        )
      ) {
        critDmg += CriticalDamageValues.PIERCING_SPEAR;
      }
      if (
        currentAuras.some(
          (aura) =>
            aura.ability === KnownAbilities.ADVANCED_SPECIES ||
            aura.name?.includes('Advanced Species')
        )
      ) {
        critDmg += CriticalDamageValues.ADVANCED_SPECIES;
      }
      if (
        mediumArmorCount > 0 &&
        currentAuras.some(
          (aura) => aura.ability === KnownAbilities.DEXTERITY || aura.name?.includes('Dexterity')
        )
      ) {
        critDmg += mediumArmorCount * CriticalDamageValues.DEXTERITY_PER_PIECE;
      }

      // Check if Lucent Echoes is active at this timestamp (dynamic buff)
      const isLucentEchoesActive = lucentEchoesIntervals.some(
        (interval) => timestamp >= interval.start && timestamp < interval.end
      );
      if (isLucentEchoesActive) {
        critDmg += CriticalDamageValues.LUCENT_ECHOES;
        if (step % Math.round(1 / resolution) === 0) lucentEchoesUptimeSeconds++; // Count per second
      }

      // Check if Fated Fortune is active at this timestamp (dynamic buff)
      const isFatedFortuneActive = fatedFortuneIntervals.some(
        (interval) => timestamp >= interval.start && timestamp < interval.end
      );
      if (isFatedFortuneActive) {
        critDmg += CriticalDamageValues.FATED_FORTUNE;
        if (step % Math.round(1 / resolution) === 0) fatedFortuneUptimeSeconds++; // Count per second
      }

      // Check if Minor Force is active at this timestamp
      const isMinorForceActive = minorForceIntervals.some(
        (interval) => timestamp >= interval.start && timestamp < interval.end
      );
      if (isMinorForceActive) {
        critDmg += 10;
        if (step % Math.round(1 / resolution) === 0) minorForceUptimeSeconds++; // Count per second
      }
      // Check if Major Force is active at this timestamp
      const isMajorForceActive = majorForceIntervals.some(
        (interval) => timestamp >= interval.start && timestamp < interval.end
      );
      if (isMajorForceActive) {
        critDmg += 20;
        if (step % Math.round(1 / resolution) === 0) majorForceUptimeSeconds++; // Count per second
      }
      // Check if Minor Brittle is active at this timestamp
      const isMinorBrittleActive = minorBrittleIntervals.some(
        (interval) => timestamp >= interval.start && timestamp < interval.end
      );
      if (isMinorBrittleActive) {
        critDmg += 10;
        if (step % Math.round(1 / resolution) === 0) minorBrittleUptimeSeconds++; // Count per second
      }
      // Check if Major Brittle is active at this timestamp
      const isMajorBrittleActive = majorBrittleIntervals.some(
        (interval) => timestamp >= interval.start && timestamp < interval.end
      );
      if (isMajorBrittleActive) {
        critDmg += 20;
        if (step % Math.round(1 / resolution) === 0) majorBrittleUptimeSeconds++; // Count per second
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
      const windowPoints = highResDataPoints.filter(
        (point) => point.relativeTime >= startTime && point.relativeTime < endTime
      );

      if (windowPoints.length > 0) {
        // Find the point with the highest critical damage value
        const maxPoint = windowPoints.reduce((max, point) =>
          point.criticalDamage > max.criticalDamage ? point : max
        );

        // Create the downsampled point using the timestamp of the max point but with rounded relative time
        dataPoints.push({
          timestamp: fightStart + startTime * 1000, // Use start of window for consistent timing
          criticalDamage: maxPoint.criticalDamage,
          relativeTime: startTime,
        });
      }
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

    // Add Lucent Echoes to sources list (ESO Logs link)
    let lucentEchoesLink: string | undefined;
    if (reportId && id) {
      lucentEchoesLink = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&spells=buffs&hostility=0&ability=${KnownAbilities.LUCENT_ECHOES}&source=${id}`;
    }
    sources.push({
      name: 'Lucent Echoes',
      value: CriticalDamageValues.LUCENT_ECHOES,
      wasActive: lucentEchoesUptimeSeconds > 0,
      description: `Buff that provides 11% critical damage bonus. Uptime: ${((lucentEchoesUptimeSeconds / (fightDurationSeconds + 1)) * 100).toFixed(1)}%`,
      link: lucentEchoesLink,
    });

    // Add Fated Fortune to sources list (ESO Logs link)
    let fatedFortuneLink: string | undefined;
    if (reportId && id) {
      fatedFortuneLink = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&spells=buffs&hostility=0&ability=${KnownAbilities.FATED_FORTUNE_STAGE_ONE}&source=${id}`;
    }
    sources.push({
      name: 'Fated Fortune',
      value: CriticalDamageValues.FATED_FORTUNE,
      wasActive: fatedFortuneUptimeSeconds > 0,
      description: `Buff that provides 12% critical damage bonus. Uptime: ${((fatedFortuneUptimeSeconds / (fightDurationSeconds + 1)) * 100).toFixed(1)}%`,
      link: fatedFortuneLink,
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
  }, [id, name, fightEvents, fight, selectedTargetId, fightId, reportId]);

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
            <StatChecklist sources={criticalDamageSources} title="Critical Damage Sources" />

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
