import { render, screen } from '@testing-library/react';
import React from 'react';

import { DamageTypeFlags } from '../../../types/abilities';
import type { AnalyzerPanelStateKind } from '../AnalyzerPanelState';

import type { BuffUptime } from './BuffUptimeProgressBar';
import { BuffUptimesView } from './BuffUptimesView';
import { DamageBreakdownView } from './DamageBreakdownView';
import { DamageTypeBreakdownView } from './DamageTypeBreakdownView';
import { DebuffUptimesView } from './DebuffUptimesView';
import { StatusEffectUptimesView } from './StatusEffectUptimesView';

const uptime: BuffUptime = {
  abilityGameID: '42',
  abilityName: 'Retained Effect',
  totalDuration: 500,
  uptime: 0.5,
  uptimePercentage: 50,
  isDebuff: false,
  applications: 1,
  hostilityType: 0,
  uniqueKey: '42',
};

type ViewFactory = (state: AnalyzerPanelStateKind, hasData: boolean) => React.ReactElement;

const views: Array<[string, ViewFactory]> = [
  [
    'damage breakdown',
    (state, hasData) => (
      <DamageBreakdownView
        state={state}
        totalDamage={hasData ? 100 : 0}
        damageBreakdown={
          hasData
            ? [
                {
                  abilityGameID: '42',
                  abilityName: 'Retained Effect',
                  totalDamage: 100,
                  hitCount: 1,
                  criticalHits: 0,
                  criticalRate: 0,
                  averageDamage: 100,
                },
              ]
            : []
        }
      />
    ),
  ],
  [
    'damage type breakdown',
    (state, hasData) => (
      <DamageTypeBreakdownView
        state={state}
        totalDamage={hasData ? 100 : 0}
        damageTypeBreakdown={
          hasData
            ? [
                {
                  damageType: DamageTypeFlags.FIRE,
                  displayName: 'Retained Effect',
                  totalDamage: 100,
                  hitCount: 1,
                  criticalHits: 0,
                  criticalRate: 0,
                  averageDamage: 100,
                },
              ]
            : []
        }
      />
    ),
  ],
  [
    'buff uptimes',
    (state, hasData) => (
      <BuffUptimesView
        state={state}
        buffUptimes={hasData ? [uptime] : []}
        showAllBuffs={false}
        onToggleShowAll={jest.fn()}
        reportId={null}
        fightId={null}
        selectedTargetId={null}
      />
    ),
  ],
  [
    'debuff uptimes',
    (state, hasData) => (
      <DebuffUptimesView
        state={state}
        debuffUptimes={hasData ? [{ ...uptime, isDebuff: true }] : []}
        showAllDebuffs={false}
        onToggleShowAll={jest.fn()}
        reportId={null}
        fightId={null}
        selectedTargetId={null}
      />
    ),
  ],
  [
    'status effect uptimes',
    (state, hasData) => (
      <StatusEffectUptimesView
        state={state}
        statusEffectUptimes={hasData ? [uptime] : []}
        reportId={null}
        fightId={null}
        selectedTargetId={null}
      />
    ),
  ],
];

describe.each(views)('%s lifecycle', (_name, createView) => {
  it('announces deterministic states and retains prior content during partial, stale, and failed states', () => {
    const { rerender } = render(createView('loading', false));
    expect(screen.getByRole('status')).toHaveTextContent('Loading data.');
    expect(screen.queryByText('Retained Effect')).not.toBeInTheDocument();

    rerender(createView('empty', false));
    expect(screen.getByRole('status')).toHaveTextContent('No data is available for this panel.');

    for (const [state, announcement] of [
      ['partial', 'Updating data; showing the latest available results.'],
      ['stale', 'Panel data is not confirmed current.'],
      ['failed', 'The latest refresh failed. Retained data may be out of date.'],
    ] as const) {
      rerender(createView(state, true));
      expect(screen.getByRole(state === 'failed' ? 'alert' : 'status')).toHaveTextContent(
        announcement,
      );
      expect(screen.getByText('Retained Effect')).toBeInTheDocument();
    }

    rerender(createView('ready', true));
    expect(screen.getByRole('status')).toHaveTextContent('Data is ready.');
    expect(screen.getByText('Retained Effect')).toBeInTheDocument();
  });
});
