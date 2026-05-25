import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Chip,
  Collapse,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import React, { useMemo, useState } from 'react';

import * as arenaSets from '../data/Gear Sets/arena';
import * as heavySets from '../data/Gear Sets/heavy';
import { arenaSpecialGearSets, monsterGearSets } from '../data/Gear Sets/legacyAdapters';
import * as lightSets from '../data/Gear Sets/light';
import * as mediumSets from '../data/Gear Sets/medium';
import * as mythicSets from '../data/Gear Sets/mythics';
import * as sharedSets from '../data/Gear Sets/shared';
import type { GearSetData } from '../types/gearSet';
import { getEsoHubSetUrl } from '../utils/esoHubLinks';

const ICON_BASE_URL = 'https://assets.rpglogs.com/img/eso/abilities/';

const getIconUrl = (icon: string): string => `${ICON_BASE_URL}${encodeURIComponent(icon)}.png`;

const ALL_GEAR_SETS: GearSetData[] = (() => {
  const registry = new Map<string, GearSetData>();
  const addSets = (sets: Record<string, unknown>): void => {
    Object.values(sets).forEach((set) => {
      if (set && typeof set === 'object' && 'name' in set) {
        const s = set as GearSetData;
        if (!registry.has(s.name)) {
          registry.set(s.name, s);
        }
      }
    });
  };
  addSets(lightSets as Record<string, unknown>);
  addSets(heavySets as Record<string, unknown>);
  addSets(mediumSets as Record<string, unknown>);
  addSets(monsterGearSets as Record<string, unknown>);
  addSets(mythicSets as Record<string, unknown>);
  addSets(arenaSpecialGearSets as Record<string, unknown>);
  addSets(arenaSets as Record<string, unknown>);
  addSets(sharedSets as Record<string, unknown>);
  return Array.from(registry.values()).sort((a, b) => a.name.localeCompare(b.name));
})();

type SortField = 'name' | 'setType';
type SortDir = 'asc' | 'desc';

const SET_TYPE_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
> = {
  Craftable: 'default',
  'Class Sets': 'secondary',
  Dungeon: 'primary',
  Arena: 'success',
  Trial: 'warning',
  Overland: 'info',
  PvP: 'error',
  'Monster Set': 'default',
  Mythic: 'warning',
};

const getSetTypeColor = (
  setType: string,
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' =>
  SET_TYPE_COLORS[setType] ?? 'default';

interface GearSetRowProps {
  set: GearSetData;
}

const GearSetRow: React.FC<GearSetRowProps> = ({ set }) => {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer', '& > *': { borderBottom: open ? 'none' : undefined } }}
        onClick={() => setOpen((o) => !o)}
      >
        <TableCell sx={{ width: 56, py: 1 }}>
          {!imgError ? (
            <img
              src={getIconUrl(set.icon)}
              alt={set.name}
              onError={() => setImgError(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 4,
                objectFit: 'contain',
              }}
            />
          ) : (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                background: (theme: Theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                ?
              </Typography>
            </Box>
          )}
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {set.name}
            </Typography>
            <Box
              component="a"
              href={getEsoHubSetUrl(set.name)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              aria-label={`${set.name} on ESO-Hub`}
              title="View on ESO-Hub"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                color: 'rgba(148,163,184,0.35)',
                lineHeight: 0,
                '&:hover': { color: 'rgba(148,163,184,0.85)' },
              }}
            >
              <OpenInNewIcon sx={{ fontSize: 12 }} />
            </Box>
          </Box>
        </TableCell>
        <TableCell sx={{ width: 160 }}>
          <Chip
            label={set.setType}
            size="small"
            color={getSetTypeColor(set.setType)}
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        </TableCell>
        <TableCell sx={{ width: 40, textAlign: 'right', pr: 1 }}>
          <Tooltip title={open ? 'Hide bonuses' : 'Show bonuses'}>
            <IconButton size="small" aria-label={open ? 'Collapse' : 'Expand'}>
              {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ py: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 1.5, pl: 7, pr: 2 }}>
              <Stack spacing={0.75}>
                {set.bonuses.map((bonus, i) => (
                  <Typography
                    key={i}
                    variant="caption"
                    component="p"
                    sx={(theme: Theme) => ({
                      color: theme.palette.mode === 'dark' ? '#94a3b8' : '#475569',
                      '&:not(:last-child)': {
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        pb: 0.75,
                      },
                    })}
                  >
                    {bonus}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export const GearSetsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const allTypes = useMemo(() => [...new Set(ALL_GEAR_SETS.map((s) => s.setType))].sort(), []);

  const filtered = useMemo(() => {
    let result = ALL_GEAR_SETS;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.bonuses.some((b) => b.toLowerCase().includes(q)),
      );
    }

    if (typeFilter) {
      result = result.filter((s) => s.setType === typeFilter);
    }

    return [...result].sort((a, b) => {
      const av: string = sortBy === 'name' ? a.name : a.setType;
      const bv: string = sortBy === 'name' ? b.name : b.setType;
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [search, sortBy, sortDir, typeFilter]);

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filtered, page, rowsPerPage],
  );

  const handleSort = (field: SortField): void => {
    if (sortBy === field) {
      setSortDir((d: SortDir) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearch(e.target.value);
    setPage(0);
  };

  const handleTypeFilter = (type: string): void => {
    setTypeFilter((prev: string | null) => (prev === type ? null : type));
    setPage(0);
  };

  const handlePageChange = (_: unknown, newPage: number): void => setPage(newPage);

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Gear Sets
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {ALL_GEAR_SETS.length} sets supported — search by name or bonus text, filter by type.
        </Typography>
      </Stack>

      {/* Search + Filters */}
      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        <TextField
          placeholder="Search by name or bonus…"
          value={search}
          onChange={handleSearchChange}
          size="small"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {allTypes.map((type) => (
            <Chip
              key={type}
              label={type}
              size="small"
              clickable
              color={typeFilter === type ? getSetTypeColor(type) : 'default'}
              variant={typeFilter === type ? 'filled' : 'outlined'}
              onClick={() => handleTypeFilter(type)}
              sx={{ fontSize: '0.7rem' }}
            />
          ))}
        </Box>
      </Stack>

      {/* Results summary */}
      {(search || typeFilter) && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          {filtered.length === 0
            ? 'No sets match your filters.'
            : `Showing ${filtered.length} set${filtered.length !== 1 ? 's' : ''}`}
        </Typography>
      )}

      {/* Table */}
      <Paper
        variant="outlined"
        sx={(theme: Theme) => ({
          overflow: 'hidden',
          background:
            theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border:
            theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(0, 0, 0, 0.12)',
        })}
      >
        <TableContainer>
          <Table size="small" stickyHeader aria-label="Gear sets table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 56 }} />
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? sortDir : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: 160 }}>
                  <TableSortLabel
                    active={sortBy === 'setType'}
                    direction={sortBy === 'setType' ? sortDir : 'asc'}
                    onClick={() => handleSort('setType')}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length > 0 ? (
                paginated.map((set) => <GearSetRow key={set.name} set={set} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No sets found. Try adjusting your search or filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Per page:"
        />
      </Paper>
    </Container>
  );
};
