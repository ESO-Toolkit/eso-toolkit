import { fireEvent, render, screen } from '@testing-library/react';

import type { RotationAnalysis } from './RotationAnalysisPanel';
import { RotationAnalysisPanelView } from './RotationAnalysisPanelView';

const analysis = (overrides: Partial<RotationAnalysis> = {}): RotationAnalysis => ({
  playerId: '1',
  playerName: 'Player One',
  abilities: [],
  averageAPM: null,
  resourceEfficiency: {
    magicka: { averageLevel: null, lowestPoint: null, wastePercentage: null },
    stamina: { averageLevel: null, lowestPoint: null, wastePercentage: null },
  },
  dataState: 'partial',
  rotationPattern: [],
  skillPriorities: [],
  spammableSkills: [],
  generalRotation: { commonSequences: [], openerSequence: [], fillerAbilities: [] },
  ...overrides,
});

describe('RotationAnalysisPanelView', () => {
  it('labels unavailable metrics as unscored rather than displaying fabricated grades', async () => {
    render(
      <RotationAnalysisPanelView
        rotationAnalyses={[analysis()]}
        dataState="partial"
        dataMessage="Rotation analysis is partial. Unavailable measurements are not scored."
        fight={{ startTime: 0, endTime: 60_000 }}
      />,
    );

    expect(screen.getByText('APM unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('Resource data unavailable')).toHaveLength(2);
    expect(screen.getByText('Partial data')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/not scored/i);
    fireEvent.mouseOver(screen.getByText('APM unavailable'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/not scored/i);
  });

  it('renders real zero measurements as zero, not unavailable', () => {
    render(
      <RotationAnalysisPanelView
        rotationAnalyses={[
          analysis({
            averageAPM: 0,
            dataState: 'ready',
            resourceEfficiency: {
              magicka: { averageLevel: 0, lowestPoint: 0, wastePercentage: 0 },
              stamina: { averageLevel: 0, lowestPoint: 0, wastePercentage: 0 },
            },
          }),
        ]}
        fight={{ startTime: 0, endTime: 60_000 }}
      />,
    );

    expect(screen.getByText('0.0 APM')).toBeInTheDocument();
    expect(screen.getAllByText(/Magicka Average: 0.0%|Stamina Average: 0.0%/)).toHaveLength(2);
    expect(screen.queryByText('APM unavailable')).not.toBeInTheDocument();
  });
});
