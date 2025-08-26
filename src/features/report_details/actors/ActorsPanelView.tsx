import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  FirstPage,
  LastPage,
  FilterList,
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
}

export const ActorsPanelView: React.FC<ActorsPanelViewProps> = ({ actors }) => {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

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
    ],
    [columnHelper]
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
