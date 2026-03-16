/**
 * BuildViewPage — read-only, shareable view of a build.
 *
 * Accessible via direct link: /bv?b=<encoded>
 * Uses the same glassmorphism design system as the build editor but in
 * read-only presentation mode.
 */

import {
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  FitnessCenter as FitnessIcon,
  LocalFireDepartment as WarfareIcon,
  OpenInNew as OpenInNewIcon,
  YouTube as YouTubeIcon,
} from '@mui/icons-material';
import { Alert, Box, Button, Chip, Container, Skeleton, Snackbar, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import { staggerContainer, fadeInUp } from '../features/build-editor/components/motion/variants';
import { GlassPanel } from '../features/build-editor/components/primitives/GlassPanel';
import { BE_TOKENS } from '../features/build-editor/theme/buildEditorTokens';
import { CLASS_COLOR_MAP } from '../features/build-editor/theme/classColorMap';
import type { Build, BuildSetup, CombatRole } from '../features/build-editor/types/build.types';
import { BuildViewShell } from '../features/build-viewer/components/BuildViewShell';
import { ViewAttributeBar } from '../features/build-viewer/components/ViewAttributeBar';
import { getItemInfo } from '../features/loadout-manager/data/itemIdMap';
import { getSkillById, preloadSkillData } from '../features/loadout-manager/data/skillLineSkills';
import {
  getItemIconUrl,
  fetchItemIconUrl,
} from '../features/loadout-manager/utils/itemIconResolver';
import { decodeBuildFromURL } from '../utils/buildEncoding';

// ─── Icon CDNs ────────────────────────────────────────────────────────────────

const SKILL_ICON_URL = 'https://eso-hub.com/storage/icons/';

/**
 * Hook to ensure the skill cache is populated before rendering skill slots.
 * getSkillById uses a lazy async cache — returns undefined until ready.
 * This calls preloadSkillData() and re-renders once the cache is warm.
 */
function useSkillCacheReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void preloadSkillData().then(() => setReady(true));
  }, []);
  return ready;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const CLASS_LABELS: Record<string, string> = {
  'any-class': 'Any Class',
  dragonknight: 'Dragonknight',
  sorcerer: 'Sorcerer',
  nightblade: 'Nightblade',
  templar: 'Templar',
  warden: 'Warden',
  necromancer: 'Necromancer',
  arcanist: 'Arcanist',
};

const ROLE_LABELS: Record<string, string> = {
  tank: 'Tank',
  healer: 'Healer',
  'magicka-dps': 'Magicka DPS',
  'stamina-dps': 'Stamina DPS',
  'hybrid-dps': 'Hybrid DPS',
};

const ROLE_EMOJI: Record<CombatRole, string> = {
  tank: '\u{1F6E1}',
  healer: '\u{1FA7A}',
  'magicka-dps': '\u{2728}',
  'stamina-dps': '\u{2694}',
  'hybrid-dps': '\u{1F300}',
};

const SKILL_LINE_LABELS: Record<string, string> = {
  'class.ardent-flame': 'Ardent Flame',
  'class.draconic-power': 'Draconic Power',
  'class.earthen-heart': 'Earthen Heart',
  'class.dark-magic': 'Dark Magic',
  'class.daedric-summoning': 'Daedric Summoning',
  'class.storm-calling': 'Storm Calling',
  'class.assassination': 'Assassination',
  'class.shadow': 'Shadow',
  'class.siphoning': 'Siphoning',
  'class.aedric-spear': 'Aedric Spear',
  'class.dawns-wrath': "Dawn's Wrath",
  'class.restoring-light': 'Restoring Light',
  'class.animal-companions': 'Animal Companions',
  'class.green-balance': 'Green Balance',
  'class.winters-embrace': "Winter's Embrace",
  'class.grave-lord': 'Grave Lord',
  'class.bone-tyrant': 'Bone Tyrant',
  'class.living-death': 'Living Death',
  'class.herald-of-the-tome': 'Herald of the Tome',
  'class.soldier-of-apocrypha': 'Soldier of Apocrypha',
  'class.curative-runeforms': 'Curative Runeforms',
};

const GEAR_SLOT_NAMES: Record<number, string> = {
  0: 'Head',
  1: 'Neck',
  2: 'Chest',
  3: 'Shoulders',
  4: 'Main Hand',
  5: 'Off Hand',
  6: 'Belt',
  8: 'Legs',
  9: 'Feet',
  11: 'Ring 1',
  12: 'Ring 2',
  16: 'Gloves',
  20: 'Back Main Hand',
  21: 'Back Off Hand',
};

const GEAR_SLOT_ORDER = [0, 2, 3, 16, 6, 8, 9, 1, 11, 12, 4, 5, 20, 21];

const MUNDUS_LABELS: Record<string, string> = {
  thief: 'The Thief',
  atronach: 'The Atronach',
  shadow: 'The Shadow',
  lover: 'The Lover',
  warrior: 'The Warrior',
  mage: 'The Mage',
  apprentice: 'The Apprentice',
  serpent: 'The Serpent',
  ritual: 'The Ritual',
  steed: 'The Steed',
  lady: 'The Lady',
  lord: 'The Lord',
  tower: 'The Tower',
};

// ─── Section label ────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{
  label: string;
  count?: string;
  icon?: React.ReactNode;
}> = ({ label, count, icon }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      {icon && (
        <Box
          sx={{
            color: 'var(--be-accent, #38bdf8)',
            fontSize: 16,
            display: 'flex',
            opacity: 0.7,
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        sx={{
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
          fontFamily: 'Space Grotesk, Inter, system-ui',
        }}
      >
        {label}
      </Typography>
      {count && (
        <Typography
          sx={{
            fontSize: '0.55rem',
            fontWeight: 600,
            color: 'var(--be-accent, #38bdf8)',
            opacity: 0.7,
            ml: 'auto',
          }}
        >
          {count}
        </Typography>
      )}
    </Box>
  );
};

// ─── Skill slot display ───────────────────────────────────────────────────────

const SkillSlot: React.FC<{
  slotIndex: number;
  abilityId: number;
  isUltimate?: boolean;
}> = ({ slotIndex, abilityId, isUltimate = false }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const skill = getSkillById(abilityId);
  const iconUrl = skill?.icon ? `${SKILL_ICON_URL}${skill.icon}.png` : null;
  const size = isUltimate ? 62 : 52;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        width: size + 16,
      }}
    >
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: isUltimate ? '14px' : '12px',
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': {
            borderColor: 'var(--be-accent, #38bdf8)',
            boxShadow: '0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.15)',
          },
        }}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={skill?.name ?? `Ability ${abilityId}`}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                const fallback = document.createElement('span');
                fallback.textContent = isUltimate ? 'ULT' : String(slotIndex + 1);
                fallback.style.cssText =
                  'font-size:10px;font-weight:700;opacity:0.3;user-select:none;';
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 700,
              color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
              userSelect: 'none',
            }}
          >
            {isUltimate ? 'ULT' : slotIndex + 1}
          </Typography>
        )}
      </Box>
      <Typography
        sx={{
          fontSize: '0.58rem',
          fontWeight: 600,
          color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.55)',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: size + 16,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {skill?.name ?? `#${abilityId}`}
      </Typography>
    </Box>
  );
};

// ─── Gear slot display ────────────────────────────────────────────────────────

const GearSlotDisplay: React.FC<{ slotIndex: number; itemId: number }> = ({
  slotIndex,
  itemId,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const slotName = GEAR_SLOT_NAMES[slotIndex] ?? `Slot ${slotIndex}`;
  const itemInfo = getItemInfo(itemId);
  const [iconUrl, setIconUrl] = useState<string | null>(() => getItemIconUrl(itemId));

  // Async fallback for items not in local data
  useEffect(() => {
    if (iconUrl || !itemId) return;
    void fetchItemIconUrl(itemId).then((url) => {
      if (url) setIconUrl(url);
    });
  }, [itemId, iconUrl]);

  const displayName = itemInfo?.name ?? `Item #${itemId}`;
  const setName = itemInfo?.setName;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        py: 0.5,
        px: 1,
        borderRadius: 2,
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        transition: 'border-color 0.2s',
        '&:hover': {
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* Item icon */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={displayName}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--be-accent, #38bdf8)',
              opacity: 0.4,
            }}
          />
        )}
      </Box>

      {/* Slot label */}
      <Typography
        sx={{
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
          minWidth: 75,
          flexShrink: 0,
          fontFamily: 'Space Grotesk, Inter, system-ui',
        }}
      >
        {slotName}
      </Typography>

      {/* Item name + set name */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </Typography>
        {setName && setName !== displayName && (
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 500,
              color: 'var(--be-accent, #38bdf8)',
              opacity: 0.7,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {setName}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

// ─── Setup display ────────────────────────────────────────────────────────────

const SetupDisplay: React.FC<{ setup: BuildSetup }> = ({ setup }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const hasAttributes =
    setup.attributes.magicka > 0 || setup.attributes.health > 0 || setup.attributes.stamina > 0;
  const totalAttributes =
    setup.attributes.magicka + setup.attributes.health + setup.attributes.stamina;

  const gearEntries = GEAR_SLOT_ORDER.filter((slot) => setup.gear[slot]?.id != null).map(
    (slot) => ({ slot, id: setup.gear[slot].id as number }),
  );

  const frontBar = Object.entries(setup.skills[0] ?? {})
    .map(([slot, id]) => ({ slot: Number(slot), id }))
    .sort((a, b) => a.slot - b.slot);
  const backBar = Object.entries(setup.skills[1] ?? {})
    .map(([slot, id]) => ({ slot: Number(slot), id }))
    .sort((a, b) => a.slot - b.slot);

  const cpSlots = [
    ...setup.cp.warfare.slots.filter((s): s is number => s !== null),
    ...setup.cp.fitness.slots.filter((s): s is number => s !== null),
    ...setup.cp.craft.slots.filter((s): s is number => s !== null),
  ];
  const cpPassiveCount =
    Object.keys(setup.cp.warfare.passives).length +
    Object.keys(setup.cp.fitness.passives).length +
    Object.keys(setup.cp.craft.passives).length;

  const hasConsumables = setup.consumables.potions.length > 0 || setup.consumables.food.id != null;
  const hasMundusOrCurse = !!setup.mundusStone || (!!setup.curse && setup.curse !== 'none');

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      {/* Row 1: Attributes + Character */}
      {(hasAttributes || hasMundusOrCurse) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: hasAttributes && hasMundusOrCurse ? '1fr 1fr' : '1fr',
            },
            gap: 2,
            mb: 2,
          }}
        >
          {hasAttributes && (
            <motion.div variants={fadeInUp}>
              <GlassPanel variant="default" sx={{ p: 2 }}>
                <SectionLabel label="Attributes" count={`${totalAttributes} / 64`} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <ViewAttributeBar
                    label="Magicka"
                    color={BE_TOKENS.attributes.magicka}
                    value={setup.attributes.magicka}
                    max={64}
                  />
                  <ViewAttributeBar
                    label="Health"
                    color={BE_TOKENS.attributes.health}
                    value={setup.attributes.health}
                    max={64}
                  />
                  <ViewAttributeBar
                    label="Stamina"
                    color={BE_TOKENS.attributes.stamina}
                    value={setup.attributes.stamina}
                    max={64}
                  />
                </Box>
              </GlassPanel>
            </motion.div>
          )}

          {hasMundusOrCurse && (
            <motion.div variants={fadeInUp}>
              <GlassPanel variant="default" sx={{ p: 2 }}>
                <SectionLabel label="Character" />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {setup.mundusStone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#ffd54f',
                          boxShadow: '0 0 6px rgba(255, 213, 79, 0.5)',
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.55rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
                          minWidth: 55,
                        }}
                      >
                        Mundus
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.80)',
                        }}
                      >
                        {MUNDUS_LABELS[setup.mundusStone] ?? setup.mundusStone}
                      </Typography>
                    </Box>
                  )}
                  {setup.curse && setup.curse !== 'none' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#ce93d8',
                          boxShadow: '0 0 6px rgba(206, 147, 216, 0.5)',
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.55rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
                          minWidth: 55,
                        }}
                      >
                        Curse
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.80)',
                        }}
                      >
                        {setup.curse}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </GlassPanel>
            </motion.div>
          )}
        </Box>
      )}

      {/* Row 2: Skills */}
      {(frontBar.length > 0 || backBar.length > 0) && (
        <motion.div variants={fadeInUp}>
          <GlassPanel variant="primary" sx={{ p: 2, mb: 2 }}>
            <SectionLabel label="Skills" />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              {[
                { label: 'Front Bar', bar: frontBar },
                { label: 'Back Bar', bar: backBar },
              ].map(
                ({ label, bar }) =>
                  bar.length > 0 && (
                    <Box key={label}>
                      <Typography
                        sx={{
                          fontSize: '0.55rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                          mb: 1,
                        }}
                      >
                        {label}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {bar.map(({ slot, id }) => (
                          <SkillSlot
                            key={slot}
                            slotIndex={slot}
                            abilityId={id}
                            isUltimate={slot === 5}
                          />
                        ))}
                      </Box>
                    </Box>
                  ),
              )}
            </Box>
          </GlassPanel>
        </motion.div>
      )}

      {/* Row 3: Gear */}
      {gearEntries.length > 0 && (
        <motion.div variants={fadeInUp}>
          <GlassPanel variant="primary" sx={{ p: 2, mb: 2 }}>
            <SectionLabel label="Equipment" count={`${gearEntries.length} pieces`} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 0.5,
              }}
            >
              {gearEntries.map(({ slot, id }) => (
                <GearSlotDisplay key={slot} slotIndex={slot} itemId={id} />
              ))}
            </Box>
          </GlassPanel>
        </motion.div>
      )}

      {/* Row 4: Champion Points + Consumables */}
      {(cpSlots.length > 0 ||
        cpPassiveCount > 0 ||
        hasConsumables ||
        setup.passives.length > 0) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          {(cpSlots.length > 0 || cpPassiveCount > 0) && (
            <motion.div variants={fadeInUp}>
              <GlassPanel variant="default" sx={{ p: 2 }}>
                <SectionLabel label="Champion Points" />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {/* Warfare */}
                  {(setup.cp.warfare.slots.some((s) => s !== null) ||
                    Object.keys(setup.cp.warfare.passives).length > 0) && (
                    <CPTreeSummary
                      label="Warfare"
                      color="#ef5350"
                      icon={<WarfareIcon sx={{ fontSize: 14 }} />}
                      slots={setup.cp.warfare.slots.filter((s): s is number => s !== null)}
                      passiveCount={Object.keys(setup.cp.warfare.passives).length}
                    />
                  )}
                  {/* Fitness */}
                  {(setup.cp.fitness.slots.some((s) => s !== null) ||
                    Object.keys(setup.cp.fitness.passives).length > 0) && (
                    <CPTreeSummary
                      label="Fitness"
                      color="#66bb6a"
                      icon={<FitnessIcon sx={{ fontSize: 14 }} />}
                      slots={setup.cp.fitness.slots.filter((s): s is number => s !== null)}
                      passiveCount={Object.keys(setup.cp.fitness.passives).length}
                    />
                  )}
                  {/* Craft */}
                  {(setup.cp.craft.slots.some((s) => s !== null) ||
                    Object.keys(setup.cp.craft.passives).length > 0) && (
                    <CPTreeSummary
                      label="Craft"
                      color="#42a5f5"
                      icon={null}
                      slots={setup.cp.craft.slots.filter((s): s is number => s !== null)}
                      passiveCount={Object.keys(setup.cp.craft.passives).length}
                    />
                  )}
                </Box>
              </GlassPanel>
            </motion.div>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Consumables */}
            {hasConsumables && (
              <motion.div variants={fadeInUp}>
                <GlassPanel variant="subtle" sx={{ p: 2 }}>
                  <SectionLabel label="Consumables" />
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {setup.consumables.potions.map((p) => (
                      <Chip
                        key={p.id}
                        label={`Potion #${p.id}`}
                        size="small"
                        sx={{
                          fontSize: '0.68rem',
                          height: 24,
                          fontWeight: 600,
                          bgcolor: isDark
                            ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                            : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
                          border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
                          color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)',
                        }}
                      />
                    ))}
                    {setup.consumables.food.id != null && (
                      <Chip
                        label={`Food #${setup.consumables.food.id}`}
                        size="small"
                        sx={{
                          fontSize: '0.68rem',
                          height: 24,
                          fontWeight: 600,
                          bgcolor: isDark ? 'rgba(255,179,0,0.08)' : 'rgba(255,179,0,0.06)',
                          border: '1px solid rgba(255,179,0,0.20)',
                          color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)',
                        }}
                      />
                    )}
                  </Box>
                </GlassPanel>
              </motion.div>
            )}

            {/* Passives */}
            {setup.passives.length > 0 && (
              <motion.div variants={fadeInUp}>
                <GlassPanel variant="subtle" sx={{ p: 2 }}>
                  <SectionLabel label="Passives" />
                  <Typography
                    sx={{
                      fontSize: '0.78rem',
                      color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.60)',
                      fontWeight: 500,
                    }}
                  >
                    {setup.passives.length} passive
                    {setup.passives.length !== 1 ? 's' : ''} selected
                  </Typography>
                </GlassPanel>
              </motion.div>
            )}
          </Box>
        </Box>
      )}
    </motion.div>
  );
};

// ─── CP tree summary ──────────────────────────────────────────────────────────

const CPTreeSummary: React.FC<{
  label: string;
  color: string;
  icon: React.ReactNode;
  slots: number[];
  passiveCount: number;
}> = ({ label, color, icon, slots, passiveCount }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
        px: 1,
        borderRadius: 2,
        background: isDark ? alpha(color, 0.06) : alpha(color, 0.04),
        border: `1px solid ${alpha(color, isDark ? 0.15 : 0.1)}`,
      }}
    >
      {icon && <Box sx={{ color, opacity: 0.7, display: 'flex' }}>{icon}</Box>}
      <Typography
        sx={{
          fontSize: '0.72rem',
          fontWeight: 600,
          color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)',
          minWidth: 55,
        }}
      >
        {label}
      </Typography>
      {slots.length > 0 && (
        <Chip
          label={`${slots.length} active`}
          size="small"
          sx={{
            fontSize: '0.6rem',
            height: 20,
            fontWeight: 600,
            bgcolor: alpha(color, isDark ? 0.15 : 0.1),
            color: isDark ? alpha(color, 0.9) : color,
            border: 'none',
          }}
        />
      )}
      {passiveCount > 0 && (
        <Chip
          label={`${passiveCount} passive${passiveCount !== 1 ? 's' : ''}`}
          size="small"
          sx={{
            fontSize: '0.6rem',
            height: 20,
            fontWeight: 600,
            bgcolor: 'transparent',
            color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
            border: `1px solid ${alpha(color, 0.2)}`,
          }}
        />
      )}
    </Box>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const BuildViewPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();
  const skillCacheReady = useSkillCacheReady();

  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeSetup, setActiveSetup] = useState(0);
  const [encodedParam, setEncodedParam] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('b') ?? '';
    setEncodedParam(encoded);

    if (!encoded) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    void decodeBuildFromURL(encoded)
      .then((decoded) => {
        if (decoded) {
          setBuild(decoded);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, []);

  const handleCopyLink = (): void => {
    const url = `${window.location.origin}${window.location.pathname}?b=${encodedParam}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setSnackbar({ open: true, message: 'Link copied!', severity: 'success' }))
      .catch(() => setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' }));
  };

  const handleOpenInEditor = (): void => {
    const basePath = window.location.pathname.replace(/\/bv(\/.*)?$/, '');
    window.location.href = `${window.location.origin}${basePath}/build-editor?b=${encodedParam}`;
  };

  // ── Loading ──
  if (loading || !skillCacheReady) {
    return (
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6, px: { xs: 2, sm: 3 } }}>
        <Skeleton
          variant="rectangular"
          height={400}
          sx={{ borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
        />
      </Container>
    );
  }

  // ── Not found ──
  if (notFound || !build) {
    return (
      <Container maxWidth="sm" sx={{ pt: 8, pb: 6 }}>
        <GlassPanel variant="default" sx={{ p: 3 }}>
          <Alert severity="error" sx={{ borderRadius: '12px', mb: 2 }}>
            No build found in the URL. Please check the link and try again.
          </Alert>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              window.location.href = '/build-editor';
            }}
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            Open Build Editor
          </Button>
        </GlassPanel>
      </Container>
    );
  }

  const classLabel = CLASS_LABELS[build.esoClass] ?? build.esoClass;
  const roleLabel = ROLE_LABELS[build.role] ?? build.role;
  const classTheme = CLASS_COLOR_MAP[build.esoClass];
  const classSkillLineLabels = build.classSkillLines
    .filter(Boolean)
    .map((sl) => (sl ? (SKILL_LINE_LABELS[sl] ?? sl) : null))
    .filter(Boolean) as string[];

  return (
    <Container maxWidth="lg" sx={{ pt: 3, pb: 6, px: { xs: 2, sm: 3 } }}>
      <BuildViewShell esoClass={build.esoClass}>
        <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2, sm: 3, md: 4 } }}>
          <motion.div
            variants={staggerContainer}
            initial={prefersReduced ? 'visible' : 'hidden'}
            animate="visible"
          >
            {/* ── Banner image ── */}
            {build.guide.bannerImageUrl && (
              <motion.div variants={fadeInUp}>
                <Box
                  sx={{
                    width: '100%',
                    height: { xs: 140, sm: 200 },
                    borderRadius: 2.5,
                    overflow: 'hidden',
                    mb: 3,
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '50%',
                      background:
                        'linear-gradient(to top, rgba(8, 14, 26, 0.7) 0%, transparent 100%)',
                      pointerEvents: 'none',
                    },
                  }}
                >
                  <img
                    src={build.guide.bannerImageUrl}
                    alt={`${build.name} banner`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </Box>
              </motion.div>
            )}

            {/* ── Header ── */}
            <motion.div variants={fadeInUp}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  {/* Class + Role badges */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={classLabel}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        bgcolor: alpha(classTheme.accent, isDark ? 0.18 : 0.12),
                        color: classTheme.accent,
                        border: `1px solid ${alpha(classTheme.accent, 0.35)}`,
                        letterSpacing: '0.03em',
                      }}
                    />
                    <Chip
                      label={`${ROLE_EMOJI[build.role] ?? ''} ${roleLabel}`}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.60)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                      }}
                    />
                    <Chip
                      label={build.gameMode.toUpperCase()}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        bgcolor: 'transparent',
                        color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                      }}
                    />
                  </Box>

                  {/* Build name */}
                  <Typography
                    component="h1"
                    sx={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      fontSize: { xs: '1.5rem', sm: '1.8rem' },
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                      background: `linear-gradient(135deg, ${classTheme.accent} 0%, ${isDark ? '#f1f5f9' : '#0f172a'} 60%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {build.name || 'Unnamed Build'}
                  </Typography>

                  {build.shortDescription && (
                    <Typography
                      sx={{
                        fontSize: '0.85rem',
                        color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                        mt: 0.75,
                        maxWidth: 520,
                        lineHeight: 1.5,
                      }}
                    >
                      {build.shortDescription}
                    </Typography>
                  )}
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  <Button
                    size="small"
                    startIcon={<CopyIcon sx={{ fontSize: '0.85rem !important' }} />}
                    onClick={handleCopyLink}
                    sx={{
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                      backdropFilter: 'blur(8px)',
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: 'var(--be-accent, #38bdf8)',
                      },
                    }}
                  >
                    Copy Link
                  </Button>
                  <Button
                    size="small"
                    startIcon={<EditIcon sx={{ fontSize: '0.85rem !important' }} />}
                    endIcon={<OpenInNewIcon sx={{ fontSize: '0.7rem !important' }} />}
                    onClick={handleOpenInEditor}
                    sx={{
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: isDark ? '#fff' : '#fff',
                      background: `linear-gradient(135deg, ${classTheme.accent} 0%, ${alpha(classTheme.accent, 0.7)} 100%)`,
                      border: 'none',
                      boxShadow: `0 4px 16px ${alpha(classTheme.accent, 0.3)}`,
                      '&:hover': {
                        boxShadow: `0 6px 24px ${alpha(classTheme.accent, 0.45)}`,
                      },
                    }}
                  >
                    Edit Build
                  </Button>
                </Box>
              </Box>
            </motion.div>

            {/* ── Build overview ── */}
            <motion.div variants={fadeInUp}>
              <GlassPanel variant="primary" glow sx={{ p: 2.5, mb: 3 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 3,
                  }}
                >
                  {/* Left: Race + DLC */}
                  <Box>
                    {build.races.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography
                          sx={{
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                            mb: 0.75,
                          }}
                        >
                          Recommended Races
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {build.races.map((race) => (
                            <Chip
                              key={race}
                              label={race.replace(/-/g, ' ')}
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: '0.68rem',
                                fontWeight: 500,
                                textTransform: 'capitalize',
                                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                                color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {build.settings.dlc && build.settings.dlc !== 'Base Game' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          sx={{
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                          }}
                        >
                          DLC
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.78rem',
                            fontWeight: 500,
                            color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)',
                          }}
                        >
                          {build.settings.dlc}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Right: Class Skill Lines + YouTube */}
                  <Box>
                    {classSkillLineLabels.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography
                          sx={{
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                            mb: 0.75,
                          }}
                        >
                          Class Skill Lines
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                          }}
                        >
                          {classSkillLineLabels.map((sl, i) => (
                            <Box
                              key={sl}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: classTheme.accent,
                                  opacity: 1 - i * 0.2,
                                  boxShadow: `0 0 6px ${alpha(classTheme.accent, 0.5)}`,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)',
                                }}
                              >
                                {sl}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                    {build.guide.youtubeUrl && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<YouTubeIcon sx={{ color: '#ef4444' }} />}
                        href={build.guide.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          borderRadius: '10px',
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                          '&:hover': {
                            borderColor: '#ef4444',
                            bgcolor: 'rgba(239, 68, 68, 0.06)',
                          },
                        }}
                      >
                        Video Guide
                      </Button>
                    )}
                  </Box>
                </Box>
              </GlassPanel>
            </motion.div>

            {/* ── Setup tabs ── */}
            {build.setups.length > 1 && (
              <motion.div variants={fadeInUp}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.75,
                    mb: 2.5,
                    flexWrap: 'wrap',
                  }}
                >
                  {build.setups.map((setup, i) => {
                    const isActive = i === activeSetup;
                    return (
                      <Button
                        key={setup.id}
                        size="small"
                        onClick={() => setActiveSetup(i)}
                        sx={{
                          borderRadius: '10px',
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          fontWeight: isActive ? 700 : 500,
                          px: 2,
                          py: 0.75,
                          color: isActive
                            ? '#fff'
                            : isDark
                              ? 'rgba(255,255,255,0.55)'
                              : 'rgba(0,0,0,0.50)',
                          background: isActive
                            ? `linear-gradient(135deg, ${classTheme.accent} 0%, ${alpha(classTheme.accent, 0.7)} 100%)`
                            : isDark
                              ? 'rgba(255,255,255,0.04)'
                              : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${
                            isActive
                              ? alpha(classTheme.accent, 0.5)
                              : isDark
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(0,0,0,0.06)'
                          }`,
                          boxShadow: isActive
                            ? `0 4px 16px ${alpha(classTheme.accent, 0.3)}`
                            : 'none',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: isActive
                              ? alpha(classTheme.accent, 0.7)
                              : 'var(--be-accent, #38bdf8)',
                          },
                        }}
                      >
                        {setup.name || `Setup ${i + 1}`}
                      </Button>
                    );
                  })}
                </Box>
              </motion.div>
            )}

            {/* ── Active setup ── */}
            <AnimatePresence mode="wait">
              {build.setups[activeSetup] && (
                <motion.div
                  key={activeSetup}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <SetupDisplay setup={build.setups[activeSetup]} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Guide note ── */}
            {!build.guide.content && build.guide.youtubeUrl && (
              <motion.div variants={fadeInUp}>
                <GlassPanel variant="subtle" sx={{ p: 1.5, mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                      Full guide content is available when the build is loaded in the editor.
                    </Typography>
                  </Box>
                </GlassPanel>
              </motion.div>
            )}
          </motion.div>
        </Box>
      </BuildViewShell>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ borderRadius: '10px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
