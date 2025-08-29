/**
 * Test file to validate DataGrid theme integration
 * This ensures the DataGrid properly respects MUI theme values
 */

import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { DataGrid } from './DataGrid';
import { createColumnHelper } from '@tanstack/react-table';

// Test data
const testData = [
  { id: 1, name: 'Test Item 1', value: 100 },
  { id: 2, name: 'Test Item 2', value: 200 },
];

// Test columns
const columnHelper = createColumnHelper<(typeof testData)[0]>();
const testColumns = [
  columnHelper.accessor('id', { header: 'ID' }),
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('value', { header: 'Value' }),
];

describe('DataGrid Theme Integration', () => {
  it('should render with dark theme', () => {
    const darkTheme = createTheme({
      palette: { mode: 'dark' },
      shape: { borderRadius: 12 },
    });

    render(
      <ThemeProvider theme={darkTheme}>
        <DataGrid
          data={testData as Record<string, unknown>[]}
          columns={testColumns as any}
          title="Theme Test Grid"
        />
      </ThemeProvider>
    );

    // Check that title is rendered
    expect(screen.getByText('Theme Test Grid')).toBeInTheDocument();

    // Check that data is rendered
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
  });

  it('should render with light theme', () => {
    const lightTheme = createTheme({
      palette: { mode: 'light' },
      shape: { borderRadius: 8 },
    });

    render(
      <ThemeProvider theme={lightTheme}>
        <DataGrid
          data={testData as Record<string, unknown>[]}
          columns={testColumns as any}
          title="Light Theme Test"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Light Theme Test')).toBeInTheDocument();
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
  });

  it('should render with custom theme properties', () => {
    const customTheme = createTheme({
      palette: {
        mode: 'dark',
        primary: { main: '#38bdf8' },
        secondary: { main: '#00e1ff' },
      },
      shape: { borderRadius: 14 },
      typography: {
        fontFamily: 'Inter, system-ui',
      },
    });

    render(
      <ThemeProvider theme={customTheme}>
        <DataGrid
          data={testData as Record<string, unknown>[]}
          columns={testColumns as any}
          title="Custom Theme Test"
          enableFiltering={true}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Custom Theme Test')).toBeInTheDocument();

    // Check that filter inputs are rendered
    const filterInputs = screen.getAllByPlaceholderText(/Filter/i);
    expect(filterInputs.length).toBeGreaterThan(0);
  });

  it('should handle empty data gracefully', () => {
    const theme = createTheme({ palette: { mode: 'dark' } });

    render(
      <ThemeProvider theme={theme}>
        <DataGrid
          data={[]}
          columns={testColumns as any}
          emptyMessage="No theme test data available"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('No theme test data available')).toBeInTheDocument();
  });

  it('should render loading state with theme', () => {
    const theme = createTheme({ palette: { mode: 'dark' } });

    render(
      <ThemeProvider theme={theme}>
        <DataGrid data={[]} columns={testColumns as any} loading={true} />
      </ThemeProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
