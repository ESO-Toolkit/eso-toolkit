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
): void {
  const cluster = { ...CLUSTER, ...clusterOverride };
  render(
    <ThemeProvider theme={theme}>
      <ol>
        <ArchetypeRow
          cluster={cluster}
          label={CLUSTER.label}
          selected={false}
          recommended={false}
          showClassIcon
          medoidParse={medoidParse}
          bestParse={bestParse}
          onSelect={() => {}}
        />
      </ol>
    </ThemeProvider>,
  );
}

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
    expect(parseFreshness(parse)).toBe('parses from Jul 12 · 44d old');
  });

  it('falls back to log_date when log_start_ms is missing', () => {
    const parse = makeParse({ log_date: '2026-07-12' });
    expect(parseFreshness(parse)).toBe('parses from Jul 12 · 44d old');
  });

  it('omits the age suffix for same-day parses', () => {
    const parse = makeParse({ log_start_ms: NOW - 3_600_000 });
    expect(parseFreshness(parse)).toMatch(/^parses from Aug 25$/);
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
      'parses from Jul 12 · 44d old',
    );
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
    expect(screen.getByText(/typically 91%/)).toBeInTheDocument();
    expect(screen.queryByText(/^91%$/)).not.toBeInTheDocument();
  });

  it('falls back to absolute median DPS when no best parse exists', () => {
    renderRow();
    expect(screen.getByText('100k')).toBeInTheDocument();
  });
});
