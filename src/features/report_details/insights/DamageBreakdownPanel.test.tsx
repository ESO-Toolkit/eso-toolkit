import { render } from '@testing-library/react';
import React from 'react';

import { createMockDamageEvent, createMockFight } from '../../../test/utils/combatLogMockFactories';
import { HitType } from '../../../types/combatlogEvents';

import { DamageBreakdownPanel } from './DamageBreakdownPanel';

const mockDamageBreakdownView = jest.fn((_props: unknown) => null);

jest.mock('../../../hooks', () => ({
  useDamageEvents: jest.fn(),
  useReportMasterData: jest.fn(),
}));

jest.mock('../../../hooks/useSelectedTargetIds', () => ({
  useSelectedTargetIds: jest.fn(),
}));

jest.mock('./DamageBreakdownView', () => ({
  DamageBreakdownView: (props: unknown) => mockDamageBreakdownView(props),
}));

const { useDamageEvents, useReportMasterData } = jest.requireMock('../../../hooks');
const { useSelectedTargetIds } = jest.requireMock('../../../hooks/useSelectedTargetIds');

interface RenderedDamageBreakdown {
  abilityGameID: string;
  eligibleHitCount: number;
  criticalHits: number;
  criticalRate: number | null;
  criticalDamage: number;
  criticalDamageShare: number | null;
}

const getRenderedBreakdown = (): RenderedDamageBreakdown[] => {
  const latestCall = mockDamageBreakdownView.mock.calls.at(-1);
  const props = latestCall?.[0] as { damageBreakdown: RenderedDamageBreakdown[] } | undefined;
  return props?.damageBreakdown ?? [];
};

const setup = (damageEvents: ReturnType<typeof createMockDamageEvent>[]): void => {
  useDamageEvents.mockReturnValue({ damageEvents, isDamageEventsLoading: false });
  useReportMasterData.mockReturnValue({
    reportMasterData: {
      abilitiesById: {
        100: { name: 'Test Ability', type: '64' },
      },
    },
    isMasterDataLoading: false,
  });
  useSelectedTargetIds.mockReturnValue(new Set());
};

describe('DamageBreakdownPanel critical metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps critical hit rate distinct from critical damage share', () => {
    setup([
      createMockDamageEvent({ abilityGameID: 100, amount: 100, hitType: HitType.Normal }),
      createMockDamageEvent({ abilityGameID: 100, amount: 900, hitType: HitType.Critical }),
    ]);

    render(<DamageBreakdownPanel fight={createMockFight()} />);

    expect(getRenderedBreakdown()).toEqual([
      expect.objectContaining({
        abilityGameID: '100',
        eligibleHitCount: 2,
        criticalHits: 1,
        criticalRate: 50,
        criticalDamage: 900,
        criticalDamageShare: 90,
      }),
    ]);
  });

  it('marks critical metrics unavailable when no eligible hits were recorded', () => {
    setup([createMockDamageEvent({ abilityGameID: 100, amount: 500, hitType: 99 as HitType })]);

    render(<DamageBreakdownPanel fight={createMockFight()} />);

    expect(getRenderedBreakdown()[0]).toEqual(
      expect.objectContaining({
        eligibleHitCount: 0,
        criticalHits: 0,
        criticalRate: null,
        criticalDamageShare: null,
      }),
    );
  });

  it('withholds critical damage share when an otherwise unknown hit type is present', () => {
    setup([
      createMockDamageEvent({ abilityGameID: 100, amount: 100, hitType: HitType.Normal }),
      createMockDamageEvent({ abilityGameID: 100, amount: 900, hitType: 99 as HitType }),
    ]);

    render(<DamageBreakdownPanel fight={createMockFight()} />);

    expect(getRenderedBreakdown()[0]).toEqual(
      expect.objectContaining({
        eligibleHitCount: 1,
        criticalRate: 0,
        criticalDamageShare: null,
      }),
    );
  });
});
