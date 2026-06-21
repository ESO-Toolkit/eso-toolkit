/**
 * Hook-level tests for the numeric-input guards. These exercise the setters
 * directly because a browser `<input type="number">` (and jsdom) sanitizes most
 * invalid text, making non-finite values hard to inject through the UI — yet a
 * transient or out-of-range value can still reach the setter, and must never
 * poison the results with NaN/Infinity.
 */

import { act, renderHook } from '@testing-library/react';

import { useUltimateCalculator } from '../useUltimateCalculator';

describe('useUltimateCalculator numeric guards', () => {
  it('rejects non-finite numeric input and keeps results finite', () => {
    const { result } = renderHook(() => useUltimateCalculator());

    const fightBefore = result.current.state.fightDurationSeconds;
    act(() => result.current.setFightDuration(NaN));
    expect(result.current.state.fightDurationSeconds).toBe(fightBefore);
    act(() => result.current.setFightDuration(Infinity));
    expect(result.current.state.fightDurationSeconds).toBe(fightBefore);

    act(() => result.current.setStartingUltimate(NaN));
    expect(Number.isFinite(result.current.state.startingUltimate)).toBe(true);

    act(() => result.current.setPillagerHealerUltCost(Number.POSITIVE_INFINITY));
    expect(Number.isFinite(result.current.state.pillagerHealerUltCost)).toBe(true);

    act(() => result.current.setCustomUltimateCost(NaN));
    // A NaN custom cost is rejected — it stays at its initial null.
    expect(result.current.state.customUltimateCost).toBeNull();

    // The headline results never become NaN/Infinity.
    expect(Number.isFinite(result.current.expected.totalUltimate)).toBe(true);
    expect(Number.isFinite(result.current.expected.ultimatePerSecond)).toBe(true);
    expect(Number.isFinite(result.current.effectiveCost)).toBe(true);
  });

  it('still accepts valid numeric edits', () => {
    const { result } = renderHook(() => useUltimateCalculator());

    act(() => result.current.setFightDuration(120));
    expect(result.current.state.fightDurationSeconds).toBe(120);

    act(() => result.current.setCustomUltimateCost(180));
    expect(result.current.state.customUltimateCost).toBe(180);

    act(() => result.current.setCustomUltimateCost(null));
    expect(result.current.state.customUltimateCost).toBeNull();

    act(() => result.current.setStartingUltimate(75));
    expect(result.current.state.startingUltimate).toBe(75);
  });
});
