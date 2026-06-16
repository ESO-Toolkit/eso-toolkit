/**
 * AllSetsBrowser — the rebuilt "All Sets" tab of the Roster Builder's
 * SetAssignmentManager.
 *
 * Mirrors the build-editor gear picker UX (GearPickerDialog): content-type tabs
 * with counts, live debounced search, set rows with a type chip and an optional
 * collapsible set-bonus preview. Scoped to the genuinely-assignable universe
 * (see allSetsCatalog) so every set shown can actually be assigned — no
 * dead-ends. Clicking a row opens the shared assign popover via `onSetClick`.
 */

import {
  CheckCircle as CheckCircleIcon,
  Favorite as FavoriteIcon,
  Search as SearchIcon,
  Shield as ShieldIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useMemo, useState } from 'react';

import {
  SET_TYPE_COLORS,
  SET_TYPE_ORDER,
  type GearSetType,
} from '../../features/build-editor/data/gearSetRegistry';
import { useDebouncedValue } from '../../features/build-editor/hooks/useDebouncedValue';
import { RICH_TOOLTIP_SLOT_PROPS } from '../../utils/richTooltipSlotProps';
import { GearSetTooltip } from '../GearSetTooltip';

import {
  getAssignableSets,
  getSetTooltipProps,
  type AssignableSet,
  type SetRole,
} from './allSetsCatalog';

const SEARCH_DEBOUNCE_MS = 160;
const MIN_SEARCH_LENGTH = 1;

type TypeTab = 'all' | GearSetType;
type RoleFilter = 'all' | 'tank' | 'healer';

interface AllSetsBrowserProps {
  isDarkMode: boolean;
  /** Role colors from the parent (tank/healer/dps) for the role filter + badges. */
  roleColors: { tank: string; healer: string; dps: string };
  /** Set name → assignment labels (e.g. ["Tank 1 (Set 1)"]). Marks assigned sets. */
  assignments: Map<string, string[]>;
  /** Opens the shared assign popover for the clicked set. */
  onSetClick: (setName: string, event: React.MouseEvent<HTMLElement>) => void;
}

// ─── Set row ──────────────────────────────────────────────────────────────────

interface SetRowProps {
  set: AssignableSet;
  isDark: boolean;
  assignedTo: string[];
  roleColors: { tank: string; healer: string; dps: string };
  onSetClick: (setName: string, event: React.MouseEvent<HTMLElement>) => void;
}

const roleIcon = (role: SetRole, color: string): React.ReactElement => {
  if (role === 'tank') return <ShieldIcon sx={{ fontSize: 14, color }} />;
  if (role === 'healer') return <FavoriteIcon sx={{ fontSize: 14, color }} />;
  return <SwapHorizIcon sx={{ fontSize: 14, color }} />;
};

const SetRow: React.FC<SetRowProps> = ({ set, isDark, assignedTo, roleColors, onSetClick }) => {
  const catColor = SET_TYPE_COLORS[set.setType];
  const isAssigned = assignedTo.length > 0;
  const rColor =
    set.role === 'tank'
      ? roleColors.tank
      : set.role === 'healer'
        ? roleColors.healer
        : roleColors.dps;

  // Rich hover card (type badge + set bonuses), shared with the rest of the app.
  // Built once per set (memoized in the catalog module). Hover-only: on touch a
  // tap is the assign action (the popover), so the tooltip's touch trigger is
  // suppressed via a long enterTouchDelay rather than firing on every tap.
  const tooltipProps = useMemo(() => getSetTooltipProps(set), [set]);

  return (
    <Tooltip
      title={<GearSetTooltip {...tooltipProps} />}
      placement="top"
      enterDelay={300}
      enterNextDelay={150}
      enterTouchDelay={700}
      leaveTouchDelay={2500}
      slotProps={RICH_TOOLTIP_SLOT_PROPS}
    >
      <ButtonBase
        onClick={(e) => onSetClick(set.name, e)}
        aria-label={
          isAssigned ? `${set.name} — assigned to ${assignedTo.join(', ')}` : `Assign ${set.name}`
        }
        sx={{
          width: '100%',
          py: { xs: 1.1, sm: 0.75 },
          pl: 1,
          pr: 0.75,
          minHeight: { xs: 44, sm: 0 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 1.5,
          textAlign: 'left',
          background: isAssigned ? (isDark ? `${rColor}14` : `${rColor}0C`) : 'transparent',
          border: isAssigned ? `1px solid ${rColor}40` : '1px solid transparent',
          '&:hover': {
            background: isAssigned
              ? undefined
              : isDark
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(0,0,0,0.03)',
          },
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          <Box sx={{ flexShrink: 0, display: 'inline-flex' }}>{roleIcon(set.role, rColor)}</Box>
          <Typography
            noWrap
            sx={{
              fontSize: 12,
              fontWeight: isAssigned ? 700 : 600,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              color: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.78)',
            }}
          >
            {set.name}
          </Typography>
          <Chip
            label={set.setType}
            size="small"
            sx={{
              height: 14,
              fontSize: '0.5rem',
              fontWeight: 700,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              background: `${catColor}25`,
              color: catColor,
              border: 'none',
              flexShrink: 0,
              '& .MuiChip-label': { px: 0.6 },
            }}
          />
        </Stack>
        {isAssigned && <CheckCircleIcon sx={{ fontSize: 15, color: rColor, flexShrink: 0 }} />}
      </ButtonBase>
    </Tooltip>
  );
};

// ─── Browser ──────────────────────────────────────────────────────────────────

const AllSetsBrowserInner: React.FC<AllSetsBrowserProps> = ({
  isDarkMode,
  roleColors,
  assignments,
  onSetClick,
}) => {
  const isDark = isDarkMode;
  const [search, setSearch] = useState('');
  const [typeTab, setTypeTab] = useState<TypeTab>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const allSets = getAssignableSets();

  // Role-filtered universe (cheap; drives both tab counts and the list).
  const roleFiltered = useMemo(() => {
    if (roleFilter === 'all') return allSets;
    return allSets.filter((s) => s.role === roleFilter || s.role === 'both');
  }, [allSets, roleFilter]);

  // Counts per content type for the tab bar (respect the role filter).
  const { tabs, countByType } = useMemo(() => {
    const counts = new Map<GearSetType, number>();
    for (const s of roleFiltered) counts.set(s.setType, (counts.get(s.setType) ?? 0) + 1);
    const orderedTabs: TypeTab[] = ['all'];
    for (const t of SET_TYPE_ORDER) if (counts.has(t)) orderedTabs.push(t);
    return { tabs: orderedTabs, countByType: counts };
  }, [roleFiltered]);

  // Keep the active tab valid when the role filter removes its type.
  const activeTab: TypeTab = typeTab !== 'all' && !countByType.has(typeTab) ? 'all' : typeTab;

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedSearch.trim().length >= MIN_SEARCH_LENGTH;

  const visibleSets = useMemo(() => {
    let list = roleFiltered;
    if (activeTab !== 'all') list = list.filter((s) => s.setType === activeTab);
    if (isSearching) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [roleFiltered, activeTab, isSearching, debouncedSearch]);

  const roleButtons: { key: RoleFilter; label: string; color?: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'tank', label: 'Tank', color: roleColors.tank },
    { key: 'healer', label: 'Healer', color: roleColors.healer },
  ];

  return (
    <Box>
      {/* Search + role filter */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        sx={{ mb: 1.5, alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all sets by name…"
          size="small"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, opacity: 0.4 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              borderRadius: 2,
              fontSize: 13,
            },
          }}
        />
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {roleButtons.map((r) => {
            const isActive = roleFilter === r.key;
            const color = r.color;
            return (
              <ButtonBase
                key={r.key}
                onClick={() => setRoleFilter(r.key)}
                aria-pressed={isActive}
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 1.5,
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  letterSpacing: 0.3,
                  color: isActive
                    ? (color ?? (isDark ? '#fff' : '#0f172a'))
                    : isDark
                      ? 'rgba(255,255,255,0.45)'
                      : 'rgba(0,0,0,0.45)',
                  background: isActive
                    ? color
                      ? `${color}18`
                      : isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.06)'
                    : 'transparent',
                  border: `1px solid ${
                    isActive
                      ? color
                        ? `${color}35`
                        : isDark
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(0,0,0,0.10)'
                      : isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.06)'
                  }`,
                  transition: 'all 0.15s',
                }}
              >
                {r.label}
              </ButtonBase>
            );
          })}
        </Box>
      </Stack>

      {/* Content-type tabs — wrap on desktop, horizontal-scroll on mobile so
          they never eat several rows of vertical space on a phone. */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          mb: 1.5,
          flexWrap: { xs: 'nowrap', sm: 'wrap' },
          rowGap: 0.5,
          overflowX: { xs: 'auto', sm: 'visible' },
          pb: { xs: 0.5, sm: 0 },
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === 'all' ? 'All' : tab;
          const count =
            tab === 'all' ? roleFiltered.length : (countByType.get(tab as GearSetType) ?? 0);
          const color = tab === 'all' ? undefined : SET_TYPE_COLORS[tab as GearSetType];
          return (
            <ButtonBase
              key={tab}
              onClick={() => setTypeTab(tab)}
              aria-pressed={isActive}
              sx={{
                px: 1,
                py: 0.4,
                borderRadius: 1.5,
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                letterSpacing: 0.3,
                flexShrink: 0,
                color: isActive
                  ? (color ?? (isDark ? '#fff' : '#0f172a'))
                  : isDark
                    ? 'rgba(255,255,255,0.45)'
                    : 'rgba(0,0,0,0.45)',
                background: isActive
                  ? color
                    ? `${color}18`
                    : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.06)'
                  : 'transparent',
                border: `1px solid ${
                  isActive
                    ? color
                      ? `${color}35`
                      : isDark
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,0,0,0.10)'
                    : 'transparent'
                }`,
                transition: 'all 0.15s',
                '&:hover': {
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
              }}
            >
              {label}
              <Box
                component="span"
                sx={{
                  ml: 0.625,
                  fontSize: 9,
                  fontWeight: 700,
                  opacity: 0.6,
                }}
              >
                {count}
              </Box>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Set list */}
      <Box
        sx={{
          maxHeight: { xs: '55vh', sm: 460 },
          overflowY: 'auto',
          pr: 0.5,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {visibleSets.length === 0 ? (
          <Typography
            sx={{
              fontSize: 12,
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
              textAlign: 'center',
              py: 4,
            }}
          >
            {isSearching ? `No sets match “${search}”` : 'No sets in this category'}
          </Typography>
        ) : (
          <Stack spacing={0.25}>
            {visibleSets.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                isDark={isDark}
                assignedTo={assignments.get(set.name) ?? []}
                roleColors={roleColors}
                onSetClick={onSetClick}
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Footer count */}
      <Box
        sx={{
          mt: 1.5,
          pt: 1.25,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}`,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.68rem',
            color: 'text.secondary',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Showing {visibleSets.length} of {allSets.length} sets
        </Typography>
      </Box>
    </Box>
  );
};

export const AllSetsBrowser = React.memo(AllSetsBrowserInner);
AllSetsBrowser.displayName = 'AllSetsBrowser';
