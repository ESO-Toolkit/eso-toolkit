import { render } from '@testing-library/react';
import React from 'react';

import { createMockDamageEvent, createMockFight } from '../../../test/utils/combatLogMockFactories';
import { DamageTypeFlags } from '../../../types/abilities';
import { HitType } from '../../../types/combatlogEvents';

import { DamageTypeBreakdownPanel } from './DamageTypeBreakdownPanel';

const mockDamageTypeBreakdownView = jest.fn((_props: unknown) => null);

jest.mock('../../../hooks', () => ({
  useDamageEvents: jest.fn(),
  useReportMasterData: jest.fn(),
}));

jest.mock('../../../hooks/useSelectedTargetIds', () => ({
  useSelectedTargetIds: jest.fn(),
}));

jest.mock('./DamageTypeBreakdownView', () => ({
  DamageTypeBreakdownView: (props: unknown) => mockDamageTypeBreakdownView(props),
}));

const { useDamageEvents, useReportMasterData } = jest.requireMock('../../../hooks');
const { useSelectedTargetIds } = jest.requireMock('../../../hooks/useSelectedTargetIds');

interface RenderedDamageTypeBreakdown {
  displayName: string;
  eligibleHitCount: number;
  criticalHits: number;
  criticalRate: number | null;
  criticalDamage: number;
  criticalDamageShare: number | null;
}

const getMagicBreakdown = (): RenderedDamageTypeBreakdown | undefined => {
  const latestCall = mockDamageTypeBreakdownView.mock.calls.at(-1);
  const props = latestCall?.[0] as
    { damageTypeBreakdown: RenderedDamageTypeBreakdown[] } | undefined;
  const breakdown = props?.damageTypeBreakdown ?? [];
  return breakdown.find((item) => item.displayName === 'Magic');
};

const setup = (damageEvents: ReturnType<typeof createMockDamageEvent>[]): void => {
  useDamageEvents.mockReturnValue({ damageEvents, isDamageEventsLoading: false });
  useReportMasterData.mockReturnValue({
    reportMasterData: {
      abilitiesById: {
        100: { name: 'Test Ability', type: String(DamageTypeFlags.MAGIC) },
      },
    },
    isMasterDataLoading: false,
  });
  useSelectedTargetIds.mockReturnValue(new Set());
};

describe('DamageTypeBreakdownPanel critical metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates category critical hit rate separately from critical damage share', () => {
    setup([
      createMockDamageEvent({ abilityGameID: 100, amount: 100, hitType: HitType.Normal }),
      createMockDamageEvent({ abilityGameID: 100, amount: 900, hitType: HitType.Critical }),
    ]);

    render(<DamageTypeBreakdownPanel fight={createMockFight()} />);

    expect(getMagicBreakdown()).toEqual(
      expect.objectContaining({
        eligibleHitCount: 2,
        criticalHits: 1,
        criticalRate: 50,
        criticalDamage: 900,
        criticalDamageShare: 90,
      }),
    );
  });

  it('marks category critical metrics unavailable for unknown hit types', () => {
    setup([createMockDamageEvent({ abilityGameID: 100, amount: 500, hitType: 99 as HitType })]);

    render(<DamageTypeBreakdownPanel fight={createMockFight()} />);

    expect(getMagicBreakdown()).toEqual(
      expect.objectContaining({
        eligibleHitCount: 0,
        criticalHits: 0,
        criticalRate: null,
        criticalDamageShare: null,
      }),
    );
  });

  it('keeps category hit rate available while withholding share with unknown hit types', () => {
    setup([
      createMockDamageEvent({ abilityGameID: 100, amount: 100, hitType: HitType.Normal }),
      createMockDamageEvent({ abilityGameID: 100, amount: 900, hitType: 99 as HitType }),
    ]);

    render(<DamageTypeBreakdownPanel fight={createMockFight()} />);

    expect(getMagicBreakdown()).toEqual(
      expect.objectContaining({
        eligibleHitCount: 1,
        criticalHits: 0,
        criticalRate: 0,
        criticalDamageShare: null,
      }),
    );
  });
});
