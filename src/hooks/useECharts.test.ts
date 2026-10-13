import { renderHook } from '@testing-library/react';
import * as echarts from 'echarts/core';
import { createRef } from 'react';

import { useECharts, type UseEChartsReturn } from './useECharts';

interface ChartTestProps {
  option: { animation: boolean } | null;
  renderer: 'canvas' | 'svg';
  notMerge: boolean;
}

jest.mock('echarts/core', () => ({ init: jest.fn(), connect: jest.fn() }));

const makeInstance = () => ({
  setOption: jest.fn(),
  isDisposed: jest.fn().mockReturnValue(false),
  resize: jest.fn(),
  dispose: jest.fn(),
});

describe('useECharts option application', () => {
  it('applies once on mount, on option changes, and after renderer replacement', () => {
    const first = makeInstance();
    const second = makeInstance();
    jest
      .mocked(echarts.init)
      .mockReturnValueOnce(first as unknown as echarts.ECharts)
      .mockReturnValueOnce(second as unknown as echarts.ECharts);
    const containerRef = createRef<HTMLDivElement>();
    containerRef.current = document.createElement('div');
    const initialOption = { animation: false };
    const { rerender, unmount } = renderHook<UseEChartsReturn, ChartTestProps>(
      ({ option, renderer, notMerge }) => useECharts(containerRef, option, { renderer, notMerge }),
      { initialProps: { option: initialOption, renderer: 'canvas', notMerge: false } },
    );
    expect(first.setOption).toHaveBeenCalledTimes(1);
    expect(first.setOption).toHaveBeenLastCalledWith(initialOption, { notMerge: false });
    rerender({ option: initialOption, renderer: 'canvas', notMerge: false });
    expect(first.setOption).toHaveBeenCalledTimes(1);
    const nextOption = { animation: true };
    rerender({ option: nextOption, renderer: 'canvas', notMerge: false });
    expect(first.setOption).toHaveBeenCalledTimes(2);
    rerender({ option: nextOption, renderer: 'canvas', notMerge: true });
    expect(first.setOption).toHaveBeenCalledTimes(3);
    rerender({ option: nextOption, renderer: 'svg', notMerge: true });
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(second.setOption).toHaveBeenCalledTimes(1);
    expect(second.setOption).toHaveBeenLastCalledWith(nextOption, { notMerge: true });
    rerender({ option: null, renderer: 'svg', notMerge: true });
    expect(second.setOption).toHaveBeenCalledTimes(1);
    unmount();
    expect(second.dispose).toHaveBeenCalledTimes(1);
  });
});
