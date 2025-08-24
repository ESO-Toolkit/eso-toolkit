import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  FirstPage,
  LastPage,
  FilterList,
} from '@mui/icons-material';
import {
  Box,
  Button,
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

import { LogEvent } from '../../../types/combatlogEvents';

interface EventsGridProps {
  events: LogEvent[];
  title?: string;
  height?: number;
}

// Transform events data for the table
type EventRowData = {
  id: number;
  timestamp: number;
  type: string;
  sourceID: number | null;
  targetID: number | null;
  abilityGameID: number | null;
  amount: number | null;
  fight: number | null;
  originalEvent: LogEvent;
};

export const EventsGrid: React.FC<EventsGridProps> = ({
  events,
  title = 'Events',
  height = 600,
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  // Transform events data for the table
  const data: EventRowData[] = React.useMemo(() => {
    return events.map((event, index) => ({
      id: index,
      timestamp: event.timestamp || 0,
      type: event.type || '',
      sourceID: 'sourceID' in event ? event.sourceID : null,
      targetID: 'targetID' in event ? event.targetID : null,
      abilityGameID: 'abilityGameID' in event ? event.abilityGameID : null,
      amount: 'amount' in event ? event.amount : null,
      fight: 'fight' in event ? event.fight : null,
      originalEvent: event,
    }));
  }, [events]);

  // Create column helper
  const columnHelper = createColumnHelper<EventRowData>();

  // Define columns for the table
  const columns = React.useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID',
        size: 80,
      }),
      columnHelper.accessor('timestamp', {
        header: 'Time',
        size: 120,
        cell: (info) => {
          const date = new Date(info.getValue());
          return date.toISOString().substr(11, 12); // HH:mm:ss.sss
        },
      }),
      columnHelper.accessor('type', {
        header: 'Event Type',
        size: 150,
      }),
      columnHelper.accessor('sourceID', {
        header: 'Source ID',
        size: 100,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('targetID', {
        header: 'Target ID',
        size: 100,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('abilityGameID', {
        header: 'Ability ID',
        size: 100,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('amount', {
        header: 'Amount',
        size: 100,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('fight', {
        header: 'Fight',
        size: 80,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.display({
        id: 'details',
        header: 'Event Details',
        size: 150,
        cell: (props) => {
          const handleCopyDetails = async (): Promise<void> => {
            try {
              const jsonString = JSON.stringify(props.row.original.originalEvent, null, 2);
              await navigator.clipboard.writeText(jsonString);
            } catch (error) {
              console.error('Failed to copy to clipboard:', error);
              // Fallback: create a temporary textarea element
              const textarea = document.createElement('textarea');
              textarea.value = JSON.stringify(props.row.original.originalEvent, null, 2);
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
          };

          return (
            <Button
              variant="outlined"
              size="small"
              onClick={handleCopyDetails}
              sx={{ fontSize: '0.75rem' }}
            >
              Copy JSON
            </Button>
          );
        },
      }),
    ],
    [columnHelper]
  );

  const table = useReactTable({
    data,
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
    <Toolbar sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
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
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title} ({events.length.toLocaleString()} total)
      </Typography>
      <Paper sx={{ height: height, width: '100%', display: 'flex', flexDirection: 'column' }}>
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
