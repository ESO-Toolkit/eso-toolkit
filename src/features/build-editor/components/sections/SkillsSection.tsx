/**
 * Skills Section — horizontal ESO-style skill bars.
 *
 * Each bar renders 5 ability icon tiles + 1 larger ultimate tile inside
 * a glass "action bar" tray. Click a tile to open a dialog-based skill
 * picker with icon thumbnails.
 */

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Autocomplete,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { AutocompleteInputChangeReason } from '@mui/material/Autocomplete';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import type { SkillData } from '../../../../data/types/skill-line-types';
import { getSkillById, searchSkills } from '../../../loadout-manager/data/skillLineSkills';
import type { SkillsConfig } from '../../../loadout-manager/types/loadout.types';
import { setSkills } from '../../store/buildEditorSlice';

// ── Constants ───────────────────────────────────────────────────────────────

const SKILL_SLOTS = [3, 4, 5, 6, 7];
const ULTIMATE_SLOT = 8;
const ALL_SLOTS = [...SKILL_SLOTS, ULTIMATE_SLOT];
const MIN_SEARCH = 2;
const MAX_RESULTS = 100;

const TILE_SIZE = 58;
const ULT_SIZE = 66;

const SLOT_LABELS: Record<number, string> = {
  3: '1',
  4: '2',
  5: '3',
  6: '4',
  7: '5',
  8: 'U',
};

const countFilled = (bar: Record<number, number>): number =>
  ALL_SLOTS.filter((s) => bar[s] !== undefined && bar[s] > 0).length;

// ── Skill Slot Tile ─────────────────────────────────────────────────────────

interface SkillSlotTileProps {
  barIndex: 0 | 1;
  slotIndex: number;
  abilityId: number | undefined;
  onSelect: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onRemove: (barIndex: 0 | 1, slotIndex: number) => void;
}

const SkillSlotTile: React.FC<SkillSlotTileProps> = ({
  barIndex,
  slotIndex,
  abilityId,
  onSelect,
  onRemove,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const isUlt = slotIndex === ULTIMATE_SLOT;
  const skill = abilityId ? getSkillById(abilityId) : null;
  const size = isUlt ? ULT_SIZE : TILE_SIZE;
  const label = SLOT_LABELS[slotIndex] ?? String(slotIndex);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [results, setResults] = useState<SkillData[]>([]);

  const accentA = (a: number): string =>
    isUlt ? `rgba(255,179,0,${a})` : `rgba(var(--be-accent-rgb, 56,189,248),${a})`;

  const handleInput = useCallback(
    (_: React.SyntheticEvent, v: string, r: AutocompleteInputChangeReason): void => {
      setInput(v);
      if (r === 'reset' || r === 'clear') {
        setResults([]);
        return;
      }
      setResults(v.trim().length >= MIN_SEARCH ? searchSkills(v, MAX_RESULTS) : []);
    },
    [],
  );

  const handlePick = useCallback(
    (s: SkillData | null): void => {
      if (s) onSelect(barIndex, slotIndex, s.id);
      else onRemove(barIndex, slotIndex);
      setOpen(false);
      setInput('');
      setResults([]);
    },
    [barIndex, slotIndex, onSelect, onRemove],
  );

  const noOpts = useMemo(
    () =>
      input.trim().length < MIN_SEARCH
        ? `Type ${MIN_SEARCH}+ characters to search`
        : 'No skills found',
    [input],
  );

  return (
    <>
      {/* ── Tile + Label column ── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          flex: isUlt ? undefined : 1,
          maxWidth: isUlt ? ULT_SIZE : TILE_SIZE + 16,
          minWidth: isUlt ? ULT_SIZE : TILE_SIZE,
        }}
      >
        <Tooltip
          title={
            skill
              ? `${skill.name}${skill.category ? ` · ${skill.category}` : ''}`
              : `Slot ${label}${isUlt ? ' (Ultimate)' : ''} — click to assign`
          }
          arrow
          placement="top"
        >
          <Box
            onClick={() => setOpen(true)}
            sx={{
              position: 'relative',
              width: size,
              height: size,
              borderRadius: isUlt ? '14px' : '12px',
              cursor: 'pointer',
              overflow: 'hidden',
              flexShrink: 0,
              border: `${isUlt ? 2 : 1.5}px solid ${
                skill ? accentA(0.45) : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'
              }`,
              background: skill
                ? isDark
                  ? accentA(0.08)
                  : accentA(0.04)
                : isDark
                  ? 'rgba(255,255,255,0.025)'
                  : 'rgba(0,0,0,0.015)',
              boxShadow: skill
                ? isDark
                  ? `0 0 14px ${accentA(0.12)}, inset 0 1px 0 rgba(255,255,255,0.04)`
                  : 'inset 0 1px 0 rgba(255,255,255,0.5)'
                : isDark
                  ? 'inset 0 1px 0 rgba(255,255,255,0.025)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.4)',
              transition: 'all 180ms ease',
              '&:hover': {
                transform: 'scale(1.08)',
                borderColor: accentA(0.70),
                background: isDark ? accentA(0.14) : accentA(0.08),
                boxShadow: isDark
                  ? `0 6px 20px rgba(0,0,0,0.30), 0 0 18px ${accentA(0.16)}`
                  : `0 6px 16px rgba(0,0,0,0.08)`,
              },
              '&:hover .skill-clear': { opacity: 1 },
            }}
          >
            {/* Skill icon */}
            {skill?.icon ? (
              <img
                src={`https://eso-hub.com/storage/icons/${skill.icon}.png`}
                alt={skill.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <Typography
                  sx={{
                    fontSize: isUlt ? 16 : 13,
                    fontWeight: 800,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    letterSpacing: 0.4,
                    color: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.13)',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  {label}
                </Typography>
              </Box>
            )}

            {/* Clear overlay */}
            {skill && (
              <Box
                className="skill-clear"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onRemove(barIndex, slotIndex);
                }}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.60)',
                  backdropFilter: 'blur(2px)',
                  opacity: 0,
                  transition: 'opacity 150ms',
                  cursor: 'pointer',
                }}
              >
                <CloseIcon
                  sx={{ fontSize: isUlt ? 22 : 17, color: 'rgba(255,255,255,0.90)' }}
                />
              </Box>
            )}
          </Box>
        </Tooltip>

        {/* Skill name (only when assigned) */}
        {skill && (
          <Typography
            sx={{
              fontSize: '0.58rem',
              fontWeight: 600,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              color: isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.45)',
              lineHeight: 1.15,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              maxWidth: size + 8,
              userSelect: 'none',
            }}
          >
            {skill.name}
          </Typography>
        )}
      </Box>

      {/* ── Picker dialog ── */}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setInput('');
          setResults([]);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backdropFilter: 'blur(24px)',
            background: isDark ? 'rgba(12,12,22,0.94)' : 'rgba(255,255,255,0.97)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
            boxShadow: isDark
              ? '0 24px 64px rgba(0,0,0,0.55)'
              : '0 24px 64px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontSize: '1rem',
            background: isDark
              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {isUlt ? 'Assign Ultimate' : `Assign Skill · Slot ${label}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Autocomplete
              options={results}
              value={skill || null}
              inputValue={input}
              onInputChange={handleInput}
              onChange={(_, v) => handlePick(v)}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText={noOpts}
              autoHighlight
              clearOnBlur={false}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search for a skill"
                  placeholder={`Type at least ${MIN_SEARCH} characters...`}
                  autoFocus
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: 2,
                    },
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...rest } = props;
                return (
                  <Box
                    component="li"
                    key={key}
                    {...rest}
                    sx={{
                      py: '8px !important',
                      px: '12px !important',
                      gap: 1.25,
                      display: 'flex !important',
                      alignItems: 'center !important',
                    }}
                  >
                    {option.icon ? (
                      <img
                        src={`https://eso-hub.com/storage/icons/${option.icon}.png`}
                        alt=""
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 6,
                          flexShrink: 0,
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                          objectFit: 'cover',
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: '6px',
                          flexShrink: 0,
                          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                        }}
                      />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          lineHeight: 1.3,
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                        }}
                      >
                        {option.name}
                      </Typography>
                      {option.category && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ lineHeight: 1.2, fontSize: '0.7rem' }}
                        >
                          {option.category}
                          {option.type ? ` · ${option.type}` : ''}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── Skill Bar ───────────────────────────────────────────────────────────────

interface SkillBarProps {
  label: string;
  barIndex: 0 | 1;
  bar: Record<number, number>;
  onSelect: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onRemove: (barIndex: 0 | 1, slotIndex: number) => void;
}

const SkillBar: React.FC<SkillBarProps> = ({ label, barIndex, bar, onSelect, onRemove }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const filled = countFilled(bar);

  return (
    <Box>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5, px: 0.5 }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontSize: '0.65rem',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            background: isDark
              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            px: 0.75,
            py: 0.15,
            borderRadius: '999px',
            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: '0.62rem', fontWeight: 600, fontFamily: 'Space Grotesk' }}
          >
            {filled} / 6
          </Typography>
        </Box>
      </Stack>

      {/* Action bar tray — glass container holding all slots */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: { xs: 0.75, sm: 1.25 },
          py: 1.5,
          px: 1.5,
          borderRadius: 3,
          background: isDark
            ? 'rgba(255,255,255,0.015)'
            : 'rgba(0,0,0,0.012)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          rowGap: 1,
        }}
      >
        {SKILL_SLOTS.map((slot) => (
          <SkillSlotTile
            key={slot}
            barIndex={barIndex}
            slotIndex={slot}
            abilityId={bar[slot]}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        ))}

        {/* Gradient divider before ultimate */}
        <Box
          sx={{
            width: 1.5,
            height: ULT_SIZE * 0.7,
            borderRadius: 1,
            flexShrink: 0,
            alignSelf: 'center',
            background: isDark
              ? 'linear-gradient(180deg, transparent 0%, rgba(255,179,0, 0.40) 50%, transparent 100%)'
              : 'linear-gradient(180deg, transparent 0%, rgba(255,179,0, 0.25) 50%, transparent 100%)',
          }}
        />

        <SkillSlotTile
          barIndex={barIndex}
          slotIndex={ULTIMATE_SLOT}
          abilityId={bar[ULTIMATE_SLOT]}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      </Box>
    </Box>
  );
};

// ── Main ────────────────────────────────────────────────────────────────────

export const SkillsSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];
  const isDark = useTheme().palette.mode === 'dark';

  const handleSelect = useCallback(
    (barIndex: 0 | 1, slotIndex: number, abilityId: number): void => {
      const updated: SkillsConfig = {
        ...setup.skills,
        [barIndex]: { ...setup.skills[barIndex], [slotIndex]: abilityId },
      };
      dispatch(setSkills(updated));
    },
    [dispatch, setup.skills],
  );

  const handleRemove = useCallback(
    (barIndex: 0 | 1, slotIndex: number): void => {
      const bar = { ...setup.skills[barIndex] };
      delete bar[slotIndex];
      dispatch(setSkills({ ...setup.skills, [barIndex]: bar }));
    },
    [dispatch, setup.skills],
  );

  return (
    <Stack spacing={2.5} sx={{ height: '100%' }}>
      <SkillBar
        label="Front Bar"
        barIndex={0}
        bar={setup.skills[0] ?? {}}
        onSelect={handleSelect}
        onRemove={handleRemove}
      />

      {/* Weapon swap divider */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
        <Box
          sx={{
            flex: 1,
            height: 1,
            background: isDark
              ? 'linear-gradient(90deg, transparent 0%, rgba(var(--be-accent-rgb, 56,189,248), 0.20) 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(var(--be-accent-rgb, 56,189,248), 0.12) 100%)',
          }}
        />
        <Typography
          sx={{
            fontSize: '0.56rem',
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.18)',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          weapon swap
        </Typography>
        <Box
          sx={{
            flex: 1,
            height: 1,
            background: isDark
              ? 'linear-gradient(90deg, rgba(var(--be-accent-rgb, 56,189,248), 0.20) 0%, transparent 100%)'
              : 'linear-gradient(90deg, rgba(var(--be-accent-rgb, 56,189,248), 0.12) 0%, transparent 100%)',
          }}
        />
      </Stack>

      <SkillBar
        label="Back Bar"
        barIndex={1}
        bar={setup.skills[1] ?? {}}
        onSelect={handleSelect}
        onRemove={handleRemove}
      />
    </Stack>
  );
};
