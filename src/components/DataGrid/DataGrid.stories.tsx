import type { Meta, StoryObj } from '@storybook/react';

import { DataGrid } from './DataGrid';

const meta: Meta<typeof DataGrid> = {
  title: 'Components/DataGrid',
  component: DataGrid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    data: { control: false },
    columns: { control: false },
    height: { control: 'number' },
    initialPageSize: { control: 'number' },
    enableSorting: { control: 'boolean' },
    enableFiltering: { control: 'boolean' },
    enablePagination: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof DataGrid>;

// Simple data for demonstration
const sampleData = [
  { id: 1, name: 'John Doe', age: 30, email: 'john@example.com', department: 'Engineering' },
  { id: 2, name: 'Jane Smith', age: 28, email: 'jane@example.com', department: 'Design' },
  { id: 3, name: 'Bob Johnson', age: 35, email: 'bob@example.com', department: 'Sales' },
  { id: 4, name: 'Alice Brown', age: 32, email: 'alice@example.com', department: 'Marketing' },
];

const sampleColumns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'age', header: 'Age' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'department', header: 'Department' },
];

export const Default: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    title: 'Employee Directory',
  },
};

export const WithoutSorting: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    title: 'No Sorting',
    enableSorting: false,
  },
};

export const WithoutFiltering: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    title: 'No Filtering',
    enableFiltering: false,
  },
};

export const WithoutPagination: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    title: 'No Pagination',
    enablePagination: false,
  },
};

export const Loading: Story = {
  args: {
    data: [],
    columns: sampleColumns,
    title: 'Loading State',
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    data: [],
    columns: sampleColumns,
    title: 'Empty Data',
    emptyMessage: 'No employees found',
  },
};

// Large dataset
const largeData = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: `Person ${i + 1}`,
  age: Math.floor(Math.random() * 50) + 20,
  email: `person${i + 1}@example.com`,
  department: ['Engineering', 'Design', 'Sales', 'Marketing', 'HR'][Math.floor(Math.random() * 5)],
}));

export const LargeDataset: Story = {
  args: {
    data: largeData,
    columns: sampleColumns,
    title: 'Large Dataset (1000 rows)',
    initialPageSize: 25,
  },
};

export const CustomHeight: Story = {
  args: {
    data: largeData.slice(0, 50),
    columns: sampleColumns,
    title: 'Fixed Height Grid',
    height: 400,
    initialPageSize: 10,
  },
};
