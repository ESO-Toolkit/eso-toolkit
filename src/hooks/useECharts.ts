import * as echarts from 'echarts/core';
import { useEffect, useRef, useCallback } from 'react';

import type { EChartsOption } from '../utils/echartsRegistration';

export interface UseEChartsConfig {
  group?: string;
  renderer?: 'canvas' | 'svg';
  notMerge?: boolean;
}

export interface UseEChartsReturn {
  instanceRef: React.RefObject<echarts.ECharts | null>;
  showLoading: () => void;
  hideLoading: () => void;
  resize: () => void;
}

export function useECharts(
  containerRef: React.RefObject<HTMLDivElement | null>,
  option: EChartsOption | null,
  config?: UseEChartsConfig,
): UseEChartsReturn {
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const renderer = config?.renderer ?? 'canvas';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const instance = echarts.init(container, undefined, {
      renderer,
    });
    instanceRef.current = instance;

    const ro = new ResizeObserver(() => {
      if (!instance.isDisposed()) {
        instance.resize({ animation: { duration: 200 } });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (!instance.isDisposed()) {
        instance.dispose();
      }
      instanceRef.current = null;
    };
  }, [containerRef, renderer]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || instance.isDisposed() || !option) return;
    instance.setOption(option, { notMerge: config?.notMerge ?? true });
  }, [option, config?.notMerge, containerRef, renderer]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || instance.isDisposed() || !config?.group) return;
    instance.group = config.group;
    echarts.connect(config.group);
  }, [config?.group, containerRef, renderer]);

  const showLoading = useCallback(() => {
    const instance = instanceRef.current;
    if (instance && !instance.isDisposed()) {
      instance.showLoading('default', {
        text: '',
        maskColor: 'rgba(0,0,0,0.05)',
        spinnerRadius: 16,
        lineWidth: 2,
      });
    }
  }, []);

  const hideLoading = useCallback(() => {
    const instance = instanceRef.current;
    if (instance && !instance.isDisposed()) {
      instance.hideLoading();
    }
  }, []);

  const resize = useCallback(() => {
    const instance = instanceRef.current;
    if (instance && !instance.isDisposed()) {
      instance.resize();
    }
  }, []);

  return {
    instanceRef,
    showLoading,
    hideLoading,
    resize,
  };
}
