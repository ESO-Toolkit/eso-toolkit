import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import React, { Suspense } from 'react';

const ChartLoadingFallback: React.FC = () => (
  <Box
    sx={{ justifyContent: 'center', alignItems: 'center', height: '300px', display: 'flex' }}
    aria-live="polite"
  >
    <CircularProgress aria-label="Loading chart" />
  </Box>
);

interface EChartInnerProps {
  option: Record<string, unknown>;
  height?: number | string;
  group?: string;
  loading?: boolean;
  style?: React.CSSProperties;
}

const LazyEChartInner = React.lazy(() => import('./EChartInner'));

const EChart: React.FC<EChartInnerProps> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <LazyEChartInner {...props} />
  </Suspense>
);

// eslint-disable-next-line import/no-default-export
export default EChart;
export { EChart };
export type { EChartInnerProps as EChartProps };
