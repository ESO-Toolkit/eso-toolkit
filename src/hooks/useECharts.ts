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
  const optionRef = useRef(option);
  optionRef.current = option;

  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const instance = echarts.init(container, undefined, {
      renderer: configRef.current?.renderer ?? 'canvas',
    });
    instanceRef.current = instance;

    if (configRef.current?.group) {
      instance.group = configRef.current.group;
      echarts.connect(configRef.current.group);
    }

    if (optionRef.current) {
      instance.setOption(optionRef.current, { notMerge: true });
    }

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
  }, [containerRef]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || instance.isDisposed() || !option) return;
    instance.setOption(option, { notMerge: config?.notMerge ?? true });
  }, [option, config?.notMerge]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || instance.isDisposed() || !config?.group) return;
    instance.group = config.group;
    echarts.connect(config.group);
  }, [config?.group]);

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
