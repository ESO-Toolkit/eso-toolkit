# DataGrid Component

A powerful, reusable DataGrid component built with TanStack React Table and Material-UI.

## Features

✅ **Column-level sorting** - Click headers to sort ascending/descending  
✅ **Column-level filtering** - Individual filter inputs for each column  
✅ **Pagination** - Grid-level pagination with configurable page sizes  
✅ **Responsive design** - Sticky headers, scrollable content  
✅ **TypeScript support** - Fully typed with generics  
✅ **Customizable** - Configurable height, page sizes, enable/disable features  
✅ **Loading states** - Built-in loading indicator  
✅ **Empty states** - Configurable empty message

## Basic Usage

```tsx
import { createColumnHelper } from '@tanstack/react-table';
import { DataGrid } from './components/DataGrid';

interface Person {
  id: number;
  name: string;
  age: number;
  email: string;
}

const MyComponent: React.FC = () => {
  const columnHelper = createColumnHelper<Person>();

  const data: Person[] = [
    { id: 1, name: 'John Doe', age: 30, email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', age: 25, email: 'jane@example.com' },
  ];

  const columns = [
    columnHelper.accessor('id', { header: 'ID', size: 80 }),
    columnHelper.accessor('name', { header: 'Name', size: 150 }),
    columnHelper.accessor('age', { header: 'Age', size: 100 }),
    columnHelper.accessor('email', { header: 'Email', size: 200 }),
  ];

  return (
    <DataGrid
      data={data}
      columns={columns}
      title="People Directory"
      height={600}
      initialPageSize={25}
    />
  );
};
```

## Props

| Prop                   | Type             | Default             | Description                               |
| ---------------------- | ---------------- | ------------------- | ----------------------------------------- |
| `data`                 | `T[]`            | required            | Array of data objects                     |
| `columns`              | `ColumnDef<T>[]` | required            | TanStack table column definitions         |
| `title`                | `string`         | undefined           | Optional grid title                       |
| `height`               | `number`         | 600                 | Grid height in pixels                     |
| `initialPageSize`      | `number`         | 25                  | Initial rows per page                     |
| `pageSizeOptions`      | `number[]`       | [10,25,50,100]      | Available page size options               |
| `enableSorting`        | `boolean`        | true                | Enable column sorting                     |
| `enableFiltering`      | `boolean`        | true                | Enable column filtering                   |
| `enablePagination`     | `boolean`        | true                | Enable pagination                         |
| `enableVirtualization` | `boolean`        | false               | Enable row virtualization for performance |
| `estimateSize`         | `number`         | 40                  | Estimated row height for virtualization   |
| `loading`              | `boolean`        | false               | Show loading state                        |
| `emptyMessage`         | `string`         | "No data available" | Empty state message                       |

## Row Virtualization

For large datasets (>1000 rows), enable virtualization to prevent performance issues:

```tsx
<DataGrid
  data={largeDataset} // e.g., 10,000+ rows
  columns={columns}
  enableVirtualization={true}
  enablePagination={false} // Disable pagination when using virtualization
  estimateSize={48} // Adjust based on your row height
  height={600}
/>
```

### Virtualization Benefits

- **Memory Efficiency**: Only renders visible rows
- **Smooth Scrolling**: Maintains 60fps even with thousands of rows
- **Instant Loading**: No pagination delays
- **Reduced DOM Size**: Better browser performance

### When to Use Virtualization

- **Large Datasets**: >1000 rows
- **Performance Critical**: Real-time data updates
- **Memory Constraints**: Prevent out-of-memory errors
- **Smooth UX**: Eliminate pagination for seamless scrolling

## Column Filtering

The DataGrid automatically provides appropriate filter inputs based on data types:

- **Number columns**: Number input with spinner controls
- **String columns**: Text input for partial matching
- **Auto-detection**: Determines input type from first data value

## Sorting

Click column headers to sort:

- **First click**: Ascending sort (🔼)
- **Second click**: Descending sort (🔽)
- **Third click**: Remove sort

## Styling & Theme Integration

The DataGrid is fully integrated with your Material-UI theme and respects all theme settings:

### Theme-Aware Features

- **Dark Mode Support**: Automatically adapts to light/dark theme modes
- **Color Palette**: Uses theme primary, secondary, and text colors
- **Typography**: Respects theme font families (Inter for body, Space Grotesk for headers)
- **Border Radius**: Uses theme's `shape.borderRadius` for consistent rounded corners
- **Transitions**: Smooth animations using theme transition timing
- **Spacing**: Consistent padding and margins using theme spacing scale

### Visual Design

- **Header Styling**: Semi-transparent background with accent border and blur effect
- **Row Hover**: Subtle primary color highlight on row hover
- **Alternating Rows**: Improved readability with alternating background colors
- **Filter Inputs**: Themed input fields with focus states and clear buttons
- **Buttons**: Consistent with app's button styling including hover animations
- **Loading State**: Matches Paper component styling from theme

### Custom Theme Properties

If your theme includes custom tokens (like the ESO app's design system):

```tsx
// The DataGrid automatically uses:
theme.palette.background.paper  // Container backgrounds
theme.palette.primary.main      // Accent colors, focus states
theme.palette.text.primary      // Main text color
theme.palette.text.secondary    // Muted text (pagination, empty states)
theme.palette.divider          // Borders and separators
theme.shape.borderRadius       // Rounded corners
theme.transitions.*            // Animation timing
```

### Responsive Design

- **Mobile-first**: Adapts to different screen sizes
- **Touch-friendly**: Appropriate touch targets for mobile devices
- **Overflow**: Horizontal scrolling for wide tables on narrow screens

## Advanced Usage

```tsx
// Disable specific features
<DataGrid
  data={data}
  columns={columns}
  enableSorting={false}     // Disable sorting
  enableFiltering={false}   // Disable filtering
  enablePagination={false}  // Show all rows
  height={400}              // Custom height
  pageSizeOptions={[5, 10]} // Custom page sizes
  emptyMessage="No users found" // Custom empty message
/>

// Loading state
<DataGrid
  data={[]}
  columns={columns}
  loading={true}
  title="Loading Users..."
/>
```

## Integration with Existing Code

This DataGrid can easily replace existing table implementations:

1. **Replace EventsGrid**: Use DataGrid for better filtering UX
2. **Replace custom tables**: Migrate to standardized, feature-rich component
3. **Consistent UX**: Same look/feel across all data grids in the app

## Performance

- **Virtual scrolling**: Not implemented (suitable for datasets < 10k rows)
- **Client-side operations**: All filtering, sorting, pagination happens in-browser
- **Optimized rendering**: React Table handles efficient re-renders
- **Memory efficient**: Only visible rows are rendered

## Dependencies

- `@tanstack/react-table` - Table logic and state management
- `@mui/material` - UI components and theming
- `@mui/icons-material` - Icons for sorting and pagination
- `react` - React framework

This component provides a professional, feature-complete data grid experience that's ready for production use! 🚀
