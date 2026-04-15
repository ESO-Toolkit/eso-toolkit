/**
 * ExtraGearPicker — visual gear set picker for "additional sets" in roster slot cards.
 *
 * Shows selected sets as compact tiles with category color coding.
 * A "+" button opens a grouped picker dialog to browse/search all sets.
 * Stores KnownSetIDs (numbers).
 */

import { Add as AddIcon, Close as CloseIcon, OpenInNew as OpenInNewIcon, Search as SearchIcon } from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useMemo, useState } from 'react';

import { KnownSetIDs } from '@/types/abilities';
import {
  ALL_5PIECE_SETS,
  DD_SPECIAL_SETS,
  MONSTER_SETS,
  TANK_5PIECE_SETS,
  TANK_MONSTER_SETS,
  HEALER_5PIECE_SETS,
  HEALER_MONSTER_SETS,
  FLEXIBLE_5PIECE_SETS,
  FLEXIBLE_MONSTER_SETS,
} from '@/types/roster';
import { getEsoHubSetUrl } from '@/utils/esoHubLinks';
import { getSetDisplayName } from '@/utils/setNameUtils';

// ── Constants ────────────────────────────────────────────────────────────────

const TILE_HEIGHT = 36;

// Category colors for visual distinction
const CATEGORY_COLORS = {
  ddSpecial: '#ef6c00',
  tank: '#1e88e5',
  healer: '#43a047',
  monster: '#7c4dff',
  flexible: '#00acc1',
  other: '#78909c',
} as const;

// ── Category Helpers ─────────────────────────────────────────────────────────

type SetCategory = 'ddSpecial' | 'tank' | 'healer' | 'monster' | 'flexible' | 'other';

function getSetCategory(setId: KnownSetIDs): SetCategory {
  if ((DD_SPECIAL_SETS as readonly KnownSetIDs[]).includes(setId)) return 'ddSpecial';
  if ((TANK_MONSTER_SETS as readonly KnownSetIDs[]).includes(setId)) return 'monster';
  if ((HEALER_MONSTER_SETS as readonly KnownSetIDs[]).includes(setId)) return 'monster';
  if ((FLEXIBLE_MONSTER_SETS as readonly KnownSetIDs[]).includes(setId)) return 'monster';
  if ((MONSTER_SETS as readonly KnownSetIDs[]).includes(setId)) return 'monster';
  if ((TANK_5PIECE_SETS as readonly KnownSetIDs[]).includes(setId)) return 'tank';
  if ((HEALER_5PIECE_SETS as readonly KnownSetIDs[]).includes(setId)) return 'healer';
  if ((FLEXIBLE_5PIECE_SETS as readonly KnownSetIDs[]).includes(setId)) return 'flexible';
  return 'other';
}

function getCategoryColor(cat: SetCategory): string {
  return CATEGORY_COLORS[cat];
}

const CATEGORY_LABELS: Record<SetCategory, string> = {
  ddSpecial: 'DD Special',
  tank: 'Tank Sets',
  healer: 'Healer Sets',
  monster: 'Monster / Mythic',
  flexible: 'Hybrid Sets',
  other: 'Other',
};

// ── Set Groups for the picker dialog ─────────────────────────────────────────

interface SetGroup {
  label: string;
  category: SetCategory;
  sets: { id: KnownSetIDs; name: string }[];
}

function buildSetGroups(): SetGroup[] {
  const allIds = new Set<KnownSetIDs>([...ALL_5PIECE_SETS, ...MONSTER_SETS]);
  const grouped = new Map<SetCategory, { id: KnownSetIDs; name: string }[]>();

  for (const id of allIds) {
    const cat = getSetCategory(id);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push({ id, name: getSetDisplayName(id) });
  }

  // Sort each group alphabetically by name
  for (const sets of grouped.values()) {
    sets.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Order: DD Special, Monster, Tank, Healer, Flexible, Other
  const order: SetCategory[] = ['ddSpecial', 'monster', 'tank', 'healer', 'flexible', 'other'];
  return order
    .filter((cat) => grouped.has(cat))
    .map((cat) => ({
      label: CATEGORY_LABELS[cat],
      category: cat,
      sets: grouped.get(cat)!,
    }));
}

const SET_GROUPS = buildSetGroups();

// ── Set Tile (selected set display) ──────────────────────────────────────────

interface SetTileProps {
  setId: KnownSetIDs;
  onRemove: () => void;
}

const SetTile: React.FC<SetTileProps> = ({ setId, onRemove }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const name = getSetDisplayName(setId);
  const cat = getSetCategory(setId);
  const color = getCategoryColor(cat);

  return (
    <Tooltip title={`${name} · ${CATEGORY_LABELS[cat]}`} arrow placement="top" enterDelay={400}>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          height: TILE_HEIGHT,
          px: 1.25,
          borderRadius: '8px',
          border: `1px solid ${isDark ? `${color}55` : `${color}40`}`,
          background: isDark ? `${color}18` : `${color}0C`,
          cursor: 'default',
          transition: 'all 180ms ease',
          '&:hover': {
            borderColor: `${color}88`,
          },
          '&:hover .set-clear': { opacity: 1 },
          '&:hover .set-esohub-link': { opacity: 1 },
        }}
      >
        {/* Category dot */}
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 4px ${color}88`,
            flexShrink: 0,
          }}
        />
        {/* Set name */}
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? `${color}CC` : color,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 160,
          }}
        >
          {name}
        </Typography>
        {/* ESO-Hub attribution link */}
        <Box
          component="a"
          href={getEsoHubSetUrl(name)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          aria-label={`${name} on ESO-Hub`}
          title="View on ESO-Hub"
          className="set-esohub-link"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
            flexShrink: 0,
            lineHeight: 0,
            opacity: 0,
            transition: 'opacity 150ms',
            '&:hover': { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' },
          }}
        >
          <OpenInNewIcon sx={{ fontSize: 11 }} />
        </Box>
        {/* Remove button */}
        <ButtonBase
          className="set-clear"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
            flexShrink: 0,
            borderRadius: 1,
            p: 0.15,
            ml: 0.25,
            opacity: 0,
            transition: 'opacity 150ms',
            '&:hover': { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' },
          }}
        >
          <CloseIcon sx={{ fontSize: 13 }} />
        </ButtonBase>
      </Box>
    </Tooltip>
  );
};

// ── Picker Dialog ────────────────────────────────────────────────────────────

interface PickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (setId: KnownSetIDs) => void;
  selectedIds: Set<KnownSetIDs>;
}

const PickerDialog: React.FC<PickerDialogProps> = ({ open, onClose, onSelect, selectedIds }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return SET_GROUPS;
    const q = search.toLowerCase().trim();
    return SET_GROUPS.map((group) => ({
      ...group,
      sets: group.sets.filter((s) => s.name.toLowerCase().includes(q)),
    })).filter((g) => g.sets.length > 0);
  }, [search]);

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        setSearch('');
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          backdropFilter: 'blur(24px)',
          background: isDark ? 'rgba(12,12,22,0.96)' : 'rgba(255,255,255,0.97)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.55)' : '0 24px 64px rgba(0,0,0,0.12)',
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontFamily: 'Space Grotesk, Inter, system-ui',
          fontSize: '1rem',
          pb: 1,
          background: isDark
            ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Add Gear Set
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sets..."
            size="small"
            fullWidth
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, opacity: 0.4 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderRadius: 2,
                fontSize: 13,
              },
            }}
          />
        </Box>

        <Box sx={{ maxHeight: 400, overflowY: 'auto', px: 1.5, pb: 2 }}>
          {filteredGroups.length === 0 ? (
            <Typography
              sx={{
                fontSize: 12,
                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                textAlign: 'center',
                py: 3,
              }}
            >
              No sets found
            </Typography>
          ) : (
            <Stack spacing={2}>
              {filteredGroups.map((group) => {
                const color = getCategoryColor(group.category);
                return (
                  <Box key={group.label}>
                    {/* Group header */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 0.5,
                        mb: 0.75,
                      }}
                    >
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: color,
                          boxShadow: `0 0 5px ${color}88`,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: 9,
                          fontWeight: 700,
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                          color,
                        }}
                      >
                        {group.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 9,
                          color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                          fontFamily: 'Space Grotesk',
                        }}
                      >
                        {group.sets.length}
                      </Typography>
                    </Box>

                    {/* Set items */}
                    <Stack spacing={0.25}>
                      {group.sets.map((set) => {
                        const isSelected = selectedIds.has(set.id);
                        return (
                          <ButtonBase
                            key={set.id}
                            onClick={() => !isSelected && onSelect(set.id)}
                            disabled={isSelected}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              py: 0.6,
                              px: 1,
                              borderRadius: 1.5,
                              width: '100%',
                              textAlign: 'left',
                              opacity: isSelected ? 0.4 : 1,
                              '&:hover:not(:disabled)': {
                                background: isDark ? `${color}15` : `${color}0A`,
                              },
                            }}
                          >
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: color,
                                flexShrink: 0,
                                opacity: isSelected ? 0.4 : 1,
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: isSelected ? 600 : 400,
                                fontFamily: 'Space Grotesk, Inter, system-ui',
                                color: isSelected
                                  ? color
                                  : isDark
                                    ? 'rgba(255,255,255,0.80)'
                                    : 'rgba(0,0,0,0.75)',
                              }}
                            >
                              {set.name}
                            </Typography>
                            {isSelected && (
                              <Typography
                                sx={{
                                  fontSize: 10,
                                  fontStyle: 'italic',
                                  color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                                  ml: 'auto',
                                }}
                              >
                                added
                              </Typography>
                            )}
                          </ButtonBase>
                        );
                      })}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

// ── Public Component ─────────────────────────────────────────────────────────

export interface ExtraGearPickerProps {
  value: KnownSetIDs[];
  onChange: (ids: KnownSetIDs[]) => void;
}

export const ExtraGearPicker: React.FC<ExtraGearPickerProps> = ({ value, onChange }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedIds = useMemo(() => new Set(value), [value]);

  const handleAdd = useCallback(
    (setId: KnownSetIDs) => {
      if (!selectedIds.has(setId)) {
        onChange([...value, setId]);
      }
    },
    [value, selectedIds, onChange],
  );

  const handleRemove = useCallback(
    (setId: KnownSetIDs) => {
      onChange(value.filter((v) => v !== setId));
    },
    [value, onChange],
  );

  return (
    <Stack spacing={1}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          fontFamily: 'Space Grotesk, Inter, system-ui',
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
        }}
      >
        Extra Gear
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flexWrap: 'wrap',
          rowGap: 0.75,
        }}
      >
        {value.map((setId) => (
          <SetTile key={setId} setId={setId} onRemove={() => handleRemove(setId)} />
        ))}

        {/* Add button */}
        <Tooltip title="Add a gear set" arrow placement="top">
          <ButtonBase
            onClick={() => setDialogOpen(true)}
            aria-label="Add gear set"
            sx={{
              height: TILE_HEIGHT,
              px: 1.25,
              borderRadius: '8px',
              border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              flexShrink: 0,
              transition: 'all 180ms ease',
              '&:hover': {
                borderColor: isDark ? 'rgba(56,189,248,0.5)' : 'rgba(56,189,248,0.4)',
                background: isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.04)',
                transform: 'scale(1.03)',
              },
            }}
          >
            <AddIcon
              sx={{
                fontSize: 16,
                color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
              }}
            />
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 500,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
              }}
            >
              Add set
            </Typography>
          </ButtonBase>
        </Tooltip>
      </Box>

      <PickerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSelect={handleAdd}
        selectedIds={selectedIds}
      />
    </Stack>
  );
};
