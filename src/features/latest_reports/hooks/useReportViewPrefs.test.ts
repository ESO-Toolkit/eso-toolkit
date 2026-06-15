import { act, renderHook } from '@testing-library/react';

import { useReportViewPrefs } from './useReportViewPrefs';

describe('useReportViewPrefs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to table + comfortable', () => {
    const { result } = renderHook(() => useReportViewPrefs());
    expect(result.current.viewMode).toBe('table');
    expect(result.current.density).toBe('comfortable');
  });

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useReportViewPrefs());
    act(() => result.current.setViewMode('cards'));
    act(() => result.current.setDensity('compact'));
    expect(result.current.viewMode).toBe('cards');
    expect(result.current.density).toBe('compact');
    expect(window.localStorage.getItem('latestReports.viewMode')).toBe('cards');
    expect(window.localStorage.getItem('latestReports.density')).toBe('compact');
  });

  it('reads previously stored values on mount', () => {
    window.localStorage.setItem('latestReports.viewMode', 'cards');
    window.localStorage.setItem('latestReports.density', 'compact');
    const { result } = renderHook(() => useReportViewPrefs());
    expect(result.current.viewMode).toBe('cards');
    expect(result.current.density).toBe('compact');
  });

  it('ignores unknown stored values and falls back to defaults', () => {
    window.localStorage.setItem('latestReports.viewMode', 'bogus');
    const { result } = renderHook(() => useReportViewPrefs());
    expect(result.current.viewMode).toBe('table');
  });
});
