import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { BuildCluster } from '../../types/clustering.types';
import { BuildInspector } from '../BuildInspector';

jest.mock('../../hooks/useRepresentativeBuild', () => ({
  useRepresentativeBuild: () => ({ build: null, loading: false, error: null }),
}));

const theme = createTheme();

const CLUSTER: BuildCluster = {
  id: 'cluster-1',
  label: 'Deadly Strike Arcanist',
  esoClass: 'Arcanist',
  size: 1,
  share: 1,
  memberParseIds: ['parse-1'],
  medoidParseId: 'parse-1',
  dps: {
    min: 100_000,
    q1: 100_000,
    median: 100_000,
    q3: 100_000,
    p90: 100_000,
    max: 100_000,
    mean: 100_000,
    count: 1,
  },
  core: [],
  flex: [],
  variations: [],
  cohesion: 0,
};

function renderInspector(
  onViewSourceLog: (cluster: BuildCluster) => void,
  evidenceOpen = false,
  onToggleEvidence = jest.fn(),
  options: {
    recommended?: boolean;
    pooled?: boolean;
    ungrouped?: boolean;
    totalParses?: number;
    coveredBosses?: number;
    availableBosses?: number;
  } = {},
) {
  return render(
    <ThemeProvider theme={theme}>
      <BuildInspector
        cluster={CLUSTER}
        label={CLUSTER.label}
        totalParses={options.totalParses ?? 1}
        recommended={options.recommended ?? true}
        evidenceOpen={evidenceOpen}
        onToggleEvidence={onToggleEvidence}
        onViewSourceLog={onViewSourceLog}
        pooled={options.pooled}
        ungrouped={options.ungrouped}
        coveredBosses={options.coveredBosses}
        availableBosses={options.availableBosses}
      />
    </ThemeProvider>,
  );
}

describe('BuildInspector', () => {
  it('does not claim representative parse navigation opens a new tab', async () => {
    const user = userEvent.setup();
    const onViewSourceLog = jest.fn();
    renderInspector(onViewSourceLog);

    const actionsButton = screen.getByRole('button', { name: 'More build actions' });
    expect(actionsButton).toHaveAttribute('aria-controls', 'build-actions-menu-cluster-1');
    await user.click(actionsButton);

    expect(actionsButton).toHaveAttribute('aria-controls', 'build-actions-menu-cluster-1');
    expect(screen.getByRole('menu')).toHaveAttribute('id', 'build-actions-menu-cluster-1');

    const representativeParseAction = screen.getByRole('menuitem', {
      name: 'Open representative parse',
    });
    expect(representativeParseAction).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /Open representative parse.*new tab/i }),
    ).not.toBeInTheDocument();

    await user.click(representativeParseAction);

    expect(onViewSourceLog).toHaveBeenCalledWith(CLUSTER);
  });

  it('connects the evidence trigger to its dialog with stable ids', () => {
    renderInspector(jest.fn(), true);

    const evidenceButton = screen.getByRole('button', {
      name: 'Show build evidence',
      hidden: true,
    });
    const evidenceDialog = screen.getByRole('dialog');

    expect(evidenceButton).toHaveAttribute('aria-controls', 'build-evidence-dialog-cluster-1');
    expect(evidenceDialog).toHaveAttribute('id', 'build-evidence-dialog-cluster-1');
  });

  it('treats an ungrouped parse as an observation even when pooled flags are passed', () => {
    renderInspector(jest.fn(), false, undefined, {
      pooled: true,
      ungrouped: true,
      totalParses: 1,
      coveredBosses: 1,
      availableBosses: 1,
    });

    expect(screen.getByText('Observed build')).toBeInTheDocument();
    expect(screen.queryByText('Recommended starting point')).not.toBeInTheDocument();
    expect(screen.queryByTestId('start-here-card')).not.toBeInTheDocument();
    expect(screen.queryByText(/common pattern in this sampled/i)).not.toBeInTheDocument();
    expect(screen.getByText('Recorded parses')).toBeInTheDocument();
    expect(screen.getByText('No frequency estimate')).toBeInTheDocument();
    expect(screen.queryByText(/% of this selection/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Sampled board coverage')).not.toBeInTheDocument();
  });

  it('does not show cluster frequency evidence for an ungrouped build', () => {
    renderInspector(jest.fn(), true, undefined, { ungrouped: true });

    expect(screen.getByTestId('ungrouped-evidence-note')).toBeInTheDocument();
    expect(screen.queryByText('What this archetype has in common')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Gear pattern frequency' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Skill pattern frequency' }),
    ).not.toBeInTheDocument();
  });

  it('keeps pooled frequency wording when clustering evidence exists', () => {
    renderInspector(jest.fn(), false, undefined, {
      pooled: true,
      totalParses: 12,
      coveredBosses: 3,
      availableBosses: 4,
    });

    expect(
      screen.getByText('A common pattern in this sampled top-ranked parse pool.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sampled board coverage')).toBeInTheDocument();
    expect(screen.queryByText('No frequency estimate')).not.toBeInTheDocument();
  });
});
