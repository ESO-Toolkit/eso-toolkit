import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { TrialChapter } from '../trial_chapters/types';

import { ChapterRail } from './ChapterRail';

const boss = (overrides: Partial<TrialChapter> = {}): TrialChapter => ({
  fightId: '1',
  fightNumericId: 1,
  name: 'Oaxiltso',
  kind: 'boss',
  trialName: 'Rockgrove',
  difficulty: 122,
  difficultyLabel: 'Veteran HM',
  isKill: true,
  isWipe: false,
  bossPercentage: 0,
  startTime: 0,
  endTime: 60000,
  durationMs: 60000,
  index: 0,
  bossIndex: 0,
  attempt: 1,
  ...overrides,
});

const trash = (overrides: Partial<TrialChapter> = {}): TrialChapter =>
  boss({
    kind: 'trash',
    name: 'Trash',
    difficulty: null,
    difficultyLabel: null,
    bossIndex: -1,
    ...overrides,
  });

describe('ChapterRail', () => {
  it('renders a stop per boss with name, status and a boss-progress chip', () => {
    const bosses = [
      boss({ fightId: '1', name: 'Oaxiltso', isKill: true }),
      boss({ fightId: '2', name: 'Xalvakka', isKill: false, isWipe: true, bossPercentage: 35 }),
    ];
    render(
      <ChapterRail
        segments={bosses}
        bossChapters={bosses}
        currentFightId="1"
        trialName="Rockgrove"
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText('Oaxiltso')).toBeInTheDocument();
    expect(screen.getByText('Xalvakka')).toBeInTheDocument();
    expect(screen.getByText('Kill')).toBeInTheDocument();
    expect(screen.getByText('35% left')).toBeInTheDocument();
    expect(screen.getByText('1 / 2 bosses')).toBeInTheDocument();
  });

  it('marks the active stop with aria-current', () => {
    const bosses = [boss({ fightId: '1' }), boss({ fightId: '2', name: 'Xalvakka' })];
    render(
      <ChapterRail
        segments={bosses}
        bossChapters={bosses}
        currentFightId="2"
        onSelect={jest.fn()}
      />,
    );
    const active = screen.getByRole('button', { name: /Xalvakka/ });
    expect(active).toHaveAttribute('aria-current', 'true');
  });

  it('invokes onSelect with the chosen chapter', () => {
    const onSelect = jest.fn();
    const bosses = [boss({ fightId: '1' }), boss({ fightId: '2', name: 'Xalvakka' })];
    render(
      <ChapterRail
        segments={bosses}
        bossChapters={bosses}
        currentFightId="1"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Xalvakka/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ fightId: '2' }));
  });

  it('hides trash by default and reveals it via the toggle', () => {
    const bosses = [boss({ fightId: '1' }), boss({ fightId: '2', name: 'Xalvakka' })];
    const segments = [bosses[0], trash({ fightId: '9', name: 'Add Pack', index: 1 }), bosses[1]];
    render(
      <ChapterRail
        segments={segments}
        bossChapters={bosses}
        currentFightId="1"
        onSelect={jest.fn()}
      />,
    );

    // Trash hidden initially.
    expect(screen.queryByText('Add Pack')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: /show trash/i }));
    expect(screen.getByText('Add Pack')).toBeInTheDocument();
  });

  it('shows no trash toggle when the run has no trash', () => {
    const bosses = [boss({ fightId: '1' })];
    render(
      <ChapterRail
        segments={bosses}
        bossChapters={bosses}
        currentFightId="1"
        onSelect={jest.fn()}
      />,
    );
    expect(screen.queryByRole('switch', { name: /show trash/i })).not.toBeInTheDocument();
  });

  it('renders a trash-only run directly (no boss chip, no toggle)', () => {
    const segments = [
      trash({ fightId: '1', name: 'Pack A', index: 0 }),
      trash({ fightId: '2', name: 'Pack B', index: 1 }),
    ];
    render(
      <ChapterRail
        segments={segments}
        bossChapters={[]}
        currentFightId="1"
        trialName="Some Dungeon"
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('Pack A')).toBeInTheDocument();
    expect(screen.getByText('Pack B')).toBeInTheDocument();
    expect(screen.queryByText(/bosses/)).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /show trash/i })).not.toBeInTheDocument();
  });

  it('renders nothing when there are no stops', () => {
    const { container } = render(
      <ChapterRail
        segments={[]}
        bossChapters={[]}
        currentFightId={undefined}
        onSelect={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the pull number for repeated boss attempts', () => {
    const bosses = [
      boss({ fightId: '1', name: 'Xalvakka', attempt: 1, isKill: false, isWipe: true }),
      boss({ fightId: '2', name: 'Xalvakka', attempt: 2 }),
    ];
    render(
      <ChapterRail
        segments={bosses}
        bossChapters={bosses}
        currentFightId="2"
        onSelect={jest.fn()}
      />,
    );
    const second = screen.getByRole('button', { name: /pull 2/i });
    expect(within(second).getByText(/#2/)).toBeInTheDocument();
  });
});
