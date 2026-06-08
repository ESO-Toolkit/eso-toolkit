import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// jsdom doesn't carry clientX through fireEvent's synthetic PointerEvents, so dispatch real
// MouseEvents (React maps the pointer* type to its onPointer* handler) with a concrete clientX.
function pointer(el: Element, type: 'pointerdown' | 'pointerup', clientX: number): void {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX }));
}

function withRail(el: HTMLElement, left: number, width: number): void {
  el.getBoundingClientRect = () =>
    ({
      left,
      width,
      top: 0,
      height: 20,
      right: left + width,
      bottom: 20,
      x: left,
      y: 0,
    }) as DOMRect;
}

import { buildTrialTimeline } from '../trial_chapters/trialTimeline';
import type { TrialChapter } from '../trial_chapters/types';

import { TrialTimeline } from './TrialTimeline';

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
  durationMs: 0,
  index: 0,
  bossIndex: 0,
  attempt: 1,
  ...overrides,
});

const timeline = buildTrialTimeline(
  [
    seg({ fightId: 'a', name: 'Oaxiltso', durationMs: 60000, index: 0, bossIndex: 0 }),
    seg({ fightId: 't', name: 'Trash', kind: 'trash', durationMs: 20000, index: 1, bossIndex: -1 }),
    seg({ fightId: 'b', name: 'Xalvakka', durationMs: 100000, index: 2, bossIndex: 1 }),
  ],
  true,
);

describe('TrialTimeline', () => {
  it('exposes a slider spanning the whole run', () => {
    render(
      <TrialTimeline
        timeline={timeline}
        currentFightId="a"
        currentLocalMs={0}
        onSeek={jest.fn()}
      />,
    );
    const slider = screen.getByRole('slider', { name: /trial timeline/i });
    expect(slider).toHaveAttribute('aria-valuemax', '180000');
  });

  it('renders nothing for an empty timeline', () => {
    const { container } = render(
      <TrialTimeline
        timeline={buildTrialTimeline([], true)}
        currentFightId={undefined}
        currentLocalMs={0}
        onSeek={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('End key seeks to the final frame of the last segment', () => {
    const onSeek = jest.fn();
    render(
      <TrialTimeline timeline={timeline} currentFightId="a" currentLocalMs={0} onSeek={onSeek} />,
    );
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });
    expect(onSeek).toHaveBeenCalledWith({ fightId: 'b', localMs: 100000, sameFight: false });
  });

  it('Home key seeks to the start of the first segment', () => {
    const onSeek = jest.fn();
    render(
      <TrialTimeline
        timeline={timeline}
        currentFightId="b"
        currentLocalMs={5000}
        onSeek={onSeek}
      />,
    );
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'Home' });
    expect(onSeek).toHaveBeenCalledWith({ fightId: 'a', localMs: 0, sameFight: false });
  });

  it('click maps the rail position to the right fight + local offset', () => {
    const onSeek = jest.fn();
    render(
      <TrialTimeline timeline={timeline} currentFightId="a" currentLocalMs={0} onSeek={onSeek} />,
    );
    const slider = screen.getByRole('slider');
    // Make the rail 100px wide at x=0 so clientX maps directly to a fraction.
    withRail(slider, 0, 100);

    // Click at 50% → global 90000ms → into Xalvakka (80000–180000) at 10000ms local.
    pointer(slider, 'pointerdown', 50);
    pointer(slider, 'pointerup', 50);

    expect(onSeek).toHaveBeenCalledWith({ fightId: 'b', localMs: 10000, sameFight: false });
  });

  it('flags a seek that stays within the current fight as sameFight', () => {
    const onSeek = jest.fn();
    render(
      <TrialTimeline timeline={timeline} currentFightId="a" currentLocalMs={0} onSeek={onSeek} />,
    );
    const slider = screen.getByRole('slider');
    withRail(slider, 0, 100);

    // Click at ~16% → global ~28800ms → inside Oaxiltso (0–60000), the current fight.
    pointer(slider, 'pointerdown', 16);
    pointer(slider, 'pointerup', 16);

    expect(onSeek).toHaveBeenCalledWith(expect.objectContaining({ fightId: 'a', sameFight: true }));
  });
});
