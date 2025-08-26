import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  FirstPage,
  LastPage,
  FilterList,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  TextField,
  Card,
  CardContent,
  Stack,
  Toolbar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from '@tanstack/react-table';
import React, { useMemo, useState } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { usePlayerData } from '../../../hooks';
import { PlayerTalent } from '../../../types/playerDetails';

interface TalentsGridPanelProps {
  fight: FightFragment;
}

interface TalentRow {
  guid: number;
  name: string;
  type: number;
  abilityIcon: string;
  flags: number;
  playerCount: number;
  playerNames: string[];
}

export const TalentsGridPanel: React.FC<TalentsGridPanelProps> = ({ fight }) => {
  const { playerData } = usePlayerData();

  // TanStack Table states
  const [sorting, setSorting] = useState<SortingState>([{ id: 'playerCount', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  // Transform talent data for TanStack Table
  const talentRows = useMemo((): TalentRow[] => {
    if (!playerData?.playersById || !fight?.friendlyPlayers) return [];

    const talentMap = new Map<number, TalentRow>();

    // Get all friendly players in the fight
    fight.friendlyPlayers?.forEach((fightPlayer) => {
      if (!fightPlayer) return;

      const player = playerData.playersById[String(fightPlayer)];
      if (!player) return;

      const playerName = player.name || `Player ${fightPlayer}`;
      const combatantInfo = player.combatantInfo;
      const talents = combatantInfo?.talents || [];

      talents.forEach((talent: PlayerTalent) => {
        if (talentMap.has(talent.guid)) {
          const existingTalent = talentMap.get(talent.guid);
          if (existingTalent) {
            existingTalent.playerCount += 1;
            existingTalent.playerNames.push(playerName);
          }
        } else {
          talentMap.set(talent.guid, {
            guid: talent.guid,
            name: talent.name || 'Unknown Talent',
            type: talent.type || 0,
            abilityIcon: talent.abilityIcon || '',
            flags: talent.flags || 0,
            playerCount: 1,
            playerNames: [playerName],
          });
        }
      });
    });

    return Array.from(talentMap.values());
  }, [playerData, fight]);

  // Create column helper
  const columnHelper = createColumnHelper<TalentRow>();

  // Define columns for the table
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'icon',
        header: 'Icon',
        cell: (info) => (
          <Avatar
            src={info.row.original.abilityIcon}
            sx={{ width: 32, height: 32 }}
            variant="rounded"
          />
        ),
        size: 60,
      }),
      columnHelper.accessor('name', {
        header: 'Talent Name',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {info.getValue()}
          </Typography>
        ),
        size: 250,
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {info.getValue()}
          </Typography>
        ),
        size: 80,
      }),
      columnHelper.accessor('flags', {
        header: 'Flags',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {info.getValue()}
          </Typography>
        ),
        size: 80,
      }),
      columnHelper.accessor('playerCount', {
        header: 'Players',
        cell: (info) => (
          <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 600 }}>
            {info.getValue()}
          </Typography>
        ),
        size: 100,
      }),
      columnHelper.accessor('playerNames', {
        header: 'Player Names',
        cell: (info) => (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {info.getValue().map((playerName, index) => (
              <Chip
                key={`${info.row.original.guid}-${index}`}
                label={playerName}
                size="small"
                variant="outlined"
                color="default"
              />
            ))}
          </Stack>
        ),
        size: 300,
        filterFn: (row, columnId, value) => {
          const playerNames = row.getValue(columnId) as string[];
          return playerNames.some((name) => name.toLowerCase().includes(value.toLowerCase()));
        },
      }),
    ],
    [columnHelper]
  );

  const table = useReactTable({
    data: talentRows,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const CustomToolbar: React.FC = () => (
    <Toolbar
      sx={{
        p: 2,
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <FilterList />
      <TextField
        size="small"
        placeholder="Search talents or players..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        sx={{ minWidth: 300 }}
      />
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Page Size</InputLabel>
        <Select
          value={table.getState().pagination.pageSize}
          label="Page Size"
          onChange={(e) => table.setPageSize(Number(e.target.value))}
        >
          <MenuItem value={25}>25</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
        </Select>
      </FormControl>
    </Toolbar>
  );

  const CustomPagination: React.FC = () => (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}{' '}
        to{' '}
        {Math.min(
          (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
          table.getFilteredRowModel().rows.length
        )}{' '}
        of {table.getFilteredRowModel().rows.length} talents
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
          <FirstPage />
        </IconButton>
        <IconButton onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          <KeyboardArrowLeft />
        </IconButton>
        <Typography variant="body2" sx={{ mx: 2 }}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </Typography>
        <IconButton onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          <KeyboardArrowRight />
        </IconButton>
        <IconButton
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <LastPage />
        </IconButton>
      </Box>
    </Box>
  );

  if (talentRows.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No talent data available for this fight
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Talent information may not be available for this report or fight.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Player Talents Overview
      </Typography>

      <Stack spacing={3}>
        {/* Summary Stats */}
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {talentRows.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unique Talents
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary">
                  {fight.friendlyPlayers?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Players in Fight
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        {/* Talents Table with TanStack */}
        <Paper sx={{ height: 600, width: '100%', display: 'flex', flexDirection: 'column' }}>
          <CustomToolbar />
          <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableCell
                        key={header.id}
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          width: header.getSize(),
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder ? null : (
                          <div>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: ' 🔼',
                              desc: ' 🔽',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} sx={{ fontSize: '0.875rem' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <CustomPagination />
        </Paper>

        {talentRows.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No talents found matching your search criteria
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};
