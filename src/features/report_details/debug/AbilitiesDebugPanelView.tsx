import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  TablePagination,
} from '@mui/material';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  ColumnFiltersState,
  PaginationState,
} from '@tanstack/react-table';
import React from 'react';

import { AbilityIcon } from '../../../components/AbilityIcon';

interface AbilityData {
  gameID: string | number;
  name: string;
  icon: string;
  type: string;
  damageTypes: string[];
}

interface AbilitiesDebugPanelViewProps {
  abilities: AbilityData[];
  totalCount: number;
  isLoading: boolean;
}

export const AbilitiesDebugPanelView: React.FC<AbilitiesDebugPanelViewProps> = ({
  abilities,
  totalCount,
  isLoading,
}) => {
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  // Create column helper
  const columnHelper = createColumnHelper<AbilityData>();

  // Define columns
  const columns = React.useMemo(
    () => [
      columnHelper.display({
        id: 'icon',
        header: 'Icon',
        cell: (info) => <AbilityIcon abilityId={info.row.original.gameID} />,
        size: 150,
      }),
      columnHelper.accessor('gameID', {
        header: 'Game ID',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {info.getValue()}
          </Typography>
        ),
        size: 100,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {info.getValue()}
          </Typography>
        ),
        size: 200,
      }),
      columnHelper.accessor('damageTypes', {
        header: 'Damage Types',
        cell: (info) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {info.getValue().map((damageType) => (
              <Chip
                key={damageType}
                label={damageType}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.75rem',
                  height: 20,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            ))}
          </Box>
        ),
        size: 200,
        filterFn: (row, columnId, value) => {
          const damageTypes = row.getValue(columnId) as string[];
          return damageTypes.some((type) => type.toLowerCase().includes(value.toLowerCase()));
        },
        sortingFn: (a, b) => {
          const aTypes = (a.getValue('damageTypes') as string[]).join(', ');
          const bTypes = (b.getValue('damageTypes') as string[]).join(', ');
          return aTypes.localeCompare(bTypes);
        },
      }),
    ],
    [columnHelper]
  );

  // Create table instance
  const table = useReactTable({
    data: abilities,
    columns,
    state: {
      globalFilter,
      columnFilters,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading abilities data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Abilities Debug Panel
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Displaying {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length}{' '}
          filtered abilities ({totalCount} total) from masterData.abilitiesById
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Search by name, ID, type, or damage type..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          sx={{ mt: 2, maxWidth: 400 }}
        />
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <React.Fragment key={headerGroup.id}>
                <TableRow>
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={{
                        fontWeight: 'bold',
                        cursor: header.column.getCanSort() ? 'pointer' : 'default',
                        userSelect: 'none',
                        '&:hover': header.column.getCanSort()
                          ? { backgroundColor: 'action.hover' }
                          : {},
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  {headerGroup.headers.map((header) => (
                    <TableCell key={header.id}>
                      {header.column.getCanFilter() ? (
                        <TextField
                          size="small"
                          placeholder={`Filter ${header.column.columnDef.header}...`}
                          value={(header.column.getFilterValue() ?? '') as string}
                          onChange={(e) => header.column.setFilterValue(e.target.value)}
                          variant="outlined"
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.75rem',
                              height: '32px',
                            },
                          }}
                        />
                      ) : null}
                    </TableCell>
                  ))}
                </TableRow>
              </React.Fragment>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                sx={{
                  '&:hover': { backgroundColor: 'action.hover' },
                  '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    {globalFilter
                      ? 'No abilities match your search criteria'
                      : 'No abilities data available'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={table.getFilteredRowModel().rows.length}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => table.setPageIndex(page)}
        rowsPerPage={table.getState().pagination.pageSize}
        onRowsPerPageChange={(e) => table.setPageSize(Number(e.target.value))}
        rowsPerPageOptions={[10, 25, 50, 100]}
        showFirstButton
        showLastButton
      />
    </Box>
  );
};
