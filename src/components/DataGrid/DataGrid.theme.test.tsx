import '@testing-library/jest-dom';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';

import { DataGrid } from './DataGrid';

// Essential test data - minimal but representative
const testColumns = [
  { accessorKey: 'id', header: 'ID', size: 80 },
  { accessorKey: 'name', header: 'Name', size: 120 },
];

const testData = [
  { id: 1, name: 'Test Item 1' },
  { id: 2, name: 'Test Item 2' },
];

// Optimized theme with all required properties for the DataGrid
const testTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#1976d2' },
    action: { selected: '#333', hover: '#444' },
    background: { paper: '#1e1e1e' },
    divider: '#333333',
  },
  transitions: {
    create: () => 'all 0.15s ease-in-out',
    duration: { shortest: 150 },
  },
  spacing: (factor: number) => `${8 * factor}px`,
});

describe('DataGrid Theme Integration', () => {
  it('renders with theme provider', () => {
    render(
      <ThemeProvider theme={testTheme}>
        <DataGrid
          data={testData}
          columns={testColumns}
          height={100}
          enableFiltering={false}
          enableSorting={false}
          enablePagination={false}
        />
      </ThemeProvider>
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('applies theme styles correctly', () => {
    render(
      <ThemeProvider theme={testTheme}>
        <DataGrid
          data={testData}
          columns={testColumns}
          height={100}
          enableFiltering={false}
          enableSorting={false}
          enablePagination={false}
        />
      </ThemeProvider>
    );
    const table = screen.getByRole('table');
    expect(table).toHaveClass('MuiTable-root');
  });

  it('maintains theme consistency across renders', () => {
    const { rerender } = render(
      <ThemeProvider theme={testTheme}>
        <DataGrid
          data={testData}
          columns={testColumns}
          height={100}
          enableFiltering={false}
          enableSorting={false}
          enablePagination={false}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('table')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={testTheme}>
        <DataGrid
          data={testData}
          columns={testColumns}
          height={100}
          enableFiltering={false}
          enableSorting={false}
          enablePagination={false}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
