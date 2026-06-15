import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { MobileReplayDock } from './MobileReplayDock';

// The dock pulls in redux selectors and several heavy leaf components; stub them so the test
// focuses on the dock's own wiring (here: the Settings-sheet Markers section added so marker
// editing is reachable inside the mobile immersive overlay).
jest.mock('../../../../hooks/useOptimizedTimelineScrubbing', () => ({
  useOptimizedTimelineScrubbing: (): {
    displayTime: number;
    isDragging: boolean;
    isScrubbingMode: boolean;
    handleSliderChange: () => void;
    handleSliderChangeStart: () => void;
    handleSliderChangeEnd: () => void;
    optimizedStep: number;
  } => ({
    displayTime: 0,
    isDragging: false,
    isScrubbingMode: false,
    handleSliderChange: (): void => undefined,
    handleSliderChangeStart: (): void => undefined,
    handleSliderChangeEnd: (): void => undefined,
    optimizedStep: 1,
  }),
}));
jest.mock('../../../../hooks/useTimelineMarkers', () => ({
  useTimelineMarkers: (): { markers: [] } => ({ markers: [] }),
}));
jest.mock('../TimelineSlider', () => ({ TimelineSlider: (): React.ReactNode => null }));
jest.mock('../PlaybackButtons', () => ({ PlaybackButtons: (): React.ReactNode => null }));
jest.mock('../ShareButton', () => ({ ShareButton: (): React.ReactNode => null }));
jest.mock('../ChapterList', () => ({ ChapterList: (): React.ReactNode => null }));
jest.mock('../TrialTimeline', () => ({ TrialTimeline: (): React.ReactNode => null }));
jest.mock('./MobileSheet', () => ({
  MobileSheet: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }): React.ReactNode => (open ? <div role="dialog">{children}</div> : null),
}));

const noop = (): void => undefined;

type DockProps = React.ComponentProps<typeof MobileReplayDock>;

function renderDock(overrides: Partial<DockProps> = {}): void {
  const props: DockProps = {
    currentTime: 0,
    duration: 10000,
    isPlaying: false,
    playbackSpeed: 1,
    onTimeChange: noop,
    onPlayPause: noop,
    onSpeedChange: noop,
    onSkipToStart: noop,
    onSkipToEnd: noop,
    onSkipBackward10: noop,
    onSkipForward10: noop,
    playersOpen: false,
    onTogglePlayers: noop,
    showTrails: false,
    onToggleTrails: noop,
    namesEnabled: false,
    onToggleNames: noop,
    performanceMode: false,
    onTogglePerformance: noop,
    statsPanelEnabled: false,
    onToggleStats: noop,
    following: false,
    ...overrides,
  };
  render(<MobileReplayDock {...props} />);
}

function openSettings(): void {
  fireEvent.click(screen.getByLabelText('Settings'));
}

describe('MobileReplayDock — Markers section', () => {
  it('hides the Markers section when no marker toggle is wired', () => {
    renderDock();
    openSettings();
    expect(screen.queryByLabelText('Edit markers')).not.toBeInTheDocument();
  });

  it('surfaces an Edit markers toggle that calls the handler', () => {
    const onToggleMarkersEditMode = jest.fn();
    renderDock({ onToggleMarkersEditMode });
    openSettings();

    fireEvent.click(screen.getByLabelText('Edit markers'));
    expect(onToggleMarkersEditMode).toHaveBeenCalledTimes(1);
  });

  it('hides the marker actions until edit mode is on', () => {
    renderDock({ onToggleMarkersEditMode: noop, markersEditMode: false });
    openSettings();
    expect(screen.queryByLabelText('Add here')).not.toBeInTheDocument();
  });

  it('shows Add / Undo / Redo while editing and routes each to its handler', () => {
    const onAddMarkerAtCenter = jest.fn();
    const onUndoMarkers = jest.fn();
    const onRedoMarkers = jest.fn();
    renderDock({
      onToggleMarkersEditMode: noop,
      markersEditMode: true,
      onAddMarkerAtCenter,
      onUndoMarkers,
      onRedoMarkers,
      canUndoMarkers: true,
      canRedoMarkers: true,
    });
    openSettings();

    // Undo/Redo keep the sheet open for repeated tweaks; "Add here" closes it (the icon picker
    // opens over the arena), so click it last or it would unmount the others mid-test.
    fireEvent.click(screen.getByLabelText('Undo'));
    fireEvent.click(screen.getByLabelText('Redo'));
    fireEvent.click(screen.getByLabelText('Add here'));

    expect(onUndoMarkers).toHaveBeenCalledTimes(1);
    expect(onRedoMarkers).toHaveBeenCalledTimes(1);
    expect(onAddMarkerAtCenter).toHaveBeenCalledTimes(1);

    // "Add here" dismisses the Settings sheet so the placement picker isn't hidden behind it.
    expect(screen.queryByLabelText('Add here')).not.toBeInTheDocument();
  });

  it('disables Undo / Redo when there is no history to traverse', () => {
    renderDock({
      onToggleMarkersEditMode: noop,
      markersEditMode: true,
      onAddMarkerAtCenter: noop,
      onUndoMarkers: noop,
      onRedoMarkers: noop,
      canUndoMarkers: false,
      canRedoMarkers: false,
    });
    openSettings();

    expect(screen.getByLabelText('Undo')).toBeDisabled();
    expect(screen.getByLabelText('Redo')).toBeDisabled();
  });
});
