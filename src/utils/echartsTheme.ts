import * as echarts from 'echarts/core';

import type { PerfTier } from '../store/ui/uiSlice';

export type ChartIntensity = 'subtle' | 'bold';

const DARK_PALETTE = [
  '#38bdf8', // sky
  '#f43f5e', // rose
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#ec4899', // pink
];

const LIGHT_PALETTE = [
  '#0284c7', // sky-600
  '#e11d48', // rose-600
  '#16a34a', // green-600
  '#d97706', // amber-600
  '#9333ea', // purple-600
  '#0891b2', // cyan-600
  '#ca8a04', // yellow-600
  '#7c3aed', // violet-600
  '#059669', // emerald-600
  '#dc2626', // red-600
  '#2563eb', // blue-600
  '#db2777', // pink-600
];

export interface EChartsThemeOptions {
  color: string[];
  darkMode: boolean;
  perfTier: PerfTier;
  intensity: ChartIntensity;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  gridLineColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  animation: boolean;
  animationDuration: number;
  animationEasing: string;
}

export function buildEChartsTheme(
  darkMode: boolean,
  perfTier: PerfTier,
  intensity: ChartIntensity,
): EChartsThemeOptions {
  const animate = perfTier !== 'low';
  const isBold = intensity === 'bold';

  return {
    color: darkMode ? DARK_PALETTE : LIGHT_PALETTE,
    darkMode,
    perfTier,
    intensity,
    textColor: darkMode ? '#e5e7eb' : '#1e293b',
    mutedColor: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    borderColor: darkMode ? '#1f2937' : '#bcd9ff',
    gridLineColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    tooltipBg: darkMode
      ? isBold
        ? 'rgba(15,23,42,0.95)'
        : 'rgba(15,23,42,0.88)'
      : isBold
        ? 'rgba(255,255,255,0.95)'
        : 'rgba(255,255,255,0.88)',
    tooltipBorder: darkMode ? '#1f2937' : '#bcd9ff',
    animation: animate,
    animationDuration: !animate ? 0 : isBold ? 800 : 500,
    animationEasing: isBold ? 'elasticOut' : 'cubicOut',
  };
}

export function glowLineStyle(
  color: string,
  intensity: ChartIntensity,
  perfTier: PerfTier,
): Record<string, unknown> {
  if (perfTier === 'low') return {};
  const isBold = intensity === 'bold';
  return {
    shadowBlur: isBold ? 12 : 4,
    shadowColor: isBold ? color : `${color}80`,
    shadowOffsetY: isBold ? 2 : 0,
  };
}

export function gradientAreaStyle(
  color: string,
  intensity: ChartIntensity,
  perfTier: PerfTier,
): Record<string, unknown> {
  if (perfTier === 'low') return {};
  const topOpacity = intensity === 'bold' ? 0.4 : 0.15;
  return {
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: `${color}${Math.round(topOpacity * 255).toString(16).padStart(2, '0')}` },
      { offset: 1, color: `${color}00` },
    ]),
  };
}

export function steppedLineDefaults(): Record<string, unknown> {
  return {
    step: 'end',
    showSymbol: false,
    symbolSize: 0,
    emphasis: {
      focus: 'series',
      lineStyle: { width: 3 },
    },
  };
}

export function buildBaseOption(theme: EChartsThemeOptions): Record<string, unknown> {
  return {
    color: theme.color,
    animation: theme.animation,
    animationDuration: theme.animationDuration,
    animationEasing: theme.animationEasing,
    textStyle: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: theme.textColor,
    },
    grid: {
      left: 12,
      right: 20,
      top: 40,
      bottom: 60,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      borderWidth: 1,
      textStyle: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        color: theme.textColor,
        fontSize: 13,
      },
      extraCssText: theme.intensity === 'bold'
        ? 'backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.3);'
        : 'border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,0.15);',
      axisPointer: {
        type: 'cross',
        crossStyle: { color: theme.mutedColor },
        lineStyle: {
          color: theme.mutedColor,
          type: 'dashed',
        },
        label: {
          backgroundColor: theme.darkMode ? '#374151' : '#e2e8f0',
          color: theme.textColor,
        },
      },
    },
    legend: {
      textStyle: {
        color: theme.textColor,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: 12,
      },
      pageTextStyle: { color: theme.textColor },
      pageIconColor: theme.mutedColor,
      pageIconInactiveColor: theme.gridLineColor,
    },
    xAxis: {
      axisLine: { lineStyle: { color: theme.borderColor } },
      axisTick: { lineStyle: { color: theme.borderColor } },
      axisLabel: { color: theme.mutedColor, fontSize: 11 },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: theme.mutedColor, fontSize: 11 },
      splitLine: {
        lineStyle: {
          color: theme.gridLineColor,
          type: 'dotted',
        },
      },
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        height: 20,
        bottom: 4,
        borderColor: theme.borderColor,
        fillerColor: theme.darkMode ? 'rgba(56,189,248,0.15)' : 'rgba(2,132,199,0.1)',
        handleStyle: { color: theme.color[0] },
        textStyle: { color: theme.mutedColor, fontSize: 10 },
        dataBackground: {
          lineStyle: { color: theme.gridLineColor },
          areaStyle: { color: theme.gridLineColor },
        },
      },
      {
        type: 'inside',
        zoomOnMouseWheel: 'shift',
      },
    ],
  };
}
