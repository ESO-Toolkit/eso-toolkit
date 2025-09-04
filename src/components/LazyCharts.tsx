import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import React, { Suspense } from 'react';

// Lazy load Chart.js and react-chartjs-2 components
const LazyLine = React.lazy(() =>
  import('react-chartjs-2').then((module) => ({ default: module.Line })),
);

const LazyBar = React.lazy(() =>
  import('react-chartjs-2').then((module) => ({ default: module.Bar })),
);

const LazyDoughnut = React.lazy(() =>
  import('react-chartjs-2').then((module) => ({ default: module.Doughnut })),
);

const LazyPie = React.lazy(() =>
  import('react-chartjs-2').then((module) => ({ default: module.Pie })),
);

// Chart loading fallback
const ChartLoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="300px">
    <CircularProgress />
  </Box>
);

// Wrapper components with Suspense
export const LineChart: React.FC<React.ComponentProps<typeof LazyLine>> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <LazyLine {...props} />
  </Suspense>
);

export const BarChart: React.FC<React.ComponentProps<typeof LazyBar>> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <LazyBar {...props} />
  </Suspense>
);

export const DoughnutChart: React.FC<React.ComponentProps<typeof LazyDoughnut>> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <LazyDoughnut {...props} />
  </Suspense>
);

export const PieChart: React.FC<React.ComponentProps<typeof LazyPie>> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <LazyPie {...props} />
  </Suspense>
);
