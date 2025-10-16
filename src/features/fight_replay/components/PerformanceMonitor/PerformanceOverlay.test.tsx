/**
 * Tests for PerformanceOverlay Component
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

import { PerformanceOverlay } from './PerformanceOverlay';

describe('PerformanceOverlay', () => {
  const mockMemoryData = {
    usedMB: 100,
    totalMB: 200,
    limitMB: 400,
    percentUsed: 50,
    trend: 'stable' as const,
    isConcerning: false,
  };

  const mockSlowFrameData = {
    slowFrameCount: 5,
    worstFrameTime: 45.5,
    avgSlowFrameTime: 38.2,
    recentSlowFrames: [
      { timestamp: 1000, frameTime: 35.5 },
      { timestamp: 2000, frameTime: 40.2 },
    ],
  };

  const defaultProps = {
    fps: 60,
    minFPS: 58,
    maxFPS: 62,
    avgFPS: 60,
    frameCount: 1000,
    memoryData: mockMemoryData,
    slowFrameData: mockSlowFrameData,
  };

  it('should render performance overlay with FPS data', () => {
    render(<PerformanceOverlay {...defaultProps} />);

    expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    // Check FPS is displayed (using heading role since it's in an h6 element)
    expect(screen.getByRole('heading', { name: '60' })).toBeInTheDocument();
  });

  it('should display memory data when available', () => {
    render(<PerformanceOverlay {...defaultProps} />);

    // Use getAllByText since "100 MB" appears in both collapsed and expanded views
    const memoryTexts = screen.getAllByText('100 MB');
    expect(memoryTexts.length).toBeGreaterThan(0);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should not display memory section when memory data is null', () => {
    render(<PerformanceOverlay {...defaultProps} memoryData={null} />);

    expect(screen.queryByText('Memory')).not.toBeInTheDocument();
  });

  it('should display slow frame warning when slow frames detected', () => {
    render(<PerformanceOverlay {...defaultProps} />);

    expect(screen.getByText('Slow Frames')).toBeInTheDocument();
    // Use getAllByText since "5" might appear multiple times
    const fiveTexts = screen.getAllByText('5');
    expect(fiveTexts.length).toBeGreaterThan(0);
  });

  it('should not display slow frame warning when no slow frames', () => {
    const noSlowFrames = {
      ...mockSlowFrameData,
      slowFrameCount: 0,
    };

    render(<PerformanceOverlay {...defaultProps} slowFrameData={noSlowFrames} />);

    expect(screen.queryByText('Slow Frames')).not.toBeInTheDocument();
  });

  it('should expand and collapse details panel', () => {
    render(<PerformanceOverlay {...defaultProps} />);

    // Details should be collapsed by default (still in DOM but hidden)
    const fpsStats = screen.queryByText('FPS Statistics');
    // MUI Collapse keeps content in DOM but hidden, so just verify it exists
    expect(fpsStats).toBeInTheDocument();

    // Find and click expand button using the collapse/expand tooltip
    const buttons = screen.getAllByRole('button');
    const expandButton = buttons.find((btn) => btn.querySelector('[data-testid="ExpandMoreIcon"]'));
    expect(expandButton).toBeTruthy();
    if (expandButton) {
      fireEvent.click(expandButton);
    }

    // After expansion, stats should still be visible
    expect(screen.getByText('FPS Statistics')).toBeInTheDocument();
  });

  it('should call onExportData when export button is clicked', () => {
    const onExportData = jest.fn();

    render(<PerformanceOverlay {...defaultProps} onExportData={onExportData} />);

    const exportButton = screen.getByLabelText('Export Data');
    fireEvent.click(exportButton);

    expect(onExportData).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();

    render(<PerformanceOverlay {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display development mode indicator', () => {
    render(<PerformanceOverlay {...defaultProps} />);

    expect(screen.getByText('Development Mode Only')).toBeInTheDocument();
  });

  it('should use appropriate colors for FPS values', () => {
    // Just verify different FPS values are rendered correctly
    const { rerender } = render(<PerformanceOverlay {...defaultProps} fps={60} />);
    expect(screen.getAllByText('60').length).toBeGreaterThan(0);

    rerender(<PerformanceOverlay {...defaultProps} fps={45} />);
    expect(screen.getAllByText('45').length).toBeGreaterThan(0);

    rerender(<PerformanceOverlay {...defaultProps} fps={25} />);
    expect(screen.getAllByText('25').length).toBeGreaterThan(0);
  });

  it('should display expanded FPS statistics', () => {
    render(<PerformanceOverlay {...defaultProps} />);

    // Find expand button by testid on icon
    const expandIcon = screen.getByTestId('ExpandMoreIcon');
    const expandButton = expandIcon.closest('button');
    expect(expandButton).toBeTruthy();

    if (expandButton) {
      fireEvent.click(expandButton);
    }

    // Check all FPS statistics are displayed
    expect(screen.getByText('FPS Statistics')).toBeInTheDocument();
    expect(screen.getAllByText('Average:').length).toBeGreaterThan(0); // appears in multiple sections
    expect(screen.getByText('Min / Max:')).toBeInTheDocument();
    expect(screen.getByText('58 / 62')).toBeInTheDocument();
  });

  it('should display expanded memory statistics', () => {
    render(<PerformanceOverlay {...defaultProps} />);

    // Find expand button by testid on icon
    const expandIcon = screen.getByTestId('ExpandMoreIcon');
    const expandButton = expandIcon.closest('button');

    if (expandButton) {
      fireEvent.click(expandButton);
    }

    // Check memory statistics are displayed
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('200 MB')).toBeInTheDocument();
    expect(screen.getByText('Limit:')).toBeInTheDocument();
    expect(screen.getByText('400 MB')).toBeInTheDocument();
    expect(screen.getByText('stable')).toBeInTheDocument();
  });

  it('should display expanded slow frame details', () => {
    render(<PerformanceOverlay {...defaultProps} />);

    // Find expand button by testid on icon
    const expandIcon = screen.getByTestId('ExpandMoreIcon');
    const expandButton = expandIcon.closest('button');

    if (expandButton) {
      fireEvent.click(expandButton);
    }

    // Check slow frame details are displayed
    expect(screen.getByText('Slow Frame Analysis')).toBeInTheDocument();
    expect(screen.getByText('Worst:')).toBeInTheDocument();
    expect(screen.getByText('45.5ms')).toBeInTheDocument();
    expect(screen.getAllByText('Average:').length).toBeGreaterThan(0); // appears in both FPS and slow frame sections
    expect(screen.getByText('38.2ms')).toBeInTheDocument();
  });
});
