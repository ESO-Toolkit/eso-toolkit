/**
 * ImportBuildTextPanel — paste-a-build-write-up importer.
 *
 * Flow: paste text → Parse → review what was detected (per-section toggles +
 * confidence) → Apply into a new or the active setup. Resolution is heuristic,
 * so this is deliberately a review step, never a silent auto-fill.
 *
 * Lives inside the BuildCompletionHeader import dialog (the "Build text" mode).
 */

import {
  AutoAwesome as ClassIcon,
  CheckCircle as OkIcon,
  Inventory2Outlined as GearIcon,
  PersonOutlined as CharacterIcon,
  SportsEsports as SkillsIcon,
  WarningAmberOutlined as WarnIcon,
  AutoFixHigh as ChampionIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectBuildSetups } from '../store/buildEditorSelectors';
import { applyImportedBuild } from '../store/buildEditorSlice';
import {
  buildImportPayload,
  parseBuildText,
  type ImportSections,
  type ParsedBuildResult,
} from '../utils/buildTextParser';
import { buildHasContent } from '../utils/setupTransfer';

const MAX_SETUPS = 5;

const PLACEHOLDER = `Paste a build write-up here — e.g. copy the text from a build guide page.

Works best with guides that list gear in a table (Slot · Set · Trait · Enchant) plus labeled Race / Mundus / Attributes / Champion Point sections. Anything shown only as images can't be imported.`;

interface ImportBuildTextPanelProps {
  onClose: () => void;
}

const DEFAULT_SECTIONS: ImportSections = {
  gear: true,
  skills: true,
  champion: true,
  character: true,
  identity: true,
};

export const ImportBuildTextPanel: React.FC<ImportBuildTextPanelProps> = ({ onClose }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const setups = useSelector(selectBuildSetups);
  const setupCount = setups.length;
  // At the setup cap there's no room for a new setup, so importing can only
  // go into the active setup — default + lock the target accordingly.
  const atCap = setupCount >= MAX_SETUPS;
  // Class & race are BUILD-WIDE (one class shared by every setup). Changing them
  // is risky whenever the build already has real content to invalidate — more
  // than one setup, OR a single setup that already has gear/skills (even a "new
  // setup" import rewrites that existing setup's class). Only a blank build is
  // safe to auto-apply identity to. When risky it's opt-in + clearly labelled.
  const identityIsRisky = setupCount > 1 || buildHasContent(setups);

  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<ParsedBuildResult | null>(null);
  const [include, setInclude] = useState<ImportSections>(DEFAULT_SECTIONS);
  const [target, setTarget] = useState<'new' | 'active'>(atCap ? 'active' : 'new');

  const stats = useMemo(() => {
    if (!parsed) return null;
    const gearMatched = parsed.gear.filter((g) => g.itemId != null).length;
    const skillsMatched = parsed.skills.filter((s) => s.abilityId != null).length;
    const hasCharacter = Boolean(parsed.attributes || parsed.mundusId || parsed.foodName);
    const hasIdentity = Boolean(parsed.esoClass || parsed.raceId);
    return {
      gearMatched,
      gearTotal: parsed.gear.length,
      skillsMatched,
      skillsTotal: parsed.skills.length,
      cpCount: parsed.cp.length,
      hasCharacter,
      hasIdentity,
    };
  }, [parsed]);

  const handleParse = (): void => {
    const result = parseBuildText(raw);
    setParsed(result);
    // Turn off sections that found nothing so the review reflects reality.
    // Class & race are BUILD-WIDE, so default them OFF whenever the build
    // already has content (multi-setup, or a single setup with gear/skills) —
    // importing a different class would otherwise silently reclassify existing
    // setups, even on a "new setup" import.
    setInclude({
      gear: result.gear.some((g) => g.itemId != null),
      skills: result.skills.some((s) => s.abilityId != null),
      champion: result.cp.length > 0,
      character: Boolean(result.attributes || result.mundusId || result.foodName),
      identity: Boolean(result.esoClass || result.raceId) && !identityIsRisky,
    });
  };

  const handleApply = (): void => {
    if (!parsed) return;
    const payload = buildImportPayload(parsed, include);
    const hasSomething =
      Object.keys(payload.setup).length > 0 ||
      (payload.clearGearSlots?.length ?? 0) > 0 ||
      (payload.clearSkillSlots?.length ?? 0) > 0 ||
      (payload.buildFields && Object.keys(payload.buildFields).length > 0);
    if (!hasSomething) {
      enqueueSnackbar('Nothing selected to import.', { variant: 'warning' });
      return;
    }
    dispatch(applyImportedBuild({ ...payload, target }));
    enqueueSnackbar('Build details imported — review and fine-tune anything that looks off.', {
      variant: 'success',
      autoHideDuration: 6000,
    });
    onClose();
  };

  const toggle = (key: keyof ImportSections) => (): void =>
    setInclude((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <Stack spacing={1.5}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: 12,
          fontFamily: 'Space Grotesk, Inter, system-ui',
        }}
      >
        Paste a build guide&apos;s text and we&apos;ll detect the gear, skills, champion points and
        more. Review what was found, then apply it.
      </Typography>

      {!parsed ? (
        <>
          <Box
            component="textarea"
            value={raw}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRaw(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            sx={{
              width: '100%',
              minHeight: 160,
              resize: 'vertical',
              p: 1.25,
              borderRadius: 2,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              lineHeight: 1.5,
              color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.82)',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
              outline: 'none',
              '&:focus': {
                borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.5)',
              },
            }}
          />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button variant="outlined" size="small" onClick={onClose} sx={pillSx}>
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={raw.trim().length < 20}
              onClick={handleParse}
              sx={{ ...pillSx, ...accentBtn }}
            >
              Detect build
            </Button>
          </Stack>
        </>
      ) : (
        <>
          {/* Review summary */}
          <Stack spacing={0.5}>
            <ReviewRow
              icon={<ClassIcon sx={{ fontSize: 16 }} />}
              label={identityIsRisky ? 'Class & Race (all setups)' : 'Class & Race'}
              detail={
                identityIsRisky && stats?.hasIdentity
                  ? `${[parsed.esoClass && capitalize(parsed.esoClass), parsed.raceLabel].filter(Boolean).join(' · ')} — changes every setup`
                  : [parsed.esoClass && capitalize(parsed.esoClass), parsed.raceLabel]
                      .filter(Boolean)
                      .join(' · ') || 'Not detected'
              }
              available={Boolean(stats?.hasIdentity)}
              checked={include.identity}
              onToggle={toggle('identity')}
            />
            <ReviewRow
              icon={<CharacterIcon sx={{ fontSize: 16 }} />}
              label="Character"
              detail={
                [
                  parsed.attributes &&
                    `${parsed.attributes.magicka}M/${parsed.attributes.health}H/${parsed.attributes.stamina}S`,
                  parsed.mundusLabel,
                  parsed.foodName,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Not detected'
              }
              available={Boolean(stats?.hasCharacter)}
              checked={include.character}
              onToggle={toggle('character')}
            />
            <ReviewRow
              icon={<GearIcon sx={{ fontSize: 16 }} />}
              label="Gear"
              detail={
                stats && stats.gearTotal > 0
                  ? stats.gearMatched > 0
                    ? `${stats.gearMatched} of ${stats.gearTotal} sets matched`
                    : `0 of ${stats.gearTotal} matched — clears those slots`
                  : 'No gear table found'
              }
              // Available when the guide listed gear — even if nothing resolved,
              // so the user can clear the slots it named on an active import.
              available={Boolean(stats && stats.gearTotal > 0)}
              checked={include.gear}
              onToggle={toggle('gear')}
            />
            <ReviewRow
              icon={<SkillsIcon sx={{ fontSize: 16 }} />}
              label="Skills"
              detail={
                stats && stats.skillsTotal > 0
                  ? stats.skillsMatched > 0
                    ? `${stats.skillsMatched} of ${stats.skillsTotal} skills matched`
                    : `0 of ${stats.skillsTotal} matched — clears those slots`
                  : 'No skill bars found'
              }
              available={Boolean(stats && stats.skillsTotal > 0)}
              checked={include.skills}
              onToggle={toggle('skills')}
            />
            <ReviewRow
              icon={<ChampionIcon sx={{ fontSize: 16 }} />}
              label="Champion Points"
              detail={stats && stats.cpCount > 0 ? `${stats.cpCount} perks matched` : 'None found'}
              available={Boolean(stats && stats.cpCount > 0)}
              checked={include.champion}
              onToggle={toggle('champion')}
            />
          </Stack>

          {parsed.warnings.length > 0 && (
            <Alert
              severity="info"
              icon={<WarnIcon fontSize="small" />}
              sx={{
                py: 0.25,
                fontSize: 11,
                borderRadius: 2,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                '& .MuiAlert-message': { overflow: 'hidden' },
              }}
            >
              {parsed.warnings.slice(0, 4).join(' · ')}
              {parsed.warnings.length > 4 && ` · +${parsed.warnings.length - 4} more`}
            </Alert>
          )}

          {/* Target */}
          <Box>
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: 'text.secondary',
                mb: 0.5,
                fontFamily: 'Space Grotesk, Inter, system-ui',
              }}
            >
              Apply to
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={target}
              onChange={(_, v) => v && setTarget(v as 'new' | 'active')}
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontSize: 12,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  px: 1.5,
                  py: 0.5,
                },
              }}
            >
              <ToggleButton value="new" disabled={atCap}>
                New setup
              </ToggleButton>
              <ToggleButton value="active">Active setup</ToggleButton>
            </ToggleButtonGroup>
            {atCap && (
              <Typography
                sx={{
                  fontSize: 10.5,
                  color: 'text.secondary',
                  mt: 0.5,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                }}
              >
                You already have {MAX_SETUPS} setups — importing into the active setup.
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
            <Button variant="text" size="small" onClick={() => setParsed(null)} sx={pillSx}>
              ← Edit text
            </Button>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" onClick={onClose} sx={pillSx}>
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleApply}
                startIcon={<OkIcon sx={{ fontSize: 16 }} />}
                sx={{ ...pillSx, ...successBtn }}
              >
                Apply
              </Button>
            </Stack>
          </Stack>
        </>
      )}
    </Stack>
  );
};

// ── Review row ────────────────────────────────────────────────────────────────

const ReviewRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  detail: string;
  available: boolean;
  checked: boolean;
  onToggle: () => void;
}> = ({ icon, label, detail, available, checked, onToggle }) => {
  const isDark = useTheme().palette.mode === 'dark';
  return (
    <Box
      onClick={available ? onToggle : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1,
        py: 0.6,
        borderRadius: 1.5,
        cursor: available ? 'pointer' : 'default',
        opacity: available ? 1 : 0.5,
        border: `1px solid ${
          checked && available
            ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.30)'
            : isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.08)'
        }`,
        background:
          checked && available ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)' : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <Checkbox
        checked={checked && available}
        disabled={!available}
        size="small"
        sx={{ p: 0, color: 'var(--be-accent, #38bdf8)' }}
      />
      <Box sx={{ display: 'flex', color: 'var(--be-accent, #38bdf8)', opacity: 0.85 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 700,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
        <Typography
          noWrap
          sx={{
            fontSize: 11,
            color: 'text.secondary',
            fontFamily: 'Space Grotesk, Inter, system-ui',
          }}
        >
          {detail}
        </Typography>
      </Box>
    </Box>
  );
};

// ── Styling helpers ───────────────────────────────────────────────────────────

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const pillSx = {
  borderRadius: '99px',
  textTransform: 'none',
  fontFamily: 'Space Grotesk, Inter, system-ui',
  fontWeight: 600,
  fontSize: 12,
} as const;

const accentBtn = {
  background:
    'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.85), rgba(var(--be-accent-rgb, 56, 189, 248), 0.65))',
} as const;

const successBtn = {
  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.85), rgba(22, 163, 74, 0.75))',
} as const;
