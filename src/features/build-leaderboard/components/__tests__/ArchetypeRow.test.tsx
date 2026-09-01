import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import React from 'react';

import type { BuildCluster } from '../../types/clustering.types';
import type { DpsParse } from '../../types/dpsParses.types';
import { ArchetypeRow, parseFreshness } from '../ArchetypeRow';

const theme = createTheme();

const CLUSTER: BuildCluster = {
  id: 'c0',
  label: 'Deadly Strike + Coral Riptide Arcanist',
  esoClass: 'Arcanist',
  size: 7,
  share: 0.2,
  memberParseIds: ['p1'],
  medoidParseId: 'p1',
  dps: { min: 0, q1: 0, median: 100_000, q3: 0, p90: 0, max: 0, mean: 0, count: 1 },
  core: [],
  flex: [],
  variations: [],
  cohesion: 0,
};

function makeParse(overrides: Partial<DpsParse> = {}): DpsParse {
  return {
    parse_id: 'p1',
    encounter_id: 4,
    difficulty: 122,
    zone_id: 1,
    trial_id: '',
    encounter_name: '',
    hard_mode_level: null,
    partition: -1,
    character_label: 'Player',
    eso_class: 'Arcanist',
    spec_name: '',
    race: null,
    server_region: null,
    server_name: null,
    guild_name: null,
    report_code: 'abc',
    fight_id: 1,
    rank: 1,
    amount: 100_000,
    duration_ms: null,
    log_start_ms: null,
    log_date: null,
    bracket_data: null,
    set1_id: null,
    set2_id: null,
    monster_id: null,
    mythic_id: null,
    arena_set_id: null,
    mundus_id: null,
    food_ability_id: null,
    signature_hash: 'h',
    build: null,
    source_url: '',
    ...overrides,
  };
}

function renderRow(
  medoidParse?: DpsParse,
  bestParse?: DpsParse,
  clusterOverride?: Partial<typeof CLUSTER>,
  selected = false,
  pooled = false,
  ungrouped = false,
): void {
  const cluster = { ...CLUSTER, ...clusterOverride };
  render(
    <ThemeProvider theme={theme}>
      <ol>
        <ArchetypeRow
          cluster={cluster}
          label={CLUSTER.label}
          selected={selected}
          recommended={false}
          showClassIcon
          medoidParse={medoidParse}
          bestParse={bestParse}
          coveredBosses={bestParse ? 9 : undefined}
          availableBosses={bestParse ? 14 : undefined}
          pooled={pooled}
          ungrouped={ungrouped}
          onSelect={() => {}}
        />
      </ol>
    </ThemeProvider>,
  );
}

describe('ArchetypeRow selection semantics', () => {
  it('exposes selection as pressed state on the row button', () => {
    renderRow(undefined, undefined, undefined, true);

    const row = screen.getByRole('button', { name: /Deadly Strike/ });
    expect(row).toHaveAttribute('aria-pressed', 'true');
    expect(row).not.toHaveAttribute('aria-current');
  });
});

describe('parseFreshness', () => {
  const NOW = Date.parse('2026-08-25T12:00:00Z');

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null without a parse', () => {
    expect(parseFreshness(undefined)).toBeNull();
  });

  it('returns null when the parse carries no timestamp at all', () => {
    expect(parseFreshness(makeParse())).toBeNull();
  });

  it('describes a parse from log_start_ms with its age in days', () => {
    const parse = makeParse({ log_start_ms: Date.parse('2026-07-12T00:00:00Z') });
    expect(parseFreshness(parse)).toBe('representative parse from Jul 12 · 44d old');
  });

  it('falls back to log_date when log_start_ms is missing', () => {
    const parse = makeParse({ log_date: '2026-07-12' });
    expect(parseFreshness(parse)).toBe('representative parse from Jul 12 · 44d old');
  });

  it('omits the age suffix for same-day parses', () => {
    const parse = makeParse({ log_start_ms: NOW - 3_600_000 });
    expect(parseFreshness(parse)).toMatch(/^representative parse from Aug 25$/);
  });
});

describe('ArchetypeRow freshness line', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the freshness of the medoid parse', () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-25T12:00:00Z'));
    renderRow(makeParse({ log_date: '2026-07-12' }));
    expect(screen.getByTestId('archetype-freshness')).toHaveTextContent(
      'representative parse from Jul 12 · 44d old',
    );
  });

  it('includes freshness in the row accessible name', () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-25T12:00:00Z'));
    renderRow(makeParse({ log_date: '2026-07-12' }));

    expect(screen.getByRole('button', { name: /44d old/ })).toBeInTheDocument();
  });

  it('includes freshness in the pooled best-parse row accessible name', () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-25T12:00:00Z'));
    renderRow(
      makeParse({ log_date: '2026-07-12' }),
      makeParse({ amount: 112_000, trial_id: 'DSR' }),
    );

    expect(screen.getByRole('button', { name: /44d old/ })).toBeInTheDocument();
  });

  it('omits the line entirely when there is no timestamp to show', () => {
    renderRow(makeParse());
    expect(screen.queryByTestId('archetype-freshness')).not.toBeInTheDocument();
  });
});

describe('ArchetypeRow pooled headline', () => {
  /**
   * Pooled class view: cluster.dps holds ceiling fractions, so the HEADLINE is
   * the cluster's best raw parse anchored to its trial ("112k @ DSR") — the
   * number players actually use. Percent-of-ceiling demotes to secondary text.
   */
  it('headlines the best raw parse with its trial anchor', () => {
    renderRow(undefined, makeParse({ amount: 112_000, trial_id: 'DSR' }), {
      dps: { ...CLUSTER.dps, median: 0.91 },
      size: 41,
    });
    expect(screen.getByText('112k')).toBeInTheDocument();
    expect(screen.getByText('@DSR')).toBeInTheDocument();
    expect(screen.getByText(/9\/14 boards/)).toBeInTheDocument();
    expect(screen.queryByText(/91%/)).not.toBeInTheDocument();
  });

  it('describes pooled board coverage without implying a fixed top-25 cap', () => {
    renderRow(undefined, makeParse({ amount: 112_000, trial_id: 'DSR' }), {
      dps: { ...CLUSTER.dps, median: 0.91 },
      size: 41,
    });

    const row = screen.getByRole('button', { name: /Deadly Strike/ });
    expect(row).toHaveAccessibleName(/sampled top-ranked on 9 of 14 boards/);
    expect(row).not.toHaveAccessibleName(/sampled top-25/);
  });

  it('falls back to absolute median DPS when no best parse exists', () => {
    renderRow();
    expect(screen.getByText('100k')).toBeInTheDocument();
  });

  it('does not present normalized pooled values as DPS when raw evidence is missing', () => {
    renderRow(
      undefined,
      undefined,
      { dps: { ...CLUSTER.dps, median: 0.91 }, size: 41 },
      false,
      true,
    );

    const row = screen.getByRole('button', { name: /Deadly Strike/ });
    expect(row).toHaveTextContent('41 parses');
    expect(row).toHaveTextContent('—');
    expect(row).not.toHaveTextContent(/91%|DPS unavailable/);
    expect(row).toHaveAccessibleName(/DPS unavailable.*41 parses/);
    expect(row).not.toHaveAccessibleName(/typical damage/);
  });

  it('suppresses board coverage for thin pooled observations', () => {
    renderRow(
      undefined,
      makeParse({ amount: 112_000, trial_id: 'DSR' }),
      { dps: { ...CLUSTER.dps, median: 0.91 }, size: 1 },
      false,
      true,
      true,
    );

    const row = screen.getByRole('button', { name: /Deadly Strike/ });
    expect(row).toHaveTextContent('112k');
    expect(row).toHaveTextContent('1 parse');
    expect(row).not.toHaveTextContent(/9\/14 boards/);
    expect(row).not.toHaveAccessibleName(/sampled top-ranked on/);
  });

  it('does not leave empty anchor grammar in pooled accessible names', () => {
    renderRow(undefined, makeParse({ amount: 112_000 }), undefined, false, true);

    const row = screen.getByRole('button', { name: /Deadly Strike/ });
    expect(row).toHaveAccessibleName(/sampled high 112k DPS/);
    expect(row).not.toHaveAccessibleName(/on\s*,/);
    expect(row).not.toHaveTextContent(/@/);
  });
});
