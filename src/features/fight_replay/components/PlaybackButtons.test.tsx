import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { PlaybackButtons } from './PlaybackButtons';

describe('PlaybackButtons', () => {
  function setup(isPlaying = false) {
    const handlers = {
      onPlayPause: jest.fn(),
      onSkipToStart: jest.fn(),
      onSkipToEnd: jest.fn(),
      onSkipBackward10: jest.fn(),
      onSkipForward10: jest.fn(),
    };
    render(<PlaybackButtons isPlaying={isPlaying} {...handlers} />);
    return handlers;
  }

  it('renders all five labelled playback controls', () => {
    setup();
    expect(screen.getByRole('button', { name: /skip to start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip backward 10 seconds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip forward 10 seconds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip to end/i })).toBeInTheDocument();
  });

  it('labels the main button "Pause" while playing and "Play" while paused', () => {
    const handlers = {
      onPlayPause: jest.fn(),
      onSkipToStart: jest.fn(),
      onSkipToEnd: jest.fn(),
      onSkipBackward10: jest.fn(),
      onSkipForward10: jest.fn(),
    };
    const { rerender } = render(<PlaybackButtons isPlaying={false} {...handlers} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

    rerender(<PlaybackButtons isPlaying={true} {...handlers} />);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('invokes the matching handler when each control is clicked', () => {
    const handlers = setup();
    fireEvent.click(screen.getByRole('button', { name: /skip to start/i }));
    fireEvent.click(screen.getByRole('button', { name: /skip backward 10 seconds/i }));
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    fireEvent.click(screen.getByRole('button', { name: /skip forward 10 seconds/i }));
    fireEvent.click(screen.getByRole('button', { name: /skip to end/i }));

    expect(handlers.onSkipToStart).toHaveBeenCalledTimes(1);
    expect(handlers.onSkipBackward10).toHaveBeenCalledTimes(1);
    expect(handlers.onPlayPause).toHaveBeenCalledTimes(1);
    expect(handlers.onSkipForward10).toHaveBeenCalledTimes(1);
    expect(handlers.onSkipToEnd).toHaveBeenCalledTimes(1);
  });
});
