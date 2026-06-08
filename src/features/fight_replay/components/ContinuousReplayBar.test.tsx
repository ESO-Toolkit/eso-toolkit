import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { buildTrialTimeline } from '../trial_chapters/trialTimeline';
import type { TrialChapter } from '../trial_chapters/types';

import { ContinuousReplayBar } from './ContinuousReplayBar';

const seg = (overrides: Partial<TrialChapter>): TrialChapter => ({
  fightId: '1',
  fightNumericId: 1,
  name: 'Seg',
  kind: 'boss',
  trialName: 'Rockgrove',
  difficulty: 121,
  difficultyLabel: 'Veteran',
  isKill: true,
  isWipe: false,
  bossPercentage: 0,
  startTime: 0,
  endTime: 0,
  durationMs: 60000,
  index: 0,
  bossIndex: 0,
  attempt: 1,
  ...overrides,
});

const segments = [
  seg({ fightId: 'a', name: 'Oaxiltso', index: 0, bossIndex: 0 }),
  seg({ fightId: 't', name: 'Trash', kind: 'trash', index: 1, bossIndex: -1, durationMs: 20000 }),
  seg({ fightId: 'b', name: 'Xalvakka', index: 2, bossIndex: 1, durationMs: 100000 }),
];
const timeline = buildTrialTimeline(segments, true);

const baseProps = {
  timeline,
  currentFightId: 'a',
  currentLocalMs: 0,
  onSeek: jest.fn(),
  continuousEnabled: false,
  onToggleContinuous: jest.fn(),
  includeTrash: true,
  onToggleIncludeTrash: jest.fn(),
  hasTrash: true,
  runName: 'Rockgrove',
  runIndex: 0,
  runCount: 1,
  nextUpLabel: 'Xalvakka',
};

describe('ContinuousReplayBar', () => {
  it('renders the play-trial toggle and trash switch', () => {
    render(<ContinuousReplayBar {...baseProps} />);
    expect(screen.getByRole('button', { name: /play whole trial/i })).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: /include trash in continuous play/i }),
    ).toBeInTheDocument();
  });

  it('reflects the enabled state on the toggle and fires the handler', () => {
    const onToggleContinuous = jest.fn();
    render(
      <ContinuousReplayBar
        {...baseProps}
        continuousEnabled
        onToggleContinuous={onToggleContinuous}
      />,
    );
    const toggle = screen.getByRole('button', { name: /play whole trial/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(onToggleContinuous).toHaveBeenCalled();
  });

  it('shows the "up next" hint only while continuous is enabled', () => {
    const { rerender } = render(<ContinuousReplayBar {...baseProps} continuousEnabled={false} />);
    expect(screen.queryByText(/up next/i)).not.toBeInTheDocument();
    rerender(<ContinuousReplayBar {...baseProps} continuousEnabled />);
    const upNext = screen.getByText(/up next/i);
    expect(upNext).toBeInTheDocument();
    expect(upNext).toHaveTextContent('Xalvakka');
  });

  it('hides the trash switch when the run has no trash', () => {
    render(<ContinuousReplayBar {...baseProps} hasTrash={false} />);
    expect(
      screen.queryByRole('switch', { name: /include trash in continuous play/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a run indicator with position for multi-run logs', () => {
    render(<ContinuousReplayBar {...baseProps} runCount={2} runIndex={0} />);
    expect(screen.getByText(/Rockgrove · 1\/2/)).toBeInTheDocument();
  });

  it('renders nothing for an empty timeline', () => {
    const { container } = render(
      <ContinuousReplayBar {...baseProps} timeline={buildTrialTimeline([], true)} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
