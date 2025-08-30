import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  FirstPage,
  LastPage,
  ArrowUpward,
  ArrowDownward,
  FilterAlt,
  Clear,
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
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Toolbar,
  Tooltip,
  InputAdornment,
  useTheme,
  alpha,
} from '@mui/material';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
  type ColumnDef,
  type Table as TanStackTable,
  type FilterFn,
  type ColumnFiltersState,
  type SortingState,
  type PaginationState,
  type Column,
} from '@tanstack/react-table';
import React from 'react';

// Custom filter function that handles both text and numeric columns
const smartFilter: FilterFn<unknown> = (row, columnId, value) => {
  const rowValue = row.getValue(columnId);
  const filterValue = value as string;

  if (!filterValue) return true;

  // Handle numeric values
  if (typeof rowValue === 'number') {
    const numericFilter = parseFloat(filterValue);
    if (!isNaN(numericFilter)) {
      // Exact numeric match or string contains match
      return rowValue === numericFilter || rowValue.toString().includes(filterValue);
    } else {
      // If filter is not a valid number, do string contains
      return rowValue.toString().toLowerCase().includes(filterValue.toLowerCase());
    }
  }

  // Handle string values
  if (typeof rowValue === 'string') {
    return rowValue.toLowerCase().includes(filterValue.toLowerCase());
  }

  // Handle other types by converting to string
  return String(rowValue).toLowerCase().includes(filterValue.toLowerCase());
};

// Generic DataGrid props
export interface DataGridProps<T = unknown> {
  data: T[];
  columns: ColumnDef<T>[];
  title?: string;
  height?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

// Column filter component
const ColumnFilter = <T,>({ column }: { column: Column<T, unknown> }): JSX.Element => {
  const theme = useTheme();
  const columnFilterValue = column.getFilterValue();
  const { columnDef } = column;

  // Check if this is a numeric column based on the first data value
  const firstValue = column.getFacetedRowModel().rows[0]?.getValue(column.id);
  const isNumeric = typeof firstValue === 'number';

  const hasValue = columnFilterValue !== undefined && columnFilterValue !== '';

  return (
    <Box sx={{ mt: 1 }} onClick={(e) => e.stopPropagation()}>
      <TextField
        size="small"
        type={isNumeric ? 'number' : 'text'}
        placeholder={`Filter ${columnDef.header?.toString() || column.id}...`}
        value={(columnFilterValue as string | number | undefined) ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          if (isNumeric) {
            // For numeric columns, set the raw string value and let TanStack handle the filtering
            // This allows for partial number inputs like "1" to match "10", "100", etc.
            column.setFilterValue(value || undefined);
          } else {
            column.setFilterValue(value || undefined);
          }
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  column.setFilterValue(undefined);
                }}
                sx={{
                  padding: '2px',
                  visibility: hasValue ? 'visible' : 'hidden', // Always takes up space but invisible when no value
                  '&:hover': {
                    backgroundColor: hasValue
                      ? alpha(theme.palette.primary.main, 0.08)
                      : 'transparent',
                  },
                }}
                aria-label="Clear filter"
                disabled={!hasValue}
              >
                <Clear sx={{ fontSize: '14px' }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          width: '100%',
          '& .MuiInputBase-root': {
            backgroundColor: alpha(theme.palette.background.paper, 0.6),
            transition: theme.transitions.create(['background-color', 'border-color'], {
              duration: theme.transitions.duration.short,
            }),
            '&:hover': {
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
            },
            '&.Mui-focused': {
              backgroundColor: alpha(theme.palette.background.paper, 0.9),
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
              },
            },
          },
          '& .MuiInputBase-input': {
            fontSize: '0.75rem',
            padding: '4px 8px',
            color: theme.palette.text.primary,
            '&::placeholder': {
              color: theme.palette.text.secondary,
              opacity: 0.7,
            },
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.divider, 0.3),
          },
          // Hide number input spinners/arrows
          '& input[type=number]': {
            MozAppearance: 'textfield', // Firefox
            '&::-webkit-outer-spin-button': {
              WebkitAppearance: 'none', // Chrome, Safari, Edge
              margin: 0,
            },
            '&::-webkit-inner-spin-button': {
              WebkitAppearance: 'none', // Chrome, Safari, Edge
              margin: 0,
            },
          },
        }}
        variant="outlined"
      />
    </Box>
  );
};

// Pagination component
const DataGridPagination = <T,>({ table }: { table: TanStackTable<T> }): JSX.Element => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        background: alpha(theme.palette.background.paper, 0.3),
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          fontVariantNumeric: 'tabular-nums',
          opacity: 0.8,
        }}
      >
        Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}{' '}
        to{' '}
        {Math.min(
          (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
          table.getFilteredRowModel().rows.length
        )}{' '}
        of {table.getFilteredRowModel().rows.length} entries
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="First page" disableHoverListener={!table.getCanPreviousPage()}>
          <span>
            <IconButton
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              size="small"
              sx={{
                transition: theme.transitions.create(['all'], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover:not(:disabled)': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  opacity: 0.3,
                },
              }}
            >
              <FirstPage />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Previous page" disableHoverListener={!table.getCanPreviousPage()}>
          <span>
            <IconButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              size="small"
              sx={{
                transition: theme.transitions.create(['all'], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover:not(:disabled)': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  opacity: 0.3,
                },
              }}
            >
              <KeyboardArrowLeft />
            </IconButton>
          </span>
        </Tooltip>
        <Typography
          variant="body2"
          sx={{
            mx: 2,
            minWidth: 100,
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
            color: theme.palette.text.primary,
          }}
        >
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </Typography>
        <Tooltip title="Next page" disableHoverListener={!table.getCanNextPage()}>
          <span>
            <IconButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              size="small"
              sx={{
                transition: theme.transitions.create(['all'], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover:not(:disabled)': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  opacity: 0.3,
                },
              }}
            >
              <KeyboardArrowRight />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Last page" disableHoverListener={!table.getCanNextPage()}>
          <span>
            <IconButton
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              size="small"
              sx={{
                transition: theme.transitions.create(['all'], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover:not(:disabled)': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  opacity: 0.3,
                },
              }}
            >
              <LastPage />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

// Toolbar component
const DataGridToolbar = <T,>({
  table,
  title,
  totalRows,
  enableFiltering,
  pageSizeOptions,
}: {
  table: TanStackTable<T>;
  title?: string;
  totalRows: number;
  enableFiltering?: boolean;
  pageSizeOptions: number[];
}): JSX.Element => {
  const theme = useTheme();

  return (
    <Toolbar
      sx={{
        p: 2,
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        minHeight: 'auto !important',
        background: alpha(theme.palette.background.paper, 0.3),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
        {title && (
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontFamily: theme.typography.h6.fontFamily,
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {title}
          </Typography>
        )}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            opacity: 0.8,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ({totalRows.toLocaleString()} total,{' '}
          {table.getFilteredRowModel().rows.length.toLocaleString()} filtered)
        </Typography>
      </Box>

      {enableFiltering && (
        <Tooltip
          title="Clear all filters"
          disableHoverListener={!table.getState().columnFilters.length}
        >
          <span>
            <Button
              startIcon={<Clear />}
              onClick={() => table.resetColumnFilters()}
              disabled={!table.getState().columnFilters.length}
              size="small"
              variant="outlined"
              sx={{
                transition: theme.transitions.create(['all'], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
                },
                '&:disabled': {
                  opacity: 0.5,
                },
              }}
            >
              Clear Filters
            </Button>
          </span>
        </Tooltip>
      )}

      <FormControl
        size="small"
        sx={{
          minWidth: 120,
          '& .MuiOutlinedInput-root': {
            backgroundColor: alpha(theme.palette.background.paper, 0.6),
            transition: theme.transitions.create(['background-color'], {
              duration: theme.transitions.duration.short,
            }),
            '&:hover': {
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
            },
            '&.Mui-focused': {
              backgroundColor: alpha(theme.palette.background.paper, 0.9),
            },
          },
        }}
      >
        <InputLabel>Rows</InputLabel>
        <Select
          value={table.getState().pagination.pageSize}
          label="Rows"
          onChange={(e) => table.setPageSize(Number(e.target.value))}
        >
          {pageSizeOptions.map((size) => (
            <MenuItem key={size} value={size}>
              {size}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Toolbar>
  );
};

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
Object.freeze(DEFAULT_PAGE_SIZE_OPTIONS);

// Main DataGrid component
export const DataGrid = <T extends Record<string, unknown>>({
  data,
  columns,
  title,
  height = 600,
  initialPageSize = 25,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  loading = false,
  emptyMessage = 'No data available',
}: DataGridProps<T>): JSX.Element => {
  const theme = useTheme();

  // Memoize theme-based styles to prevent recreation on every render
  const styles = React.useMemo(
    () => ({
      tableRow: {
        transition: theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.shortest,
        }),
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
        },
        '&:nth-of-type(even)': {
          backgroundColor: alpha(theme.palette.action.selected, 0.02),
        },
        '&:not(:last-child)': {
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        },
      },
      tableCell: {
        fontSize: '0.875rem',
        color: theme.palette.text.primary,
        padding: theme.spacing(1, 2),
      },
    }),
    [theme]
  );

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  // Memoize column configuration to prevent recreation on every render
  const memoizedColumns = React.useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        filterFn: (col as ColumnDef<T>).filterFn || smartFilter,
      })) as ColumnDef<T>[],
    [columns]
  );

  // Memoize table configuration
  const tableConfig = React.useMemo(
    () => ({
      data,
      columns: memoizedColumns,
      state: {
        sorting,
        columnFilters,
        pagination,
      },
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onPaginationChange: setPagination,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      enableSorting,
      enableColumnFilters: enableFiltering,
      filterFns: {
        smartFilter,
      },
    }),
    [data, memoizedColumns, sorting, columnFilters, pagination, enableSorting, enableFiltering]
  );

  // Create table instance
  const table = useReactTable(tableConfig);

  // Loading state
  if (loading) {
    return (
      <Paper
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
              : theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            opacity: 0.7,
            fontStyle: 'italic',
          }}
        >
          Loading...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        height,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // Use theme's Paper styling
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
            : theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow:
          theme.palette.mode === 'dark' ? '0 8px 30px rgba(0, 0, 0, 0.25)' : theme.shadows[4],
      }}
    >
      <DataGridToolbar
        table={table}
        title={title}
        totalRows={data.length}
        enableFiltering={enableFiltering}
        pageSizeOptions={pageSizeOptions}
      />

      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = enableSorting && header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();

                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        fontWeight: 600,
                        cursor: canSort ? 'pointer' : 'default',
                        userSelect: 'none',
                        minWidth: header.getSize(),
                        backgroundColor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(8px)',
                        borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        color: theme.palette.text.primary,
                        fontSize: '0.875rem',
                        transition: theme.transitions.create(['background-color'], {
                          duration: theme.transitions.duration.short,
                        }),
                        '&:hover': canSort
                          ? {
                              backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            }
                          : {},
                        '&:first-of-type': {
                          borderTopLeftRadius: 0, // Since Paper handles outer radius
                        },
                        '&:last-of-type': {
                          borderTopRightRadius: 0, // Since Paper handles outer radius
                        },
                      }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Header content with sort indicator */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: enableFiltering ? 1 : 0,
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {enableSorting && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                opacity: sortDirection ? 1 : 0.3,
                                color: sortDirection
                                  ? theme.palette.primary.main
                                  : theme.palette.text.secondary,
                                transition: theme.transitions.create(['opacity', 'color'], {
                                  duration: theme.transitions.duration.short,
                                }),
                              }}
                            >
                              {sortDirection === 'asc' && <ArrowUpward fontSize="small" />}
                              {sortDirection === 'desc' && <ArrowDownward fontSize="small" />}
                              {!sortDirection && canSort && (
                                <FilterAlt fontSize="small" sx={{ opacity: 0.1 }} />
                              )}
                            </Box>
                          )}
                        </Box>

                        {/* Column filter */}
                        {enableFiltering && header.column.getCanFilter() && (
                          <ColumnFilter column={header.column} />
                        )}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHead>

          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow key={row.id} sx={styles.tableRow}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} sx={styles.tableCell}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    backgroundColor: alpha(theme.palette.background.paper, 0.3),
                  }}
                >
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      opacity: 0.7,
                      fontStyle: 'italic',
                    }}
                  >
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {enablePagination && <DataGridPagination table={table} />}
    </Paper>
  );
};
