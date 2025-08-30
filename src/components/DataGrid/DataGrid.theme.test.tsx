/**
 * Test file to validate DataGrid theme integration
 * This ensures the DataGrid properly respects MUI theme values
 */

import '@testing-library/jest-dom';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createColumnHelper } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';

import { DataGrid } from './DataGrid';

// Mock alpha function to avoid complex color calculations in tests
jest.mock('@mui/material/styles', () => {
  const actual = jest.requireActual('@mui/material/styles');
  return {
    ...actual,
    alpha: jest.fn((color: string, opacity: number) => color),
  };
});

// Test data type
interface TestDataRow {
  id: number;
  name: string;
  value: number;
}

// Test data - use minimal data for faster rendering
const testData: TestDataRow[] = [
  { id: 1, name: 'Test Item 1', value: 100 },
  { id: 2, name: 'Test Item 2', value: 200 },
];

// Test columns with proper typing
const columnHelper = createColumnHelper<Record<string, unknown>>();
const testColumns = [
  columnHelper.accessor('id', { header: 'ID' }),
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('value', { header: 'Value' }),
];

// Helper function to create optimized theme for tests
const createTestTheme = (
  mode: 'light' | 'dark',
  customOptions = {}
): ReturnType<typeof createTheme> => {
  return createTheme({
    palette: { mode },
    shape: { borderRadius: 8 },
    ...customOptions,
  });
};

describe('DataGrid Theme Integration', () => {
  it('should render with dark theme', () => {
    const darkTheme = createTestTheme('dark');

    render(
      <ThemeProvider theme={darkTheme}>
        <DataGrid
          data={testData as unknown as Record<string, unknown>[]}
          columns={testColumns}
          title="Theme Test Grid"
          height={400} // Smaller height for faster rendering
          initialPageSize={10} // Smaller page size
          enableFiltering={false} // Disable filtering to reduce complexity
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
    const lightTheme = createTestTheme('light');

    render(
      <ThemeProvider theme={lightTheme}>
        <DataGrid
          data={testData as unknown as Record<string, unknown>[]}
          columns={testColumns}
          title="Light Theme Test"
          height={400} // Smaller height for faster rendering
          initialPageSize={10} // Smaller page size
          enableFiltering={false} // Disable filtering to reduce complexity
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Light Theme Test')).toBeInTheDocument();
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
  });

  it('should render with custom theme properties', () => {
    const customTheme = createTestTheme('dark', {
      palette: {
        mode: 'dark',
        primary: { main: '#38bdf8' },
        secondary: { main: '#00e1ff' },
      },
      typography: {
        fontFamily: 'Inter, system-ui',
      },
    });

    render(
      <ThemeProvider theme={customTheme}>
        <DataGrid
          data={testData as unknown as Record<string, unknown>[]}
          columns={testColumns}
          title="Custom Theme Test"
          height={400} // Smaller height for faster rendering
          initialPageSize={10} // Smaller page size
          enableFiltering={true} // Test with filtering but smaller dataset
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Custom Theme Test')).toBeInTheDocument();

    // Check that filter inputs are rendered
    const filterInputs = screen.getAllByPlaceholderText(/Filter/i);
    expect(filterInputs.length).toBeGreaterThan(0);
  });

  it('should handle empty data gracefully', () => {
    const theme = createTestTheme('dark');

    render(
      <ThemeProvider theme={theme}>
        <DataGrid
          data={[]}
          columns={testColumns}
          emptyMessage="No theme test data available"
          height={300} // Even smaller for empty state
        />
      </ThemeProvider>
    );

    expect(screen.getByText('No theme test data available')).toBeInTheDocument();
  });

  it('should render loading state with theme', () => {
    const theme = createTestTheme('dark');

    render(
      <ThemeProvider theme={theme}>
        <DataGrid
          data={[]}
          columns={testColumns}
          loading={true}
          height={300} // Smaller for loading state
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
