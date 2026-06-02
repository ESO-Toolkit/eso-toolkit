/**
 * Tests for TimelineScrubPreview — the hover skim-preview bubble on the scrub rail.
 *
 * jsdom reports 0×0 layout, so getBoundingClientRect is stubbed to give the rail a width and
 * let the ratio→time math run.
 */

import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

// jsdom's synthetic PointerEvent drops clientX/clientY, so a fireEvent.pointerMove arrives
// with clientX === undefined. Dispatch a MouseEvent typed 'pointermove' instead — jsdom's
// MouseEvent faithfully carries clientX, which is what the component reads.
const pointerMoveAt = (el: Element, clientX: number) => {
  fireEvent(el, new MouseEvent('pointermove', { clientX, bubbles: true, cancelable: true }));
};
const pointerLeave = (el: Element) => {
  fireEvent(el, new MouseEvent('pointerleave', { bubbles: true, cancelable: true }));
};

import { TimelineScrubPreview } from './TimelineScrubPreview';
import { DeathMarker, PhaseMarker } from '../../../types/timelineAnnotations';

const phase: PhaseMarker = {
  id: 'phase-1',
  timestamp: 30000,
  type: 'phase',
  label: 'Phase 2',
  phaseId: 2,
};

const death: DeathMarker = {
  id: 'death-1',
  timestamp: 60000,
  type: 'death',
  label: '💀 Healer',
  actorId: 1,
  actorName: 'Healer',
  isFriendly: true,
};

/** Mounts the preview over a rail with a stubbed 1000px-wide bounding box. */
const Harness: React.FC<{
  duration: number;
  markers?: (PhaseMarker | DeathMarker)[];
  children?: React.ReactNode;
}> = ({ duration, markers, children }) => {
  const railRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (railRef.current) {
      railRef.current.getBoundingClientRect = () =>
        ({
          left: 0,
          width: 1000,
          top: 0,
          height: 10,
          right: 1000,
          bottom: 10,
          x: 0,
          y: 0,
        }) as DOMRect;
    }
  }, []);
  return (
    <div ref={railRef} data-testid="rail">
      {children}
      <TimelineScrubPreview railRef={railRef} duration={duration} markers={markers} />
    </div>
  );
};

describe('TimelineScrubPreview', () => {
  const duration = 120000; // 2:00

  it('renders nothing until the cursor moves over the rail', () => {
    render(<Harness duration={duration} />);
    expect(screen.queryByText('1:00')).not.toBeInTheDocument();
  });

  it('shows the hovered timecode following the cursor (50% → 1:00)', () => {
    render(<Harness duration={duration} />);
    pointerMoveAt(screen.getByTestId('rail'), 500);
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });

  it('labels the nearest event within the proximity window', () => {
    render(<Harness duration={duration} markers={[phase, death]} />);
    // Hover at 60s (50%) — the death marker sits exactly there.
    pointerMoveAt(screen.getByTestId('rail'), 500);
    expect(screen.getByText('💀 Healer')).toBeInTheDocument();
  });

  it('does not label a far-off event (outside the 5% window)', () => {
    render(<Harness duration={duration} markers={[phase]} />);
    // Hover at 60s; nearest marker is the phase at 30s — 30s away, far beyond 5% (6s).
    pointerMoveAt(screen.getByTestId('rail'), 500);
    expect(screen.queryByText('Phase 2')).not.toBeInTheDocument();
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });

  it('hides the bubble when the cursor leaves the rail', () => {
    render(<Harness duration={duration} />);
    const rail = screen.getByTestId('rail');
    pointerMoveAt(rail, 500);
    expect(screen.getByText('1:00')).toBeInTheDocument();
    pointerLeave(rail);
    expect(screen.queryByText('1:00')).not.toBeInTheDocument();
  });

  it('renders nothing when duration is zero', () => {
    render(<Harness duration={0} />);
    pointerMoveAt(screen.getByTestId('rail'), 500);
    expect(screen.queryByText(/:/)).not.toBeInTheDocument();
  });

  it('suppresses the bubble when the cursor is over an event marker (no double tooltip)', () => {
    render(
      <Harness duration={duration} markers={[death]}>
        <div role="button" data-testid="marker" />
      </Harness>,
    );
    // A pointermove originating ON a marker hit-area must NOT show the skim bubble — the marker
    // has its own richer MUI tooltip, so both would collide.
    const marker = screen.getByTestId('marker');
    fireEvent(marker, new MouseEvent('pointermove', { clientX: 500, bubbles: true }));
    expect(screen.queryByText('1:00')).not.toBeInTheDocument();

    // …but moving over the bare rail (not a marker) still shows the bubble.
    pointerMoveAt(screen.getByTestId('rail'), 500);
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });
});
