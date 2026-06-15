import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import BuildIcon from '@mui/icons-material/Construction';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';

import { abilityIconUrl } from '@/utils/abilityIconCorrections';
import { getArmorWeightCounts } from '@/utils/armorUtils';
import { encodeBuildToURL } from '@/utils/buildEncoding';
import { toClassKey } from '@/utils/classNameUtils';
import { abbreviateFood, detectFoodFromAuras, getFoodColor } from '@/utils/foodDetectionUtils';
import { createGearSetTooltipProps } from '@/utils/gearSetTooltipMapper';
import { buildVariantSx, getGearChipProps } from '@/utils/playerCardStyleUtils';
import { playerToBuild } from '@/utils/playerToBuild';
import {
  abbreviatePotion,
  describePotionType,
  describeResourceRestored,
  detectPotionType,
  getPotionColor,
  type PotionStreamResult,
} from '@/utils/potionDetectionUtils';

import mundusIcon from '../../../assets/MundusStone.png';
import { ClassIcon } from '../../../components/ClassIcon';
import { GearDetailsPanel } from '../../../components/GearDetailsPanel';
import { GearSetTooltip } from '../../../components/GearSetTooltip';
import { LazySkillTooltip as SkillTooltip } from '../../../components/LazySkillTooltip';
import { OneLineAutoFit } from '../../../components/OneLineAutoFit';
import { PlayerIcon } from '../../../components/PlayerIcon';
import { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { CLASS_MASTERY_LINE_NAME } from '../../../data/skill-lines/class/classMastery';
import type { PlayerRoleResult } from '../../../features/role_detection';
import { getRoleEmoji, ROLE_LABELS, toBroadRole } from '../../../hooks/useRoleDetection';
import { selectPlayersByIdForContext } from '../../../store/player_data/playerDataSelectors';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { selectActiveReportContext } from '../../../store/report/reportSelectors';
import type { RootState } from '../../../store/storeWithHistory';
import { selectScribingDetectionsResult } from '../../../store/worker_results';
import type { PlayerGear } from '../../../types/playerDetails';
import { type ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import { BuildIssue } from '../../../utils/detectBuildIssues';
import { PlayerGearSetRecord } from '../../../utils/gearUtilities';
import { resolveActorName } from '../../../utils/resolveActorName';
import { abbreviateSkillLine } from '../../../utils/skillLineDetectionUtils';
import { buildTooltipProps } from '../../../utils/skillTooltipMapper';
import { type BarSwapAnalysisResult } from '../../parse_analysis/utils/parseAnalysisUtils';
import { SCRIBING_DETECTION_SCHEMA_VERSION } from '../../scribing/analysis/scribingDetectionAnalysis';
import { ScribedSkillData } from '../../scribing/types';

import { MetricsScrollRow } from './MetricsScrollRow';
import type { StatChipId } from './statChipConfig';
import { formatStatValue, STAT_CHIP_IDS, STAT_CHIP_META } from './statChipConfig';
import { StatChipIcon } from './StatChipIcon';

/**
 * Renders a gear-set tooltip's content, computing the (expensive) tooltip props only when
 * this component actually mounts — i.e. when MUI opens the tooltip on hover. Building these
 * eagerly for every gear chip across every player card was a major freeze source on
 * high-player-count fights.
 */
const LazyGearSetTooltipContent: React.FC<{
  gearRecord: PlayerGearSetRecord;
  playerGear: PlayerGear[];
}> = ({ gearRecord, playerGear }) => {
  const tooltipProps = React.useMemo(
    () => createGearSetTooltipProps(gearRecord, playerGear),
    [gearRecord, playerGear],
  );

  if (!tooltipProps) {
    return null;
  }

  const { itemCount: _itemCount, ...filteredTooltipProps } = tooltipProps;
  return <GearSetTooltip {...filteredTooltipProps} />;
};

type TalentTooltipProps = ReturnType<typeof buildTooltipProps>;

/**
 * Renders a talent/skill tooltip's content, resolving the (expensive) rich tooltip props only
 * when this component mounts — i.e. when MUI opens the tooltip on hover. The resolver caches per
 * talent, so the underlying buildTooltipProps runs at most once per ability. Resolving eagerly for
 * every talent on mount was a major freeze source on high-player-count fights.
 */
const LazyTalentTooltipContent: React.FC<{
  talent: { guid: number; name: string; abilityIcon?: string };
  isUltimate: boolean;
  resolveProps: (talent: { guid: number; name: string }) => TalentTooltipProps;
  resolveScribedSkillData: (talentGuid: number, talentName: string) => ScribedSkillData | undefined;
  fightId?: string;
  playerId: number;
}> = ({ talent, isUltimate, resolveProps, resolveScribedSkillData, fightId, playerId }) => {
  const rich = resolveProps(talent);
  const base = {
    name: talent.name,
    description: `${talent.name} (ID: ${talent.guid})`,
  };

  return (
    <SkillTooltip
      {...(rich ?? base)}
      name={isUltimate ? `${rich?.name ?? base.name} (Ultimate)` : (rich?.name ?? base.name)}
      iconUrl={rich?.iconUrl || abilityIconUrl(talent.abilityIcon, talent.guid)}
      abilityId={talent.guid}
      scribedSkillData={rich?.scribedSkillData ?? resolveScribedSkillData(talent.guid, talent.name)}
      fightId={fightId}
      playerId={playerId}
    />
  );
};

interface PlayerCardProps {
  player: PlayerDetailsWithRole;
  mundusBuffs: Array<{ name: string; id: number }>;
  championPoints: Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }>;
  auras: Array<{ name: string; id: number; stacks?: number }>;
  scribingSkills: GrimoireData[];
  buildIssues: BuildIssue[];
  classAnalysis?: ClassAnalysisResult;
  deaths: number;
  resurrects: number;
  cpm: number;
  maxHealth: number;
  maxStamina: number;
  maxMagicka: number;
  distanceTraveled: number | null;
  reportId?: string | null;
  fightId?: string | null;
  playerGear: PlayerGearSetRecord[];
  /** Whether this player is the top DPS in the fight */
  isTopDps?: boolean;
  /** The player's total DPS value (used in the badge label) */
  totalDps?: number;
  critDamageSummary?: { avg: number; max: number };
  /** Bar swap analysis result, used to display bar setup pattern on DPS cards */
  barSwapResult?: BarSwapAnalysisResult;
  /** Per-player potion classification from the live fight event stream (Path B detection) */
  potionStreamResult?: PotionStreamResult;
  /** Player's DPS value */
  dpsValue?: number;
  /** Player's HPS value */
  hpsValue?: number;
  /** Player's total damage dealt */
  totalDamage?: number;
  /** Player's total critical hit damage */
  totalCritDamage?: number;
  /** Player's critical DPS (crit damage / duration) */
  critDps?: number;
  /** Player's critical hit chance percentage */
  critChance?: number;
  /** Ordered list of visible stat chip IDs (from customization preferences) */
  visibleChips?: StatChipId[];
  /** Detected role from the role detection algorithm */
  detectedRole?: PlayerRoleResult;
  /** Whether the metrics row wraps chips vertically or scrolls horizontally */
  metricsLayout?: 'scroll' | 'wrap';
}

// Helper function to consolidate build issues
function consolidateBuildIssues(buildIssues: BuildIssue[]): {
  gearQuality: Array<{ gearName: string; quality: number; message: string }>;
  enchantQuality: Array<{ gearName: string; quality: number; message: string }>;
  gearLevel: Array<{ gearName: string; level: number; message: string }>;
  missingBuffs: Array<{ buffName: string; abilityId: number; message: string }>;
} {
  const grouped = {
    gearQuality: [] as Array<{ gearName: string; quality: number; message: string }>,
    enchantQuality: [] as Array<{ gearName: string; quality: number; message: string }>,
    gearLevel: [] as Array<{ gearName: string; level: number; message: string }>,
    missingBuffs: [] as Array<{ buffName: string; abilityId: number; message: string }>,
  };

  buildIssues.forEach((issue) => {
    if ('gearName' in issue) {
      if ('gearQuality' in issue) {
        grouped.gearQuality.push({
          gearName: issue.gearName,
          quality: issue.gearQuality,
          message: issue.message,
        });
      } else if ('enchantQuality' in issue) {
        grouped.enchantQuality.push({
          gearName: issue.gearName,
          quality: issue.enchantQuality,
          message: issue.message,
        });
      } else if ('gearLevel' in issue) {
        grouped.gearLevel.push({
          gearName: issue.gearName,
          level: issue.gearLevel,
          message: issue.message,
        });
      }
    } else if ('buffName' in issue) {
      grouped.missingBuffs.push({
        buffName: issue.buffName,
        abilityId: issue.abilityId,
        message: issue.message,
      });
    }
  });

  return grouped;
}

interface MundusChipProps {
  mundusBuffs: Array<{ name: string; id: number }>;
}

const MundusChip: React.FC<MundusChipProps> = ({ mundusBuffs }) => {
  if (mundusBuffs.length === 0) return null;

  // Since players can only have 1 mundus at a time, get the first/only one
  const mundusBuff = mundusBuffs[0];
  const mundusName = mundusBuff.name.replace(/^Boon:\s*/i, '').replace(/^The\s+/i, '');

  return (
    <Tooltip title={`Mundus: ${mundusName}`} enterTouchDelay={0} leaveTouchDelay={3000}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          minWidth: { xs: 44, sm: 'auto', md: 'auto' },
          minHeight: { xs: 28, sm: 'auto', md: 'auto' },
        }}
      >
        <Box
          component="img"
          src={mundusIcon}
          alt=""
          sx={{ width: { xs: 16, sm: 14, md: 12 }, height: { xs: 16, sm: 14, md: 12 } }}
        />
        <Box component="span" sx={{ margin: { xs: '0 4px', sm: '0 2px', md: '0 1px' } }}></Box>
        <Box
          component="span"
          sx={{
            display: 'inline',
            fontWeight: 700,
            fontSize: { xs: 13, sm: 11, md: 10 },
            letterSpacing: '.01em',
            color: 'primary.main',
            textTransform: 'uppercase',
          }}
        >
          {mundusName}
        </Box>
      </Box>
    </Tooltip>
  );
};

export const PlayerCard: React.FC<PlayerCardProps> = React.memo(
  ({
    player,
    mundusBuffs,
    championPoints,
    auras,
    scribingSkills,
    buildIssues,
    classAnalysis,
    deaths,
    resurrects,
    cpm,
    maxHealth,
    maxStamina,
    maxMagicka,
    distanceTraveled,
    reportId,
    fightId,
    playerGear,
    isTopDps,
    totalDps,
    critDamageSummary,
    barSwapResult,
    potionStreamResult,
    dpsValue,
    hpsValue,
    totalDamage,
    totalCritDamage,
    critDps,
    critChance,
    visibleChips,
    detectedRole,
    metricsLayout = 'scroll',
  }) => {
    const theme = useTheme();

    // Encoded pins filter provided by user for casts view
    const _CASTS_PINS =
      '2%24Off%24%23244F4B%24expression%24ability.id+NOT+IN%2816499%2C28541%2C16165%2C16145%2C18350%2C28549%2C45223%2C18396%2C16277%2C115548%2C85572%2C23196%2C95040%2C39301%2C63507%2C22269%2C95042%2C191078%2C32910%2C41963%2C16261%2C45221%2C48076%2C32974%2C21970%2C41838%2C16565%2C45227%2C118604%2C26832%2C15383%2C45382%2C16420%2C68401%2C47193%2C190583%2C16212%2C228524%2C186981%2C16037%2C15435%2C15279%2C72931%2C45228%2C16688%2C61875%2C61874%29';

    const castsUrl = React.useCallback((rid?: string, fid?: string | null) => {
      if (!rid) return undefined;
      const fightParam = fid ? `&fight=${encodeURIComponent(fid)}` : '';
      return `https://www.esologs.com/reports/${encodeURIComponent(rid)}?type=casts${fightParam}`;
    }, []);

    const talents = React.useMemo(
      () => player?.combatantInfo?.talents ?? [],
      [player?.combatantInfo?.talents],
    );
    const gear = React.useMemo(
      () => (player?.combatantInfo?.gear ?? []).filter((g) => g.id !== 0),
      [player?.combatantInfo?.gear],
    );
    const armorWeights = getArmorWeightCounts(gear);

    // State for gear details panel
    const [gearDetailsOpen, setGearDetailsOpen] = useState(false);
    const [currentGearPlayerId, setCurrentGearPlayerId] = useState<string | number>(player.id);

    // State for metrics auto-scroll and drag functionality

    const activeReportContext = useSelector(selectActiveReportContext);

    const selectorContext = React.useMemo(() => {
      const normalizedReportId =
        typeof reportId === 'string' && reportId.trim().length > 0
          ? reportId.trim()
          : (activeReportContext.reportId ?? null);

      const normalizedFightId =
        typeof fightId === 'string'
          ? fightId.trim().length > 0
            ? fightId.trim()
            : (activeReportContext.fightId ?? null)
          : (fightId ?? activeReportContext.fightId ?? null);

      return {
        reportCode: normalizedReportId,
        fightId: normalizedFightId,
      };
    }, [reportId, fightId, activeReportContext.reportId, activeReportContext.fightId]);

    // Get all players from Redux store scoped to context
    const playersById = useSelector((state: RootState) =>
      selectPlayersByIdForContext(state, selectorContext),
    );
    const allPlayers = React.useMemo(() => Object.values(playersById), [playersById]);

    // Get dynamic skill lines from class analysis. Class Mastery (a U50 passive
    // line only non-subclassed characters can use) is dropped from this chip row:
    // it's redundant noise here — three matching class skill lines already make
    // the class obvious, and Class Mastery is a passive line, not a build choice.
    const detectedSkillLines = (classAnalysis?.skillLines || []).filter(
      (sl) => sl.skillLine !== CLASS_MASTERY_LINE_NAME,
    );

    const foodAura = detectFoodFromAuras(auras);
    const distanceDisplay = React.useMemo(() => {
      if (distanceTraveled == null) {
        return null;
      }

      if (distanceTraveled <= 0) {
        return '0 m';
      }

      const precision = distanceTraveled >= 100 ? 0 : 1;
      const rounded = Number(distanceTraveled.toFixed(precision));
      if (!Number.isFinite(rounded)) {
        return null;
      }

      return `${rounded.toLocaleString()} m`;
    }, [distanceTraveled]);

    // Pull full detection results from Redux for this player
    const scribingResult = useSelector(selectScribingDetectionsResult);

    // Build ScribedSkillData lookups. Scribed abilities surface in the log under a COMPOSITE name
    // like "Shattering Knife (Class Mastery / Berserk)", so keying purely by transformation name
    // ("Shattering Knife") misses them and the tooltip falls back to a bare header. We therefore
    // index by (a) ability ID — the most reliable key, since detection results are keyed by it —
    // and (b) a normalised name with the trailing "(...)" parenthetical stripped.
    const scribedSkillsLookup = React.useMemo(() => {
      const byName = new Map<string, ScribedSkillData>();
      const byAbilityId = new Map<number, ScribedSkillData>();

      // Primary source: worker detection results (has signature/affix/wasCastInFight)
      if (scribingResult?.players[player.id]) {
        Object.entries(scribingResult.players[player.id]).forEach(([abilityKey, detection]) => {
          if (
            !detection?.scribedSkillData ||
            detection.schemaVersion !== SCRIBING_DETECTION_SCHEMA_VERSION
          ) {
            return;
          }
          byName.set(detection.scribingInfo.transformation, detection.scribedSkillData);
          // Detection results are keyed by the queried ability id; index both that key and the
          // resolved effective ability id so a composite-named talent still resolves by guid.
          const abilityKeyNum = Number(abilityKey);
          if (Number.isFinite(abilityKeyNum)) {
            byAbilityId.set(abilityKeyNum, detection.scribedSkillData);
          }
          if (typeof detection.effectiveAbilityId === 'number') {
            byAbilityId.set(detection.effectiveAbilityId, detection.scribedSkillData);
          }
        });
      }

      // Fallback: GrimoireData from the older pipeline (basic fields only)
      scribingSkills.forEach((grimoire) => {
        grimoire.skills.forEach((skill) => {
          if (!byName.has(skill.skillName)) {
            byName.set(skill.skillName, {
              grimoireName: grimoire.grimoireName,
              effects: skill.effects,
              recipe: skill.recipe,
            });
          }
        });
      });

      return { byName, byAbilityId };
    }, [scribingResult, player.id, scribingSkills]);

    // Resolve scribed data for a talent: prefer ability-id match, then exact name, then the
    // composite name with its trailing parenthetical stripped (e.g. "Shattering Knife (…)").
    const resolveScribedSkillData = React.useCallback(
      (talentGuid: number, talentName: string): ScribedSkillData | undefined => {
        const byId = scribedSkillsLookup.byAbilityId.get(talentGuid);
        if (byId) {
          return byId;
        }
        const exact = scribedSkillsLookup.byName.get(talentName);
        if (exact) {
          return exact;
        }
        const baseName = talentName.replace(/\s*\(.*\)\s*$/, '').trim();
        if (baseName && baseName !== talentName) {
          return scribedSkillsLookup.byName.get(baseName);
        }
        return undefined;
      },
      [scribedSkillsLookup],
    );

    // Lazy resolver: build (and cache) a talent's rich tooltip props only the first time
    // its tooltip is actually rendered. Building eagerly for every talent on mount was a
    // major freeze source on high-player-count fights (~12+ buildTooltipProps calls per card
    // x 30 cards). The cache is keyed off the same deps as before, so it resets when they change.
    const getTalentTooltipProps = React.useMemo(() => {
      const cache = new Map<number, ReturnType<typeof buildTooltipProps>>();
      const clsKey = toClassKey(player.type);

      return (talent: { guid: number; name: string }): ReturnType<typeof buildTooltipProps> => {
        const key = talent.guid;
        const cached = cache.get(key);
        if (cached !== undefined) {
          return cached;
        }

        const scribedSkillData = resolveScribedSkillData(talent.guid, talent.name);
        const tooltipProps =
          buildTooltipProps({
            abilityId: talent.guid,
            abilityName: talent.name,
            classKey: clsKey,
            scribedSkillData,
          }) ?? null;

        cache.set(key, tooltipProps);
        return tooltipProps;
      };
    }, [player.type, resolveScribedSkillData]);

    // Memoize card styles to prevent recalculations
    const cardStyles = React.useMemo(
      () => ({
        width: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        position: 'relative' as const,
        background:
          'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
        border: isTopDps
          ? theme.palette.mode === 'dark'
            ? '1px solid rgba(245,158,11,0.55)'
            : '1px solid rgba(180,83,9,0.5)'
          : theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(59, 130, 246, 0.3)',
        ...(isTopDps && {
          // Allow the electric ring + outer halo (negative insets) to render
          // beyond the card edge instead of being clipped by MUI's default
          // overflow:hidden on Card.
          overflow: 'visible' as const,
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 0 16px rgba(245,158,11,0.18), 0 0 40px rgba(245,158,11,0.06), inset 0 1px 0 rgba(251,191,36,0.12)'
              : '0 0 16px rgba(180,83,9,0.12), 0 0 40px rgba(245,158,11,0.08), inset 0 1px 0 rgba(251,191,36,0.18)',
        }),
      }),
      [theme.palette.mode, isTopDps],
    );

    // Memoize expensive gear chip props - sorted by count descending
    const gearChips = React.useMemo(
      () =>
        playerGear
          ?.slice()
          .sort((a, b) => b.count - a.count) // Sort by count descending (highest first)
          .map((rec, idx) => ({
            key: `${rec.data.setID}-${idx}`,
            label: `${rec.count} ${rec.labelName}`,
            title: `Set ID: ${rec.data.setID ?? ''}`,
            ...getGearChipProps(rec.labelName, rec.count, theme),
          })) ?? [],
      [playerGear, theme],
    );

    // Memoize role information — prefer detected role when available
    const roleInfo = React.useMemo(() => {
      if (detectedRole) {
        return {
          roleType: ROLE_LABELS[detectedRole.role],
          roleEmoji: getRoleEmoji(detectedRole.role),
        };
      }
      const roleType =
        player.role === 'tank' ? 'Tank' : player.role === 'healer' ? 'Healer' : 'DPS';
      const roleEmoji = player.role === 'tank' ? '🛡️' : player.role === 'healer' ? '❤️' : '⚔️';
      return { roleType, roleEmoji };
    }, [player.role, detectedRole]);

    // Memoize food information
    const foodInfo = React.useMemo(() => {
      if (!foodAura) return { display: 'NONE', color: '#888' };
      return {
        display: abbreviateFood(foodAura.name),
        color: getFoodColor(foodAura.id),
      };
    }, [foodAura]);

    // Memoize potion information — prefer the live-stream result (Path B) when available.
    const potionInfo = React.useMemo(() => {
      if (potionStreamResult) {
        const resourceDesc =
          potionStreamResult.resourceRestored !== 'none'
            ? ` — Restores: ${describeResourceRestored(potionStreamResult.resourceRestored)}`
            : '';
        return {
          type: potionStreamResult.type,
          count: potionStreamResult.count,
          display: abbreviatePotion(potionStreamResult.type),
          color: getPotionColor(potionStreamResult.type),
          tooltip: `${describePotionType(potionStreamResult.type)}${resourceDesc}`,
        };
      }
      const potionType = detectPotionType(auras, player.potionUse ?? 0);
      return {
        type: potionType,
        count: player.potionUse ?? 0,
        display: abbreviatePotion(potionType),
        color: getPotionColor(potionType),
        tooltip: describePotionType(potionType),
      };
    }, [auras, player.potionUse, potionStreamResult]);

    // --- Extract Build handler ---
    const [extractLoading, setExtractLoading] = useState(false);

    const handleExtractBuild = useCallback(async () => {
      setExtractLoading(true);
      // Open the tab synchronously inside the click handler so popup blockers
      // don't intercept — the async encodeBuildToURL would break the gesture chain.
      const tab = window.open('', '_blank');
      try {
        const broadRole: string = detectedRole
          ? toBroadRole(detectedRole.role)
          : (player.role ?? 'dps');

        const build = playerToBuild({
          playerName: resolveActorName(player),
          role: broadRole,
          gear: player?.combatantInfo?.gear ?? [],
          talents,
          mundusBuffs,
          championPoints,
          classAnalysis,
          food: foodAura ? { id: foodAura.id, name: foodAura.name } : undefined,
          potionType: potionStreamResult?.type,
        });

        const encoded = await encodeBuildToURL(build);
        if (tab && encoded) {
          tab.location.href = `/build-editor?b=${encoded}&from=report`;
        } else {
          tab?.close();
        }
      } catch {
        tab?.close();
      } finally {
        setExtractLoading(false);
      }
    }, [
      player,
      talents,
      mundusBuffs,
      championPoints,
      classAnalysis,
      detectedRole,
      foodAura,
      potionStreamResult,
    ]);

    const resolvedPlayerName = resolveActorName(player);
    const normalizedDisplayName = resolvedPlayerName.trim();
    const trimmedCharacterName = player.name?.trim() ?? '';
    const shouldShowCharacterName =
      trimmedCharacterName.length > 0 &&
      normalizedDisplayName.localeCompare(trimmedCharacterName, undefined, {
        sensitivity: 'base',
      }) !== 0;

    // --- Data-driven stat chip entries ---
    // Build ordered array of chips, filtered by visibility prefs and role.
    const statChipEntries = React.useMemo(() => {
      // Collect candidate nodes into a map; order is determined afterwards.
      const candidateMap = new Map<StatChipId, React.ReactNode>();
      const r: 'dps' | 'healer' | 'tank' = detectedRole
        ? toBroadRole(detectedRole.role)
        : (player.role as 'dps' | 'healer' | 'tank');

      const add = (id: StatChipId, node: React.ReactNode): void => {
        const meta = STAT_CHIP_META[id];
        if (meta.roleFilter && !meta.roleFilter.includes(r)) return;
        candidateMap.set(id, node);
      };

      // --- New priority chips ---
      if (dpsValue != null) {
        add(
          'dps',
          <Tooltip title={STAT_CHIP_META.dps.tooltip} enterTouchDelay={0} leaveTouchDelay={3000}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <StatChipIcon chipId="dps" />
              <span style={{ margin: '0 1px' }} />
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: 13, sm: 11, md: 10 },
                  letterSpacing: '.01em',
                }}
              >
                {formatStatValue(dpsValue)} DPS
              </Box>
            </span>
          </Tooltip>,
        );
      }

      if (hpsValue != null) {
        add(
          'hps',
          <Tooltip title={STAT_CHIP_META.hps.tooltip} enterTouchDelay={0} leaveTouchDelay={3000}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <StatChipIcon chipId="hps" />
              <span style={{ margin: '0 1px' }} />
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: 13, sm: 11, md: 10 },
                  letterSpacing: '.01em',
                }}
              >
                {formatStatValue(hpsValue)} HPS
              </Box>
            </span>
          </Tooltip>,
        );
      }

      if (critChance != null) {
        add(
          'critChance',
          <Tooltip
            title={STAT_CHIP_META.critChance.tooltip}
            enterTouchDelay={0}
            leaveTouchDelay={3000}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <StatChipIcon chipId="critChance" />
              <span style={{ margin: '0 1px' }} />
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: 13, sm: 11, md: 10 },
                  letterSpacing: '.01em',
                }}
              >
                {critChance.toFixed(1)}%
              </Box>
            </span>
          </Tooltip>,
        );
      }

      if (critDamageSummary) {
        add(
          'critDamage',
          <Tooltip
            title={STAT_CHIP_META.critDamage.tooltip}
            enterTouchDelay={0}
            leaveTouchDelay={3000}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
              <StatChipIcon chipId="critDamage" />
              <span style={{ margin: '0 1px' }} />
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: 13, sm: 11, md: 10 },
                  letterSpacing: '.01em',
                  color:
                    critDamageSummary.avg >= 125
                      ? 'success.main'
                      : critDamageSummary.avg >= 100
                        ? 'warning.main'
                        : 'error.main',
                }}
              >
                {critDamageSummary.avg.toFixed(0)}% avg ({critDamageSummary.max.toFixed(0)}% max)
              </Box>
            </span>
          </Tooltip>,
        );
      }

      if (totalDamage != null) {
        add(
          'totalDamage',
          <Tooltip
            title={STAT_CHIP_META.totalDamage.tooltip}
            enterTouchDelay={0}
            leaveTouchDelay={3000}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <StatChipIcon chipId="totalDamage" />
              <span style={{ margin: '0 1px' }} />
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: 13, sm: 11, md: 10 },
                  letterSpacing: '.01em',
                }}
              >
                {formatStatValue(totalDamage)}
              </Box>
            </span>
          </Tooltip>,
        );
      }

      if (totalCritDamage != null) {
        add(
          'totalCritDamage',
          <Tooltip
            title={STAT_CHIP_META.totalCritDamage.tooltip}
            enterTouchDelay={0}
            leaveTouchDelay={3000}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <StatChipIcon chipId="totalCritDamage" />
              <span style={{ margin: '0 1px' }} />
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: 13, sm: 11, md: 10 },
                  letterSpacing: '.01em',
                }}
              >
                {formatStatValue(totalCritDamage)}
              </Box>
            </span>
          </Tooltip>,
        );
      }

      if (critDps != null) {
        add(
          'critDps',
          <Tooltip
            title={STAT_CHIP_META.critDps.tooltip}
            enterTouchDelay={0}
            leaveTouchDelay={3000}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <StatChipIcon chipId="critDps" />
              <span style={{ margin: '0 1px' }} />
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: 13, sm: 11, md: 10 },
                  letterSpacing: '.01em',
                }}
              >
                {formatStatValue(critDps)} CDPS
              </Box>
            </span>
          </Tooltip>,
        );
      }

      // --- Existing chips ---
      if (mundusBuffs.length > 0) {
        add('mundus', <MundusChip mundusBuffs={mundusBuffs} />);
      }

      add(
        'food',
        <Tooltip
          title={`Food/Drink: ${foodAura ? foodAura.name : 'None'}`}
          enterTouchDelay={0}
          leaveTouchDelay={3000}
        >
          <span
            style={{ display: 'inline-flex', alignItems: 'center' }}
            data-testid={`food-drink-${player.id}`}
          >
            <StatChipIcon chipId="food" />
            <span style={{ margin: '0 1px' }} />
            <Box
              component="span"
              sx={{
                display: 'inline',
                fontWeight: 700,
                fontSize: { xs: 13, sm: 11, md: 10 },
                letterSpacing: '.01em',
                color: foodInfo.color,
              }}
            >
              {foodInfo.display}
            </Box>
          </span>
        </Tooltip>,
      );

      add(
        'potion',
        <Tooltip
          title={`Potion (${potionInfo.count}x): ${potionInfo.tooltip}`}
          enterTouchDelay={0}
          leaveTouchDelay={3000}
        >
          <span
            style={{ display: 'inline-flex', alignItems: 'center' }}
            data-testid={`potion-${player.id}`}
          >
            <StatChipIcon chipId="potion" />
            <span style={{ margin: '0 1px' }} />
            <Box
              component="span"
              sx={{
                display: 'inline',
                fontWeight: 700,
                fontSize: { xs: 13, sm: 11, md: 10 },
                letterSpacing: '.01em',
                color: potionInfo.color,
              }}
            >
              {potionInfo.count}×{potionInfo.display}
            </Box>
          </span>
        </Tooltip>,
      );

      add(
        'deaths',
        <Tooltip title={STAT_CHIP_META.deaths.tooltip} enterTouchDelay={0} leaveTouchDelay={3000}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <StatChipIcon chipId="deaths" />
            <span style={{ margin: '0 1px' }} />
            {deaths}
          </span>
        </Tooltip>,
      );

      add(
        'resurrects',
        <Tooltip
          title={STAT_CHIP_META.resurrects.tooltip}
          enterTouchDelay={0}
          leaveTouchDelay={3000}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <StatChipIcon chipId="resurrects" />
            <span style={{ margin: '0 1px' }} />
            {resurrects}
          </span>
        </Tooltip>,
      );

      add(
        'cpm',
        <Tooltip title={STAT_CHIP_META.cpm.tooltip} enterTouchDelay={0} leaveTouchDelay={3000}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <StatChipIcon chipId="cpm" />
            <span style={{ margin: '0 1px' }} />
            {reportId ? (
              <a
                href={castsUrl(reportId, fightId)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                {cpm}
              </a>
            ) : (
              <>{cpm}</>
            )}
          </span>
        </Tooltip>,
      );

      if (distanceDisplay) {
        add(
          'distance',
          <Tooltip
            title={STAT_CHIP_META.distance.tooltip}
            enterTouchDelay={0}
            leaveTouchDelay={3000}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <StatChipIcon chipId="distance" />
              <span style={{ margin: '0 1px' }} />
              {distanceDisplay}
            </span>
          </Tooltip>,
        );
      }

      if (barSwapResult?.barSetupPattern) {
        add(
          'barPattern',
          <Tooltip
            title={STAT_CHIP_META.barPattern.tooltip}
            enterTouchDelay={0}
            leaveTouchDelay={3000}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <StatChipIcon chipId="barPattern" />
              <span style={{ margin: '0 1px' }} />
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  fontSize: { xs: 13, sm: 11, md: 10 },
                }}
              >
                {barSwapResult.barSetupPattern}
              </Box>
            </span>
          </Tooltip>,
        );
      }

      // Emit entries in the user-configured order (visibleChips), falling back
      // to the canonical STAT_CHIP_IDS order when no preference is stored.
      const orderedIds: readonly StatChipId[] = visibleChips ?? STAT_CHIP_IDS;
      const entries: Array<{ id: StatChipId; node: React.ReactNode }> = [];
      for (const id of orderedIds) {
        const node = candidateMap.get(id);
        if (node !== undefined) entries.push({ id, node });
      }
      return entries;
    }, [
      visibleChips,
      player.role,
      detectedRole,
      player.id,
      dpsValue,
      hpsValue,
      critChance,
      critDamageSummary,
      totalDamage,
      totalCritDamage,
      critDps,
      mundusBuffs,
      foodAura,
      foodInfo,
      potionInfo,
      deaths,
      resurrects,
      cpm,
      reportId,
      fightId,
      castsUrl,
      distanceDisplay,
      barSwapResult,
    ]);

    return (
      <Box sx={{ minWidth: 0, display: 'flex', height: '100%' }}>
        <Card
          variant="outlined"
          className="u-hover-lift u-fade-in-up"
          sx={cardStyles}
          data-testid={`player-card-${player.id}`}
        >
          {isTopDps && (
            <>
              {/* Electric border (top DPS): rotating conic-gradient gold edge.
                  Adapted from the "electric border" aesthetic to the project's
                  MUI/token idiom. Scoped to this card via absolute inset so it
                  cannot bleed into neighbouring cards. Both layers animate via
                  CSS keyframes, so the global prefers-reduced-motion rule in
                  ReduxThemeProvider neutralises the motion automatically. */}
              <Box
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  inset: '-1px',
                  borderRadius: '14px',
                  padding: '1.5px',
                  zIndex: 2,
                  pointerEvents: 'none',
                  // The conic gradient is the moving "current"; animating its
                  // start angle (via the --tdps-angle custom property) sweeps the
                  // bright spot around the edge while the element itself stays
                  // put. The mask carves out the centre so only the 1.5px ring is
                  // painted (both prefixed + standard for cross-browser).
                  background:
                    'conic-gradient(from var(--tdps-angle), transparent 0deg, rgba(251,191,36,0.15) 40deg, rgba(245,158,11,0.85) 80deg, #fde68a 100deg, rgba(245,158,11,0.85) 120deg, rgba(251,191,36,0.15) 160deg, transparent 200deg, transparent 360deg)',
                  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  animation: 'electricBorderSpin 4s linear infinite',
                  filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.55))',
                }}
              />
              {/* Soft outer halo that gently pulses, giving the "energised" feel
                  without the visual noise of a fast crackle. */}
              <Box
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  inset: '-3px',
                  borderRadius: '16px',
                  zIndex: 0,
                  pointerEvents: 'none',
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 0 14px 1px rgba(245,158,11,0.35), 0 0 34px 4px rgba(245,158,11,0.12)'
                      : '0 0 14px 1px rgba(180,83,9,0.28), 0 0 34px 4px rgba(245,158,11,0.14)',
                  animation: 'electricBorderPulse 2.8s ease-in-out infinite',
                }}
              />
            </>
          )}
          <CardContent
            sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <Box
              sx={{
                flexDirection: 'column',
                gap: 2,
                alignItems: 'stretch',
                display: 'flex',
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Left column: identity, talents, gear, issues */}
              <Box sx={{ flex: 0, minWidth: 0 }}>
                <Box sx={{ gap: 1, alignItems: 'center', display: 'flex', mb: 1.5 }}>
                  <PlayerIcon player={player} />
                  <Box
                    sx={{
                      flex: 1,
                      justifyContent: 'space-between',
                      gap: 1,
                      alignItems: 'center',
                      minWidth: 0,
                      display: 'flex',
                    }}
                  >
                    {/* Player Name with Character Name Hover */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: '1 1 auto',
                        minWidth: 0,
                      }}
                    >
                      <OneLineAutoFit minScale={0.8}>
                        <Tooltip
                          title={shouldShowCharacterName ? trimmedCharacterName : ''}
                          placement="top"
                          arrow
                          slotProps={{
                            popper: {
                              style: { zIndex: 9999 },
                            },
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontFamily: 'space grotesk',
                              fontSize: '1.15rem',
                              fontWeight: 100,
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap',
                              cursor: 'help', // Add cursor to indicate hoverable
                            }}
                          >
                            {normalizedDisplayName || resolvedPlayerName}
                          </Typography>
                        </Tooltip>
                      </OneLineAutoFit>
                    </Box>

                    {/* Gear Weights */}
                    <Box
                      sx={{
                        gap: 0.35,
                        display: 'inline-flex',
                        alignItems: 'center',
                        flex: '0 0 auto', // Don't shrink gear weights
                        minWidth: 0, // Allow shrinking
                        overflow: 'hidden', // Prevent overflow
                      }}
                    >
                      <ShieldOutlinedIcon sx={{ color: 'text.secondary', fontSize: 26 }} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: (theme: Theme) =>
                            theme.palette.mode === 'light' ? '#c44e4e' : '#ff7a7a',
                          fontSize: 11,
                          lineHeight: 1,
                          fontWeight: 500,
                        }}
                      >
                        {armorWeights.heavy}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1 }}
                      >
                        •
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: (theme: Theme) =>
                            theme.palette.mode === 'light' ? '#3db03d' : '#93f093',
                          fontSize: 11,
                          lineHeight: 1,
                          fontWeight: 500,
                        }}
                      >
                        {armorWeights.medium}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1 }}
                      >
                        •
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: '#3c9bff', fontSize: 11, lineHeight: 1 }}
                      >
                        {armorWeights.light}
                      </Typography>
                    </Box>

                    {/* Role Icon */}
                    <Tooltip
                      title={`Role: ${roleInfo.roleType}`}
                      enterTouchDelay={0}
                      leaveTouchDelay={3000}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: { xs: 20, sm: 24, md: 28, lg: 32 },
                          lineHeight: 1,
                          filter: 'none',
                          flex: '0 0 auto', // Don't shrink role icon
                        }}
                        role="img"
                        aria-label={`Role: ${roleInfo.roleType}`}
                      >
                        {roleInfo.roleEmoji}
                      </Typography>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Top DPS badge */}
                {isTopDps && totalDps !== undefined && (
                  <Box sx={{ mb: 0.75 }}>
                    <Tooltip title={`Top DPS (Total): ${formatStatValue(totalDps)}`} arrow>
                      <Box
                        data-testid="top-dps-badge"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.25,
                          py: 0.4,
                          borderRadius: '6px',
                          background: (theme: Theme) =>
                            theme.palette.mode === 'dark'
                              ? 'linear-gradient(90deg, rgba(245,158,11,0.15) 0%, rgba(251,191,36,0.08) 100%)'
                              : 'linear-gradient(90deg, rgba(251,191,36,0.22) 0%, rgba(245,158,11,0.1) 100%)',
                          border: '1px solid rgba(245,158,11,0.35)',
                          boxShadow: '0 0 8px rgba(245,158,11,0.2)',
                        }}
                      >
                        <EmojiEventsIcon sx={{ fontSize: '0.8rem', color: '#f59e0b' }} />
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#f59e0b',
                            letterSpacing: '0.06em',
                            lineHeight: 1,
                          }}
                        >
                          TOP DPS
                        </Typography>
                        <Box
                          sx={{
                            width: '1px',
                            height: '10px',
                            background: 'rgba(245,158,11,0.4)',
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: (theme: Theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(251,191,36,0.85)'
                                : 'rgba(180,83,9,0.9)',
                            lineHeight: 1,
                            fontFamily: 'monospace',
                          }}
                        >
                          {formatStatValue(totalDps)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Box>
                )}

                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: 0,
                      mt: 0.25,
                      mb: 0.5,
                      pr: 1,
                      pl: 0,
                    }}
                  >
                    <OneLineAutoFit minScale={0.9}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {detectedSkillLines.map((skill, idx) => {
                          const title = skill.skillLine;
                          const icon = toClassKey(skill.className);

                          return (
                            <Tooltip
                              key={idx}
                              title={title}
                              enterTouchDelay={0}
                              leaveTouchDelay={3000}
                            >
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.35,
                                }}
                              >
                                {idx > 0 && (
                                  <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary', opacity: 0.7 }}
                                  >
                                    •
                                  </Typography>
                                )}
                                <ClassIcon
                                  className={icon}
                                  size={12}
                                  style={{ opacity: 0.8, flexShrink: 0 }}
                                />
                                <Typography
                                  variant="caption"
                                  noWrap
                                  sx={{
                                    color: 'text.secondary',
                                    lineHeight: 1.05,
                                    fontSize: '0.70rem',
                                  }}
                                >
                                  {abbreviateSkillLine(skill.skillLine)}
                                </Typography>
                              </Box>
                            </Tooltip>
                          );
                        })}
                      </Box>
                    </OneLineAutoFit>
                  </Box>
                </Box>

                {/* Talents */}
                {talents.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ mb: 1.25, flexWrap: 'wrap', gap: 1.25, display: 'flex' }}>
                      {talents.slice(0, 6).map((talent, idx) => {
                        const isUltimate = idx === 5;
                        return (
                          <React.Fragment key={idx}>
                            {isUltimate && (
                              <Box
                                sx={{
                                  width: 2,
                                  height: 34,
                                  bgcolor: 'rgba(124,207,252,0.55)',
                                  borderRadius: 0.5,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <Box
                              component="span"
                              sx={{ display: 'inline-flex', alignItems: 'center' }}
                            >
                              <Tooltip
                                enterTouchDelay={0}
                                leaveTouchDelay={3000}
                                title={
                                  <LazyTalentTooltipContent
                                    talent={talent}
                                    isUltimate={isUltimate}
                                    resolveProps={getTalentTooltipProps}
                                    resolveScribedSkillData={resolveScribedSkillData}
                                    fightId={fightId || undefined}
                                    playerId={player.id}
                                  />
                                }
                                placement="top-start"
                                enterDelay={0}
                                arrow
                                slotProps={{
                                  popper: {
                                    disablePortal: true,
                                    modifiers: [
                                      {
                                        name: 'preventOverflow',
                                        options: {
                                          altAxis: true,
                                          altBoundary: true,
                                          tether: false,
                                          rootBoundary: 'document',
                                          padding: 16,
                                        },
                                      },
                                      {
                                        name: 'flip',
                                        enabled: true,
                                        options: {
                                          altBoundary: true,
                                          rootBoundary: 'document',
                                          padding: 16,
                                          fallbackPlacements: ['bottom'],
                                        },
                                      },
                                      {
                                        name: 'arrow',
                                        enabled: true,
                                      },
                                    ],
                                  },
                                  tooltip: {
                                    sx: {
                                      maxWidth: 320,
                                      p: 0,
                                      backgroundColor: 'transparent !important',
                                      border: 'none !important',
                                      boxShadow: 'none !important',
                                    },
                                  },
                                  arrow: { sx: { display: 'none' } },
                                }}
                              >
                                <Avatar
                                  src={abilityIconUrl(talent.abilityIcon, talent.guid)}
                                  alt={talent.name}
                                  variant="rounded"
                                  sx={{
                                    width: isUltimate ? 34 : 32,
                                    height: isUltimate ? 34 : 32,
                                    border: isUltimate
                                      ? '1.5px solid #b3b3b3f2'
                                      : theme.palette.mode === 'dark'
                                        ? '1px solid #b5b8bd59'
                                        : '1px solid #1e3a8a',
                                    boxShadow: isUltimate
                                      ? 'inset 0 2px 4px rgb(0 0 0 / 100%), 0 0 0 1px rgb(255 255 255 / 18%), 0 0 10px rgb(255 255 255 / 25%), 0 2px 6px rgb(0 0 0 / 60%)'
                                      : 'none',
                                  }}
                                />
                              </Tooltip>
                            </Box>
                          </React.Fragment>
                        );
                      })}
                    </Box>
                    {talents.length > 6 && (
                      <Box sx={{ flexWrap: 'wrap', gap: 1.25, mt: 0.25, display: 'flex' }}>
                        {talents.slice(6).map((talent, idx) => {
                          const isUltimate = idx === 5;
                          return (
                            <React.Fragment key={idx}>
                              {isUltimate && (
                                <Box
                                  sx={{
                                    width: 2,
                                    height: 34,
                                    bgcolor: 'rgba(124,207,252,0.55)',
                                    borderRadius: 0.5,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <Box
                                component="span"
                                sx={{ display: 'inline-flex', alignItems: 'center' }}
                              >
                                <Tooltip
                                  enterTouchDelay={0}
                                  leaveTouchDelay={3000}
                                  title={
                                    <LazyTalentTooltipContent
                                      talent={talent}
                                      isUltimate={isUltimate}
                                      resolveProps={getTalentTooltipProps}
                                      resolveScribedSkillData={resolveScribedSkillData}
                                      fightId={fightId || undefined}
                                      playerId={player.id}
                                    />
                                  }
                                  placement="top-start"
                                  enterDelay={0}
                                  arrow
                                  slotProps={{
                                    popper: {
                                      disablePortal: true,
                                      modifiers: [
                                        {
                                          name: 'preventOverflow',
                                          options: {
                                            altAxis: true,
                                            altBoundary: true,
                                            tether: false,
                                            rootBoundary: 'document',
                                            padding: 16,
                                          },
                                        },
                                        {
                                          name: 'flip',
                                          enabled: true,
                                          options: {
                                            altBoundary: true,
                                            rootBoundary: 'document',
                                            padding: 16,
                                            fallbackPlacements: ['bottom'],
                                          },
                                        },
                                        {
                                          name: 'arrow',
                                          enabled: true,
                                        },
                                      ],
                                    },
                                    tooltip: {
                                      sx: {
                                        maxWidth: 320,
                                        p: 0,
                                        backgroundColor: 'transparent !important',
                                        border: 'none !important',
                                        boxShadow: 'none !important',
                                      },
                                    },
                                    arrow: { sx: { display: 'none' } },
                                  }}
                                >
                                  <Avatar
                                    src={abilityIconUrl(talent.abilityIcon, talent.guid)}
                                    alt={talent.name}
                                    variant="rounded"
                                    sx={{
                                      width: isUltimate ? 34 : 32,
                                      height: isUltimate ? 34 : 32,
                                      border: isUltimate
                                        ? '1.5px solid #b3b3b3f2'
                                        : theme.palette.mode === 'dark'
                                          ? '1px solid #b5b8bd59'
                                          : '1px solid #1e3a8a',
                                      boxShadow: isUltimate
                                        ? 'inset 0 2px 4px rgb(0 0 0 / 100%), 0 0 0 1px rgb(255 255 255 / 18%), 0 0 10px rgb(255 255 255 / 25%), 0 2px 6px rgb(0 0 0 / 60%)'
                                        : 'none',
                                    }}
                                  />
                                </Tooltip>
                              </Box>
                            </React.Fragment>
                          );
                        })}
                      </Box>
                    )}
                    {gear.length > 0 && (
                      <Box sx={{ mt: 1.25, pt: 0.9, pb: 0 }}>
                        <Box
                          sx={{
                            mb: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 'bold',
                              fontFamily: 'Space Grotesk, sans-serif',
                              fontSize: '0.8rem',
                            }}
                          >
                            Gear
                          </Typography>
                          <Box sx={{ gap: 0.75, display: 'flex', alignItems: 'center' }}>
                            <Tooltip
                              title="Open this player's gear, skills, and CP in the Build Editor"
                              arrow
                            >
                              <Box
                                onClick={handleExtractBuild}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.25,
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: 0.5,
                                  backgroundColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(59, 130, 246, 0.12)'
                                      : 'rgba(59, 130, 246, 0.08)',
                                  border: '1px solid',
                                  borderColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(59, 130, 246, 0.25)'
                                      : 'rgba(59, 130, 246, 0.2)',
                                  cursor: extractLoading ? 'wait' : 'pointer',
                                  opacity: extractLoading ? 0.6 : 1,
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    backgroundColor:
                                      theme.palette.mode === 'dark'
                                        ? 'rgba(59, 130, 246, 0.2)'
                                        : 'rgba(59, 130, 246, 0.14)',
                                    borderColor:
                                      theme.palette.mode === 'dark'
                                        ? 'rgba(59, 130, 246, 0.4)'
                                        : 'rgba(59, 130, 246, 0.35)',
                                  },
                                }}
                              >
                                <BuildIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: '0.65rem',
                                    fontWeight: 500,
                                    color: 'primary.main',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px',
                                    lineHeight: 1,
                                  }}
                                >
                                  {extractLoading ? 'LOADING…' : 'EXTRACT'}
                                </Typography>
                              </Box>
                            </Tooltip>
                            <Box
                              onClick={() => {
                                setCurrentGearPlayerId(player.id);
                                setGearDetailsOpen(true);
                              }}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.25,
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 0.5,
                                backgroundColor:
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgb(255 255 255 / 15%)',
                                border: '1px solid',
                                borderColor:
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'rgba(0, 0, 0, 0.12)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  backgroundColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(255, 255, 255, 0.12)'
                                      : 'rgba(0, 0, 0, 0.1)',
                                  borderColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(255, 255, 255, 0.2)'
                                      : 'rgba(0, 0, 0, 0.2)',
                                },
                              }}
                            >
                              <InfoIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 300,
                                  color: 'text.secondary',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.3px',
                                  lineHeight: 1,
                                }}
                              >
                                INFO
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Box
                          data-testid={`gear-chips-${player.id}`}
                          sx={{ flexWrap: 'wrap', gap: 1.25, minHeight: 32, display: 'flex' }}
                        >
                          {gearChips.map((chipData, index) => {
                            // Find the corresponding gear record for tooltip
                            const gearRecord = playerGear[index];

                            if (gearRecord) {
                              return (
                                <Tooltip
                                  key={chipData.key}
                                  title={
                                    <LazyGearSetTooltipContent
                                      gearRecord={gearRecord}
                                      playerGear={player.combatantInfo.gear}
                                    />
                                  }
                                  placement="top"
                                  enterDelay={300}
                                  enterTouchDelay={0}
                                  leaveTouchDelay={3000}
                                  arrow
                                  disableInteractive={false}
                                  slotProps={{
                                    tooltip: {
                                      sx: {
                                        maxWidth: 320,
                                        p: 0,
                                        backgroundColor: 'transparent !important',
                                        border: 'none !important',
                                        boxShadow: 'none !important',
                                      },
                                    },
                                    arrow: { sx: { display: 'none' } },
                                  }}
                                >
                                  <Chip label={chipData.label} size="small" sx={chipData.sx} />
                                </Tooltip>
                              );
                            }

                            // Fallback to simple chip if no gear set data
                            return (
                              <Chip
                                key={chipData.key}
                                label={chipData.label}
                                size="small"
                                title={chipData.title}
                                sx={chipData.sx}
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

              {/* Spacer to push bottom section down */}
              <Box sx={{ flex: 1 }} />

              {/* Right column content stacked below left, full width */}
              <Box
                sx={{
                  width: '100%',
                  pt: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    border: '1px solid var(--border)',
                    borderRadius: 1,
                    backgroundColor:
                      theme.palette.mode === 'dark' ? 'rgb(0 0 0 / 26%)' : 'rgb(223 239 255 / 25%)',
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? 'rgb(0 0 0) 0px 2px 4px'
                        : 'rgb(167 199 220) 0px 2px 4px',
                  }}
                >
                  <Box
                    sx={{
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      minWidth: 0,
                      minHeight: metricsLayout === 'wrap' ? 'auto' : { xs: 44, sm: 28, md: 28 },
                    }}
                  >
                    <MetricsScrollRow
                      scrollable={metricsLayout !== 'wrap'}
                      sx={{
                        display: 'flex',
                        flexWrap: metricsLayout === 'wrap' ? 'wrap' : 'nowrap',
                        overflowX: metricsLayout === 'wrap' ? 'hidden' : 'auto',
                        gap: { xs: 0.75, sm: 0.5, md: 0.5 },
                        minHeight: metricsLayout === 'wrap' ? 'auto' : { xs: 44, sm: 24, md: 24 },
                        flex: '1 1 auto',
                        minWidth: 0,
                        mr: 0.5,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: metricsLayout === 'wrap' ? 'wrap' : 'nowrap',
                          gap:
                            metricsLayout === 'wrap'
                              ? { xs: 1, sm: 0.75, md: 0.5 }
                              : { xs: 1, sm: 0.5, md: 0.25 },
                          whiteSpace: metricsLayout === 'wrap' ? 'normal' : 'nowrap',
                          fontSize: { xs: 13, sm: 11, md: 'body2.fontSize' },
                        }}
                      >
                        {statChipEntries.map((entry, i) => (
                          <React.Fragment key={entry.id}>
                            {i > 0 && metricsLayout !== 'wrap' && ' · '}
                            {entry.node}
                          </React.Fragment>
                        ))}
                      </Typography>
                    </MetricsScrollRow>
                  </Box>

                  {(maxHealth > 0 || maxStamina > 0 || maxMagicka > 0) && (
                    <Box
                      sx={{
                        mb: 1.5,
                        p: 1,
                        borderRadius: '10px',
                        background:
                          'linear-gradient(135deg, rgb(153 210 255 / 15%) 0%, rgb(255 210 210 / 33%) 55%, rgb(177 255 205 / 29%) 100%)',
                        border:
                          theme.palette.mode === 'dark'
                            ? '1px solid rgba(255,255,255,0.05)'
                            : '1px solid rgba(0,0,0,0.05)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        {maxMagicka > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 0.5,
                              flex: 1,
                            }}
                          >
                            <Tooltip title="Max Magicka" enterTouchDelay={0} leaveTouchDelay={3000}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  background:
                                    theme.palette.mode === 'dark'
                                      ? 'radial-gradient(circle at 30% 30%, #8cc8ff 0%, #74c0fc 50%, #339af0 100%)'
                                      : 'radial-gradient(circle at 30% 30%, #60a5fa 0%, #2563eb 50%, #1d4ed8 100%)',
                                  boxShadow:
                                    theme.palette.mode === 'dark'
                                      ? '0 0 8px rgba(116, 192, 252, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                                      : '0 0 6px rgba(37, 99, 235, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                                  cursor: 'default',
                                }}
                              />
                            </Tooltip>
                            <Typography
                              variant="caption"
                              sx={{
                                color: theme.palette.mode === 'dark' ? '#ffffff' : '#374151',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {maxMagicka.toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                        {maxHealth > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 0.5,
                              flex: 1,
                            }}
                          >
                            <Tooltip title="Max Health" enterTouchDelay={0} leaveTouchDelay={3000}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  background:
                                    theme.palette.mode === 'dark'
                                      ? 'radial-gradient(circle at 30% 30%, #ff8a8a 0%, #ff6b6b 50%, #ee5a5a 100%)'
                                      : 'radial-gradient(circle at 30% 30%, #f87171 0%, #dc2626 50%, #b91c1c 100%)',
                                  boxShadow:
                                    theme.palette.mode === 'dark'
                                      ? '0 0 8px rgba(255, 107, 107, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                                      : '0 0 6px rgba(220, 38, 38, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                                  cursor: 'default',
                                }}
                              />
                            </Tooltip>
                            <Typography
                              variant="caption"
                              sx={{
                                color: theme.palette.mode === 'dark' ? '#ffffff' : '#374151',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {maxHealth.toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                        {maxStamina > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 0.5,
                              flex: 1,
                            }}
                          >
                            <Tooltip title="Max Stamina" enterTouchDelay={0} leaveTouchDelay={3000}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  background:
                                    theme.palette.mode === 'dark'
                                      ? 'radial-gradient(circle at 30% 30%, #6bcf7f 0%, #51cf66 50%, #37b24d 100%)'
                                      : 'radial-gradient(circle at 30% 30%, #34d399 0%, #059669 50%, #047857 100%)',
                                  boxShadow:
                                    theme.palette.mode === 'dark'
                                      ? '0 0 8px rgba(81, 207, 102, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                                      : '0 0 6px rgba(5, 150, 105, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                                  cursor: 'default',
                                }}
                              />
                            </Tooltip>
                            <Typography
                              variant="caption"
                              sx={{
                                color: theme.palette.mode === 'dark' ? '#ffffff' : '#374151',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {maxStamina.toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )}

                  {championPoints.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        Champion Points
                      </Typography>
                      <Box sx={{ flexWrap: 'wrap', gap: 1, display: 'flex', minHeight: 40 }}>
                        {championPoints.map((cp, idx) => (
                          <Chip
                            key={`cp-${idx}`}
                            label={cp.name}
                            size="small"
                            title={`Champion Point: ${cp.name} (ID: ${cp.id})`}
                            sx={{
                              ...buildVariantSx(
                                cp.color === 'red'
                                  ? 'championRed'
                                  : cp.color === 'blue'
                                    ? 'championBlue'
                                    : 'championGreen',
                                theme,
                              ),
                              '& .MuiChip-label': { fontSize: '0.58rem' },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>

                {buildIssues.length === 0 && (
                  <Box
                    sx={{
                      mt: 1,
                      border: '1px solid',
                      borderColor: 'success.main',
                      backgroundColor: 'rgba(76,175,80,0.07)',
                      borderRadius: 1,
                      borderTopLeftRadius: '5px',
                      borderTopRightRadius: '5px',
                      borderTop: '1px solid #54775496',
                      px: 2,
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleOutlineIcon sx={{ color: 'success.main' }} />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          color: 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        Build checks out
                      </Typography>
                    </Box>
                  </Box>
                )}

                {buildIssues.length > 0 && (
                  <Accordion
                    variant="outlined"
                    sx={{
                      mt: 1,
                      borderColor: theme.palette.mode === 'light' ? '#000000' : 'warning.main',
                      backgroundColor: 'rgba(255,193,7,0.07)',
                      borderTop: '1px solid #5c574d',
                      borderTopLeftRadius: '5px',
                      borderTopRightRadius: '5px',
                      overflow: 'hidden',
                      '&.Mui-expanded': {
                        borderTop: 'none',
                        borderTopLeftRadius: '5px',
                        borderTopRightRadius: '5px',
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: 'warning.main' }} />}
                      sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center' } }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          color: theme.palette.mode === 'dark' ? '#ff9246' : '#c06220',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          textShadow:
                            theme.palette.mode === 'light'
                              ? '1px 1px 0 rgb(104 115 157 / 16%)'
                              : 'none',
                        }}
                      >
                        <span role="img" aria-label="attention">
                          ⚠️
                        </span>
                        Build Issues ({buildIssues.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
                      {(() => {
                        const grouped = consolidateBuildIssues(buildIssues);
                        const issues: React.ReactElement[] = [];

                        // Gear quality issues
                        if (grouped.gearQuality.length > 0) {
                          const qualityGroups = grouped.gearQuality.reduce(
                            (acc, issue) => {
                              const key = issue.message;
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(issue.gearName);
                              return acc;
                            },
                            {} as Record<string, string[]>,
                          );

                          Object.entries(qualityGroups).forEach(([message, gearNames]) => {
                            const nameCounts = gearNames.reduce(
                              (acc, name) => {
                                acc[name] = (acc[name] || 0) + 1;
                                return acc;
                              },
                              {} as Record<string, number>,
                            );

                            const displayNames = Object.entries(nameCounts).map(
                              ([name, count]) => ({
                                name,
                                count,
                                display: count > 1 ? `${name}(x${count})` : name,
                              }),
                            );

                            issues.push(
                              <Box
                                key="quality"
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  py: 0.5,
                                  px: 1,
                                  borderRadius: 0.5,
                                  backgroundColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(255,107,53,0.08)'
                                      : 'rgba(251,146,60,0.08)',
                                  border: '1px solid',
                                  borderColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(255,107,53,0.2)'
                                      : 'rgba(251,146,60,0.2)',
                                  mb: 0.5,
                                  overflow: 'hidden',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.25,
                                    flexShrink: 0,
                                    maxWidth: '180px',
                                  }}
                                >
                                  <Tooltip
                                    title={displayNames.map((d) => d.name).join(', ')}
                                    enterTouchDelay={0}
                                    leaveTouchDelay={3000}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#ff6b35' : '#c2410c',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        cursor: 'default',
                                        textShadow:
                                          theme.palette.mode === 'light'
                                            ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                            : 'none',
                                      }}
                                    >
                                      {displayNames.map((d) => d.name).join(', ')}
                                    </Typography>
                                  </Tooltip>
                                  {displayNames.some((d) => d.count > 1) && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#ff6b35' : '#c2410c',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        textShadow:
                                          theme.palette.mode === 'light'
                                            ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                            : 'none',
                                      }}
                                    >
                                      {displayNames.length === 1 && displayNames[0].count > 1
                                        ? `(x${displayNames[0].count})`
                                        : displayNames.filter((d) => d.count > 1).length > 0
                                          ? `(x${displayNames
                                              .filter((d) => d.count > 1)
                                              .map((d) => d.count)
                                              .join(',x')})`
                                          : ''}
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: theme.palette.mode === 'dark' ? '#ff6b35' : '#c2410c',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      flexShrink: 0,
                                      textShadow:
                                        theme.palette.mode === 'light'
                                          ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                          : 'none',
                                    }}
                                  >
                                    :
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.1,
                                  }}
                                >
                                  {(() => {
                                    const messageText = message.replace(/^.*?:\s*/, '');
                                    if (
                                      messageText.includes('quality is') &&
                                      messageText.includes('should be')
                                    ) {
                                      const currentMatch = messageText.match(/quality is (\d+)/);
                                      const shouldMatch = messageText.match(/should be (\d+)/);
                                      if (currentMatch && shouldMatch) {
                                        const current = parseInt(currentMatch[1]);
                                        return (
                                          <>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Box
                                                key={star}
                                                component="span"
                                                sx={{
                                                  fontSize: '1.3em',
                                                  display: 'inline-block',
                                                  lineHeight: 1,
                                                  filter:
                                                    star <= current && theme.palette.mode === 'dark'
                                                      ? 'drop-shadow(0 0 2px rgba(251, 191, 36, 0.6))'
                                                      : 'none',
                                                  textShadow:
                                                    star <= current && theme.palette.mode === 'dark'
                                                      ? '0 0 8px rgba(251, 191, 36, 0.4)'
                                                      : 'none',
                                                  color:
                                                    star <= current
                                                      ? theme.palette.mode === 'dark'
                                                        ? '#fbbf24'
                                                        : '#d97706'
                                                      : theme.palette.mode === 'dark'
                                                        ? '#d1d5db'
                                                        : '#9ca3af',
                                                  transform:
                                                    star <= current ? 'scale(1.1)' : 'scale(0.95)',
                                                  transition: 'all 0.2s ease',
                                                  opacity: star <= current ? 1 : 0.9,
                                                  border: 'none',
                                                  borderRadius: '0px',
                                                  padding: '0px',
                                                }}
                                              >
                                                {star <= current ? '★' : '☆'}
                                              </Box>
                                            ))}
                                          </>
                                        );
                                      }
                                    }
                                    return (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color:
                                            theme.palette.mode === 'dark' ? '#ff8c42' : '#ea580c',
                                          fontSize: '0.65rem',
                                          whiteSpace: 'nowrap',
                                          textShadow:
                                            theme.palette.mode === 'light'
                                              ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                              : 'none',
                                        }}
                                      >
                                        {messageText}
                                      </Typography>
                                    );
                                  })()}
                                </Box>
                              </Box>,
                            );
                          });
                        }

                        // Enchant quality issues
                        if (grouped.enchantQuality.length > 0) {
                          const enchantGroups = grouped.enchantQuality.reduce(
                            (acc, issue) => {
                              const key = issue.message;
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(issue.gearName);
                              return acc;
                            },
                            {} as Record<string, string[]>,
                          );

                          Object.entries(enchantGroups).forEach(([message, gearNames]) => {
                            const nameCounts = gearNames.reduce(
                              (acc, name) => {
                                acc[name] = (acc[name] || 0) + 1;
                                return acc;
                              },
                              {} as Record<string, number>,
                            );

                            const displayNames = Object.entries(nameCounts).map(
                              ([name, count]) => ({
                                name,
                                count,
                                display: count > 1 ? `${name}(x${count})` : name,
                              }),
                            );

                            issues.push(
                              <Box
                                key="enchant"
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  py: 0.5,
                                  px: 1,
                                  borderRadius: 0.5,
                                  backgroundColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(251,191,36,0.08)'
                                      : 'rgba(245,158,11,0.08)',
                                  border: '1px solid',
                                  borderColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(251,191,36,0.2)'
                                      : 'rgba(245,158,11,0.2)',
                                  mb: 0.5,
                                  overflow: 'hidden',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.25,
                                    flexShrink: 0,
                                    maxWidth: '180px',
                                  }}
                                >
                                  <Tooltip
                                    title={displayNames.map((d) => d.name).join(', ')}
                                    enterTouchDelay={0}
                                    leaveTouchDelay={3000}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#f59e0b' : '#b45309',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        cursor: 'default',
                                        textShadow:
                                          theme.palette.mode === 'light'
                                            ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                            : 'none',
                                      }}
                                    >
                                      {displayNames.map((d) => d.name).join(', ')}
                                    </Typography>
                                  </Tooltip>
                                  {displayNames.some((d) => d.count > 1) && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#f59e0b' : '#b45309',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        textShadow:
                                          theme.palette.mode === 'light'
                                            ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                            : 'none',
                                      }}
                                    >
                                      {displayNames.length === 1 && displayNames[0].count > 1
                                        ? `(x${displayNames[0].count})`
                                        : displayNames.filter((d) => d.count > 1).length > 0
                                          ? `(x${displayNames
                                              .filter((d) => d.count > 1)
                                              .map((d) => d.count)
                                              .join(',x')})`
                                          : ''}
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: theme.palette.mode === 'dark' ? '#f59e0b' : '#b45309',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      flexShrink: 0,
                                      textShadow:
                                        theme.palette.mode === 'light'
                                          ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                          : 'none',
                                    }}
                                  >
                                    :
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.1,
                                  }}
                                >
                                  {(() => {
                                    const messageText = message.replace(/^.*?:\s*/, '');
                                    if (
                                      messageText.includes('Enchantment quality is') &&
                                      messageText.includes('should be')
                                    ) {
                                      const currentMatch = messageText.match(
                                        /Enchantment quality is (\d+)/,
                                      );
                                      const shouldMatch = messageText.match(/should be (\d+)/);
                                      if (currentMatch && shouldMatch) {
                                        const current = parseInt(currentMatch[1]);
                                        return (
                                          <>
                                            <Box
                                              component="span"
                                              sx={{
                                                fontSize: '0.6rem',
                                                color:
                                                  theme.palette.mode === 'dark'
                                                    ? '#9ca3af'
                                                    : '#6b7280',
                                                mr: 0.2,
                                              }}
                                            >
                                              Enchant:
                                            </Box>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Box
                                                key={star}
                                                component="span"
                                                sx={{
                                                  fontSize: '1.3em',
                                                  display: 'inline-block',
                                                  lineHeight: 1,
                                                  filter:
                                                    star <= current && theme.palette.mode === 'dark'
                                                      ? 'drop-shadow(0 0 2px rgba(251, 191, 36, 0.6))'
                                                      : 'none',
                                                  textShadow:
                                                    star <= current && theme.palette.mode === 'dark'
                                                      ? '0 0 8px rgba(251, 191, 36, 0.4)'
                                                      : 'none',
                                                  color:
                                                    star <= current
                                                      ? theme.palette.mode === 'dark'
                                                        ? '#fbbf24'
                                                        : '#d97706'
                                                      : theme.palette.mode === 'dark'
                                                        ? '#d1d5db'
                                                        : '#9ca3af',
                                                  transform:
                                                    star <= current ? 'scale(1.1)' : 'scale(0.95)',
                                                  transition: 'all 0.2s ease',
                                                  opacity: star <= current ? 1 : 0.9,
                                                  border: 'none',
                                                  borderRadius: '0px',
                                                  padding: '0px',
                                                }}
                                              >
                                                {star <= current ? '★' : '☆'}
                                              </Box>
                                            ))}
                                          </>
                                        );
                                      }
                                    }
                                    return (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color:
                                            theme.palette.mode === 'dark' ? '#fbbf24' : '#d97706',
                                          fontSize: '0.65rem',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {messageText}
                                      </Typography>
                                    );
                                  })()}
                                </Box>
                              </Box>,
                            );
                          });
                        }

                        // Gear level issues
                        if (grouped.gearLevel.length > 0) {
                          const levelGroups = grouped.gearLevel.reduce(
                            (acc, issue) => {
                              const key = issue.message;
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(issue.gearName);
                              return acc;
                            },
                            {} as Record<string, string[]>,
                          );

                          Object.entries(levelGroups).forEach(([message, gearNames]) => {
                            const nameCounts = gearNames.reduce(
                              (acc, name) => {
                                acc[name] = (acc[name] || 0) + 1;
                                return acc;
                              },
                              {} as Record<string, number>,
                            );

                            const displayNames = Object.entries(nameCounts).map(
                              ([name, count]) => ({
                                name,
                                count,
                                display: count > 1 ? `${name}(x${count})` : name,
                              }),
                            );

                            issues.push(
                              <Box
                                key="level"
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  py: 0.5,
                                  px: 1,
                                  borderRadius: 0.5,
                                  backgroundColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(146,64,14,0.08)'
                                      : 'rgba(180,83,9,0.08)',
                                  border: '1px solid',
                                  borderColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(146,64,14,0.2)'
                                      : 'rgba(180,83,9,0.2)',
                                  mb: 0.5,
                                  overflow: 'hidden',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.25,
                                    flexShrink: 0,
                                    maxWidth: '180px',
                                  }}
                                >
                                  <Tooltip
                                    title={displayNames.map((d) => d.name).join(', ')}
                                    enterTouchDelay={0}
                                    leaveTouchDelay={3000}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#92400e' : '#713f12',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        cursor: 'default',
                                      }}
                                    >
                                      {displayNames.map((d) => d.name).join(', ')}
                                    </Typography>
                                  </Tooltip>
                                  {displayNames.some((d) => d.count > 1) && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#92400e' : '#713f12',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {displayNames.length === 1 && displayNames[0].count > 1
                                        ? `(x${displayNames[0].count})`
                                        : displayNames.filter((d) => d.count > 1).length > 0
                                          ? `(x${displayNames
                                              .filter((d) => d.count > 1)
                                              .map((d) => d.count)
                                              .join(',x')})`
                                          : ''}
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: theme.palette.mode === 'dark' ? '#92400e' : '#713f12',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      flexShrink: 0,
                                    }}
                                  >
                                    :
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                  }}
                                >
                                  {(() => {
                                    const messageText = message.replace(/^.*?:\s*/, '');
                                    if (
                                      messageText.includes('CP level is') &&
                                      messageText.includes('should be 160')
                                    ) {
                                      const currentMatch = messageText.match(/CP level is (\d+)/);
                                      if (currentMatch) {
                                        const current = parseInt(currentMatch[1]);
                                        return (
                                          <>
                                            <Box
                                              component="span"
                                              sx={{
                                                fontSize: '0.6rem',
                                                color:
                                                  theme.palette.mode === 'dark'
                                                    ? '#9ca3af'
                                                    : '#6b7280',
                                                textShadow:
                                                  theme.palette.mode === 'light'
                                                    ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                                    : 'none',
                                              }}
                                            >
                                              CP:
                                            </Box>
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                color:
                                                  theme.palette.mode === 'dark'
                                                    ? '#a16207'
                                                    : '#92400e',
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                textShadow:
                                                  theme.palette.mode === 'light'
                                                    ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                                    : 'none',
                                              }}
                                            >
                                              {current}
                                            </Typography>
                                            <Box
                                              component="span"
                                              sx={{
                                                fontSize: '0.65rem',
                                                color:
                                                  theme.palette.mode === 'dark'
                                                    ? '#9ca3af'
                                                    : '#6b7280',
                                                textShadow:
                                                  theme.palette.mode === 'light'
                                                    ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                                    : 'none',
                                              }}
                                            >
                                              → 160
                                            </Box>
                                          </>
                                        );
                                      }
                                    }
                                    return (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color:
                                            theme.palette.mode === 'dark' ? '#a16207' : '#92400e',
                                          fontSize: '0.65rem',
                                          whiteSpace: 'nowrap',
                                          textShadow:
                                            theme.palette.mode === 'light'
                                              ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                              : 'none',
                                        }}
                                      >
                                        {messageText}
                                      </Typography>
                                    );
                                  })()}
                                </Box>
                              </Box>,
                            );
                          });
                        }

                        // Missing buffs
                        if (grouped.missingBuffs.length > 0) {
                          grouped.missingBuffs.forEach((buff) => {
                            issues.push(
                              <Box
                                key={`buff-${buff.abilityId}`}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  py: 0.5,
                                  px: 1,
                                  borderRadius: 0.5,
                                  backgroundColor: (() => {
                                    const buffName = buff.buffName.toLowerCase();
                                    if (
                                      buffName.includes('sorcery') ||
                                      buffName.includes('prophecy')
                                    ) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(251, 191, 36, 0.08)'
                                        : 'rgba(245, 158, 11, 0.06)';
                                    } else if (
                                      buffName.includes('brutality') ||
                                      buffName.includes('savagery')
                                    ) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(239, 68, 68, 0.08)'
                                        : 'rgba(220, 38, 38, 0.06)';
                                    } else if (buffName.includes('aegis')) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(59, 130, 246, 0.08)'
                                        : 'rgba(37, 99, 235, 0.06)';
                                    } else {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(192, 132, 252, 0.08)'
                                        : 'rgba(147, 51, 234, 0.06)';
                                    }
                                  })(),
                                  border: '1px solid',
                                  borderColor: (() => {
                                    const buffName = buff.buffName.toLowerCase();
                                    if (
                                      buffName.includes('sorcery') ||
                                      buffName.includes('prophecy')
                                    ) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(251, 191, 36, 0.2)'
                                        : 'rgba(245, 158, 11, 0.15)';
                                    } else if (
                                      buffName.includes('brutality') ||
                                      buffName.includes('savagery')
                                    ) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(239, 68, 68, 0.2)'
                                        : 'rgba(220, 38, 38, 0.15)';
                                    } else if (buffName.includes('aegis')) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(59, 130, 246, 0.2)'
                                        : 'rgba(37, 99, 235, 0.15)';
                                    } else {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(192, 132, 252, 0.2)'
                                        : 'rgba(147, 51, 234, 0.15)';
                                    }
                                  })(),
                                  mb: 0.5,
                                }}
                              >
                                {(() => {
                                  // Determine buff type and colors
                                  const isSorcery = buff.buffName.toLowerCase().includes('sorcery');
                                  const isProphecy = buff.buffName
                                    .toLowerCase()
                                    .includes('prophecy');
                                  const isBrutality = buff.buffName
                                    .toLowerCase()
                                    .includes('brutality');
                                  const isSavagery = buff.buffName
                                    .toLowerCase()
                                    .includes('savagery');
                                  const isAegis = buff.buffName.toLowerCase().includes('aegis');

                                  // Set colors based on buff type
                                  let textColor;

                                  if (isSorcery || isProphecy) {
                                    // Gold for universal buffs (sorcery/prophecy)
                                    textColor =
                                      theme.palette.mode === 'dark' ? '#fbbf24' : '#d97706';
                                  } else if (isBrutality || isSavagery) {
                                    // Red for DPS buffs (brutality/savagery)
                                    textColor =
                                      theme.palette.mode === 'dark' ? '#ef4444' : '#dc2626';
                                  } else if (isAegis) {
                                    // Blue for tank buffs (aegis)
                                    textColor =
                                      theme.palette.mode === 'dark' ? '#3b82f6' : '#2563eb';
                                  } else {
                                    // Default purple for other buffs
                                    textColor =
                                      theme.palette.mode === 'dark' ? '#c084fc' : '#9333ea';
                                  }

                                  return (
                                    <>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: textColor,
                                          fontWeight: 600,
                                          fontSize: '0.75rem',
                                          flexShrink: 0,
                                        }}
                                      >
                                        {buff.buffName}:
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: textColor,
                                          fontSize: '0.75rem',
                                          opacity: 0.8,
                                        }}
                                      >
                                        Missing buff
                                      </Typography>
                                    </>
                                  );
                                })()}
                              </Box>,
                            );
                          });
                        }

                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>{issues}</Box>
                        );
                      })()}
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Gear Details Modal */}
        <GearDetailsPanel
          open={gearDetailsOpen}
          onClose={() => {
            setGearDetailsOpen(false);
            setCurrentGearPlayerId(player.id); // Reset to current player when closing
          }}
          currentPlayerId={currentGearPlayerId}
          players={allPlayers}
          onPlayerChange={setCurrentGearPlayerId}
        />
      </Box>
    );
  },
);

PlayerCard.displayName = 'PlayerCard';
