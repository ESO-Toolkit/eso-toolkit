import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  FirstPage,
  LastPage,
  FilterList,
  ContentCopy,
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
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
import React from 'react';

import { ReportActorFragment } from '../../../graphql/generated';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { CombatantInfoEvent } from '../../../types/combatlogEvents';

interface Actor {
  id: string | number;
  name: string;
  displayName: string | null;
  type: string;
  subType: string | null;
  server: string;
  gameID: number;
}

interface ActorsPanelViewProps {
  actors: Actor[];
  playersById: Record<string | number, PlayerDetailsWithRole> | undefined;
  actorsById: Record<string | number, ReportActorFragment> | undefined;
  combatantInfoEvents: CombatantInfoEvent[];
}

export const ActorsPanelView: React.FC<ActorsPanelViewProps> = ({
  actors,
  playersById,
  actorsById,
  combatantInfoEvents,
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  // Function to copy playersById entry to clipboard
  const copyPlayerData = React.useCallback(
    async (actorId: string | number) => {
      if (!playersById) {
        console.log('No players data available');
        return;
      }

      const playerData = playersById[actorId];
      if (playerData) {
        try {
          await navigator.clipboard.writeText(JSON.stringify(playerData, null, 2));
          // Could add a toast notification here if available
          console.log('Player data copied to clipboard');
        } catch (err) {
          console.error('Failed to copy player data:', err);
          // Fallback: create a temporary textarea element
          const textArea = document.createElement('textarea');
          textArea.value = JSON.stringify(playerData, null, 2);
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      }
    },
    [playersById]
  );

  // Function to copy actorsById entry to clipboard
  const copyActorData = React.useCallback(
    async (actorId: string | number) => {
      if (!actorsById) {
        return;
      }

      const actorData = actorsById[actorId];
      if (actorData) {
        try {
          await navigator.clipboard.writeText(JSON.stringify(actorData, null, 2));
          // Could add a toast notification here if available
          console.log('Actor data copied to clipboard');
        } catch (err) {
          console.error('Failed to copy actor data:', err);
          // Fallback: create a temporary textarea element
          const textArea = document.createElement('textarea');
          textArea.value = JSON.stringify(actorData, null, 2);
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      }
    },
    [actorsById]
  );

  // Function to copy combatant info events for a specific player
  const copyCombatantInfoEvents = React.useCallback(
    async (actorId: string | number) => {
      // Filter combatant info events for this specific actor
      const playerCombatantInfoEvents = combatantInfoEvents.filter(
        (event) => String(event.sourceID) === String(actorId)
      );

      if (playerCombatantInfoEvents.length === 0) {
        console.log('No combatant info events found for this player');
        return;
      }

      try {
        await navigator.clipboard.writeText(JSON.stringify(playerCombatantInfoEvents, null, 2));
        console.log(
          `${playerCombatantInfoEvents.length} combatant info event(s) copied to clipboard`
        );
      } catch (err) {
        console.error('Failed to copy combatant info events:', err);
        // Fallback: create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = JSON.stringify(playerCombatantInfoEvents, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    },
    [combatantInfoEvents]
  );

  // Create column helper
  const columnHelper = createColumnHelper<Actor>();

  // Define columns for the table
  const columns = React.useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID',
        size: 100,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        size: 200,
      }),
      columnHelper.accessor('displayName', {
        header: 'Display Name',
        size: 200,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        size: 100,
      }),
      columnHelper.accessor('subType', {
        header: 'Sub Type',
        size: 120,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('server', {
        header: 'Server',
        size: 150,
      }),
      columnHelper.accessor('gameID', {
        header: 'Game ID',
        size: 100,
      }),
      // Copy PlayersById Entry column
      columnHelper.display({
        id: 'copyPlayerData',
        header: 'Copy Player Data',
        size: 150,
        cell: (info) => {
          const actorId = info.row.original.id;

          if (!playersById) {
            return (
              <Typography variant="body2" color="text.secondary">
                No data
              </Typography>
            );
          }

          const playerData = playersById[actorId];

          if (!playerData) {
            return (
              <Typography variant="body2" color="text.secondary">
                No data
              </Typography>
            );
          }

          return (
            <Tooltip title="Copy playersById entry to clipboard">
              <IconButton size="small" onClick={() => copyPlayerData(actorId)} color="primary">
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        },
      }),
      // Copy ActorsById Entry column
      columnHelper.display({
        id: 'copyActorData',
        header: 'Copy Actor Data',
        size: 150,
        cell: (info) => {
          const actorId = info.row.original.id;
          const actorData = actorsById && actorsById[actorId];

          if (!actorData) {
            return (
              <Typography variant="body2" color="text.secondary">
                No data
              </Typography>
            );
          }

          return (
            <Tooltip title="Copy actorsById entry to clipboard">
              <IconButton size="small" onClick={() => copyActorData(actorId)} color="secondary">
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        },
      }),
      // Copy Combatant Info Events column
      columnHelper.display({
        id: 'copyCombatantInfo',
        header: 'Copy Combatant Info',
        size: 160,
        cell: (info) => {
          const actorId = info.row.original.id;
          const playerCombatantInfoEvents = combatantInfoEvents.filter(
            (event) => String(event.sourceID) === String(actorId)
          );

          if (playerCombatantInfoEvents.length === 0) {
            return (
              <Typography variant="body2" color="text.secondary">
                No events
              </Typography>
            );
          }

          return (
            <Tooltip
              title={`Copy ${playerCombatantInfoEvents.length} combatant info event(s) to clipboard`}
            >
              <IconButton
                size="small"
                onClick={() => copyCombatantInfoEvents(actorId)}
                color="info"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        },
      }),
    ],
    [
      columnHelper,
      playersById,
      copyPlayerData,
      actorsById,
      copyActorData,
      combatantInfoEvents,
      copyCombatantInfoEvents,
    ]
  );

  const table = useReactTable({
    data: actors,
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
        placeholder="Search all columns..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        sx={{ minWidth: 200 }}
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
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
      <Typography variant="body2">
        Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}{' '}
        to{' '}
        {Math.min(
          (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
          table.getFilteredRowModel().rows.length
        )}{' '}
        of {table.getFilteredRowModel().rows.length} entries
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

  return (
    <Box mt={2}>
      <Typography variant="h6" gutterBottom>
        All Actors in Report ({actors.length} total)
      </Typography>
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
    </Box>
  );
};
