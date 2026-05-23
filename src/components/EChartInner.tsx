import React, { useRef, useEffect, useMemo } from 'react';

import '../utils/echartsRegistration';

import { useECharts } from '../hooks/useECharts';
import { useEChartsTheme } from '../hooks/useEChartsTheme';
import type { EChartsOption } from '../utils/echartsRegistration';

interface EChartInnerProps {
  option: Record<string, unknown>;
  height?: number | string;
  group?: string;
  loading?: boolean;
  style?: React.CSSProperties;
}

const EChartInner: React.FC<EChartInnerProps> = ({
  option,
  height = 300,
  group,
  loading = false,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { baseOption } = useEChartsTheme();

  const mergedOption = useMemo(() => {
    const mergedGrid = option.grid !== undefined ? option.grid : baseOption.grid;

    return {
      ...baseOption,
      ...option,
      animation: option.animation ?? baseOption.animation,
      animationDuration: option.animationDuration ?? baseOption.animationDuration,
      animationEasing: option.animationEasing ?? baseOption.animationEasing,
      textStyle: {
        ...(baseOption.textStyle as Record<string, unknown>),
        ...(option.textStyle as Record<string, unknown> | undefined),
      },
      tooltip: {
        ...(baseOption.tooltip as Record<string, unknown>),
        ...(option.tooltip as Record<string, unknown> | undefined),
      },
      grid: mergedGrid,
      legend:
        option.legend !== undefined
          ? typeof option.legend === 'object' && option.legend !== null
            ? { ...(baseOption.legend as Record<string, unknown>), ...option.legend }
            : option.legend
          : baseOption.legend,
      dataZoom: option.dataZoom ?? baseOption.dataZoom,
    } as EChartsOption;
  }, [baseOption, option]);

  const { showLoading, hideLoading } = useECharts(containerRef, mergedOption, { group });

  useEffect(() => {
    if (loading) {
      showLoading();
    } else {
      hideLoading();
    }
  }, [loading, showLoading, hideLoading]);

  const resolvedHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: resolvedHeight,
        ...style,
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default EChartInner;
