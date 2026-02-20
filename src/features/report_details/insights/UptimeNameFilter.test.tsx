import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { BuffUptime } from './BuffUptimeProgressBar';
import { BuffUptimesView } from './BuffUptimesView';
import { DebuffUptimesView } from './DebuffUptimesView';
import { StatusEffectUptimesView } from './StatusEffectUptimesView';

const theme = createTheme();

/** Helper to create a BuffUptime entry */
const createUptime = (name: string, id: string, isDebuff = false): BuffUptime => ({
  abilityGameID: id,
  abilityName: name,
  icon: 'https://example.com/icon.png',
  totalDuration: 100,
  uptime: 50,
  uptimePercentage: 50,
  isDebuff,
  applications: 10,
  hostilityType: isDebuff ? 1 : 0,
  uniqueKey: `key_${id}`,
});

/** Helper to type into the filter input */
const typeFilter = (value: string) => {
  const input = screen.getByPlaceholderText('Filter by name...');
  fireEvent.change(input, { target: { value } });
};

const sampleBuffs: BuffUptime[] = [
  createUptime('Major Courage', '1001'),
  createUptime('Minor Berserk', '1002'),
  createUptime('Major Resolve', '1003'),
  createUptime('Empower', '1004'),
];

const sampleDebuffs: BuffUptime[] = [
  createUptime('Major Breach', '2001', true),
  createUptime('Minor Brittle', '2002', true),
  createUptime('Crusher', '2003', true),
  createUptime('Off Balance', '2004', true),
];

const sampleStatusEffects: BuffUptime[] = [
  createUptime('Burning', '3001', true),
  createUptime('Chilled', '3002', true),
  createUptime('Concussed', '3003', true),
];

const noopToggle = jest.fn();

// ─── BuffUptimesView ───────────────────────────────────────────────

describe('BuffUptimesView - Name Filter', () => {
  const renderView = (uptimes = sampleBuffs) =>
    render(
      <ThemeProvider theme={theme}>
        <BuffUptimesView
          buffUptimes={uptimes}
          isLoading={false}
          showAllBuffs={true}
          onToggleShowAll={noopToggle}
          reportId="R1"
          fightId="1"
          selectedTargetId={null}
        />
      </ThemeProvider>,
    );

  it('shows filter input when buffs are present', () => {
    renderView();
    expect(screen.getByPlaceholderText('Filter by name...')).toBeInTheDocument();
  });

  it('does not show filter input when buff list is empty', () => {
    renderView([]);
    expect(screen.queryByPlaceholderText('Filter by name...')).not.toBeInTheDocument();
  });

  it('does not show filter input while loading', () => {
    render(
      <ThemeProvider theme={theme}>
        <BuffUptimesView
          buffUptimes={sampleBuffs}
          isLoading={true}
          showAllBuffs={true}
          onToggleShowAll={noopToggle}
          reportId="R1"
          fightId="1"
          selectedTargetId={null}
        />
      </ThemeProvider>,
    );
    expect(screen.queryByPlaceholderText('Filter by name...')).not.toBeInTheDocument();
  });

  it('filters buffs by name (case-insensitive)', () => {
    renderView();
    typeFilter('courage');

    // Major Courage should remain visible
    expect(screen.getByText('Major Courage')).toBeInTheDocument();
    // Others should be filtered out
    expect(screen.queryByText('Minor Berserk')).not.toBeInTheDocument();
    expect(screen.queryByText('Major Resolve')).not.toBeInTheDocument();
    expect(screen.queryByText('Empower')).not.toBeInTheDocument();
  });

  it('filters by partial match', () => {
    renderView();
    typeFilter('major');

    // Both "Major" buffs should remain
    expect(screen.getByText('Major Courage')).toBeInTheDocument();
    expect(screen.getByText('Major Resolve')).toBeInTheDocument();
    // Others should be filtered out
    expect(screen.queryByText('Minor Berserk')).not.toBeInTheDocument();
    expect(screen.queryByText('Empower')).not.toBeInTheDocument();
  });

  it('shows empty message when filter matches nothing', () => {
    renderView();
    typeFilter('zzzzz');

    expect(screen.getByText('No buffs matching "zzzzz" found.')).toBeInTheDocument();
  });

  it('clears filter via clear button', async () => {
    renderView();
    typeFilter('courage');

    // Only Major Courage visible
    expect(screen.queryByText('Minor Berserk')).not.toBeInTheDocument();

    // Click clear
    const clearBtn = screen.getByRole('button', { name: 'clear filter' });
    await userEvent.click(clearBtn);

    // All buffs visible again
    expect(screen.getByText('Major Courage')).toBeInTheDocument();
    expect(screen.getByText('Minor Berserk')).toBeInTheDocument();
    expect(screen.getByText('Major Resolve')).toBeInTheDocument();
    expect(screen.getByText('Empower')).toBeInTheDocument();
  });
});

// ─── DebuffUptimesView ─────────────────────────────────────────────

describe('DebuffUptimesView - Name Filter', () => {
  const renderView = (uptimes = sampleDebuffs) =>
    render(
      <ThemeProvider theme={theme}>
        <DebuffUptimesView
          selectedTargetId={null}
          debuffUptimes={uptimes}
          isLoading={false}
          showAllDebuffs={true}
          onToggleShowAll={noopToggle}
          reportId="R1"
          fightId="1"
        />
      </ThemeProvider>,
    );

  it('shows filter input when debuffs are present', () => {
    renderView();
    expect(screen.getByPlaceholderText('Filter by name...')).toBeInTheDocument();
  });

  it('does not show filter input when debuff list is empty', () => {
    renderView([]);
    expect(screen.queryByPlaceholderText('Filter by name...')).not.toBeInTheDocument();
  });

  it('filters debuffs by name (case-insensitive)', () => {
    renderView();
    typeFilter('breach');

    expect(screen.getByText('Major Breach')).toBeInTheDocument();
    expect(screen.queryByText('Minor Brittle')).not.toBeInTheDocument();
    expect(screen.queryByText('Crusher')).not.toBeInTheDocument();
    expect(screen.queryByText('Off Balance')).not.toBeInTheDocument();
  });

  it('shows empty message when filter matches nothing', () => {
    renderView();
    typeFilter('nonexistent');

    expect(screen.getByText('No debuffs matching "nonexistent" found.')).toBeInTheDocument();
  });

  it('clears filter via clear button', async () => {
    renderView();
    typeFilter('breach');

    expect(screen.queryByText('Crusher')).not.toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: 'clear filter' });
    await userEvent.click(clearBtn);

    expect(screen.getByText('Major Breach')).toBeInTheDocument();
    expect(screen.getByText('Crusher')).toBeInTheDocument();
  });
});

// ─── StatusEffectUptimesView ───────────────────────────────────────

describe('StatusEffectUptimesView - Name Filter', () => {
  const renderView = (uptimes: BuffUptime[] | null = sampleStatusEffects) =>
    render(
      <ThemeProvider theme={theme}>
        <StatusEffectUptimesView
          selectedTargetId={null}
          statusEffectUptimes={uptimes}
          isLoading={false}
          reportId="R1"
          fightId="1"
        />
      </ThemeProvider>,
    );

  it('shows filter input when status effects are present', () => {
    renderView();
    expect(screen.getByPlaceholderText('Filter by name...')).toBeInTheDocument();
  });

  it('does not show filter input when status effects list is null', () => {
    renderView(null);
    expect(screen.queryByPlaceholderText('Filter by name...')).not.toBeInTheDocument();
  });

  it('does not show filter input when status effects list is empty', () => {
    renderView([]);
    expect(screen.queryByPlaceholderText('Filter by name...')).not.toBeInTheDocument();
  });

  it('filters status effects by name (case-insensitive)', () => {
    renderView();
    typeFilter('burn');

    expect(screen.getByText('Burning')).toBeInTheDocument();
    expect(screen.queryByText('Chilled')).not.toBeInTheDocument();
    expect(screen.queryByText('Concussed')).not.toBeInTheDocument();
  });

  it('shows empty message when filter matches nothing', () => {
    renderView();
    typeFilter('xyz');

    expect(screen.getByText('No status effects matching "xyz" found.')).toBeInTheDocument();
  });

  it('clears filter via clear button', async () => {
    renderView();
    typeFilter('burn');

    expect(screen.queryByText('Chilled')).not.toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: 'clear filter' });
    await userEvent.click(clearBtn);

    expect(screen.getByText('Burning')).toBeInTheDocument();
    expect(screen.getByText('Chilled')).toBeInTheDocument();
    expect(screen.getByText('Concussed')).toBeInTheDocument();
  });
});
