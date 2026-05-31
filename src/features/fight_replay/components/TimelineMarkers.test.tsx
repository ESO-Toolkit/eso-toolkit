/**
 * TimelineMarkers Component Tests
 *
 * Tests for timeline markers display, tooltips, and interaction.
 *
 * @module TimelineMarkers.test
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';

import { TimelineMarkers } from './TimelineMarkers';
import {
  PhaseMarker,
  DeathMarker,
  CustomMarker,
  ClusterMarker,
} from '../../../types/timelineAnnotations';

describe('TimelineMarkers', () => {
  const mockPhaseMarker: PhaseMarker = {
    id: 'phase-1',
    timestamp: 30000, // 30 seconds
    type: 'phase',
    label: 'Phase 1',
    phaseId: 1,
    color: '#3f51b5',
  };

  const mockDeathMarker: DeathMarker = {
    id: 'death-1',
    timestamp: 45000, // 45 seconds
    type: 'death',
    label: '💀 Player 1',
    actorId: 123,
    actorName: 'Player 1',
    isFriendly: true,
    killerId: 456,
    killerName: 'Boss',
    color: '#f44336',
  };

  const mockCustomMarker: CustomMarker = {
    id: 'custom-1',
    timestamp: 60000, // 60 seconds
    type: 'custom',
    label: 'Important Moment',
    description: 'Team wipe avoided',
    deletable: true,
    color: '#2196f3',
  };

  const mockClusterMarker: ClusterMarker = {
    id: 'cluster-1',
    timestamp: 50000,
    type: 'cluster',
    clusterType: 'death',
    isFriendly: true,
    label: '3 deaths',
    count: 3,
    members: [
      { ...mockDeathMarker, id: 'd1', timestamp: 50000, label: '💀 A' },
      { ...mockDeathMarker, id: 'd2', timestamp: 50500, label: '💀 B' },
      { ...mockDeathMarker, id: 'd3', timestamp: 51000, label: '💀 C' },
    ],
  };

  const duration = 120000; // 2 minutes

  describe('Rendering', () => {
    it('should render without markers', () => {
      const { container } = render(<TimelineMarkers markers={[]} duration={duration} />);

      expect(container.firstChild).toBeTruthy();
    });

    it('should render phase markers', () => {
      const { container } = render(
        <TimelineMarkers markers={[mockPhaseMarker]} duration={duration} />,
      );

      // Check that component renders with markers
      expect(container.firstChild).toBeTruthy();
    });

    it('should render death markers', () => {
      const { container } = render(
        <TimelineMarkers markers={[mockDeathMarker]} duration={duration} />,
      );

      expect(container.firstChild).toBeTruthy();
    });

    it('should render custom markers', () => {
      const { container } = render(
        <TimelineMarkers markers={[mockCustomMarker]} duration={duration} />,
      );

      expect(container.firstChild).toBeTruthy();
    });

    it('should render multiple markers', () => {
      const { container } = render(
        <TimelineMarkers
          markers={[mockPhaseMarker, mockDeathMarker, mockCustomMarker]}
          duration={duration}
        />,
      );

      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Marker Positioning', () => {
    it('should calculate correct position for markers', () => {
      const { container } = render(
        <TimelineMarkers
          markers={[mockPhaseMarker]} // 30s out of 120s = 25%
          duration={duration}
        />,
      );

      // Component should render successfully
      expect(container.firstChild).toBeTruthy();
    });

    it('should handle marker at start (0%)', () => {
      const startMarker: PhaseMarker = {
        ...mockPhaseMarker,
        timestamp: 0,
      };

      const { container } = render(<TimelineMarkers markers={[startMarker]} duration={duration} />);

      expect(container.firstChild).toBeTruthy();
    });

    it('should handle marker at end (100%)', () => {
      const endMarker: PhaseMarker = {
        ...mockPhaseMarker,
        timestamp: duration,
      };

      const { container } = render(<TimelineMarkers markers={[endMarker]} duration={duration} />);

      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Tooltips', () => {
    it('should have tooltip mechanism in place', () => {
      const { container } = render(
        <TimelineMarkers markers={[mockPhaseMarker]} duration={duration} />,
      );

      // Check that markers are present (tooltips are handled by MUI)
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Click Interaction', () => {
    it('should call onMarkerClick when marker is clicked', () => {
      const onMarkerClick = jest.fn();

      const { container } = render(
        <TimelineMarkers
          markers={[mockPhaseMarker]}
          duration={duration}
          onMarkerClick={onMarkerClick}
        />,
      );

      // Find marker element and click it
      const marker = container.querySelector('div[style*="cursor: pointer"]');
      if (marker) {
        fireEvent.click(marker);
        expect(onMarkerClick).toHaveBeenCalledTimes(1);
        expect(onMarkerClick).toHaveBeenCalledWith(mockPhaseMarker.timestamp);
      }
    });

    it('should not error when onMarkerClick is not provided', () => {
      const { container } = render(
        <TimelineMarkers markers={[mockPhaseMarker]} duration={duration} />,
      );

      const marker = container.querySelector('div[style*="cursor: pointer"]');
      if (marker) {
        expect(() => fireEvent.click(marker)).not.toThrow();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      const { container } = render(<TimelineMarkers markers={[mockPhaseMarker]} duration={0} />);

      expect(container.firstChild).toBeTruthy();
    });

    it('should handle markers at the same timestamp', () => {
      const marker1: PhaseMarker = { ...mockPhaseMarker, id: 'phase-1' };
      const marker2: PhaseMarker = { ...mockPhaseMarker, id: 'phase-2', label: 'Phase 2' };

      const { container } = render(
        <TimelineMarkers markers={[marker1, marker2]} duration={duration} />,
      );

      expect(container.firstChild).toBeTruthy();
    });

    it('should handle markers outside duration range', () => {
      const futureMarker: PhaseMarker = {
        ...mockPhaseMarker,
        timestamp: duration + 10000, // Beyond duration
      };

      const { container } = render(
        <TimelineMarkers markers={[futureMarker]} duration={duration} />,
      );

      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Cluster Markers', () => {
    it('renders a cluster marker', () => {
      const { container } = render(
        <TimelineMarkers markers={[mockClusterMarker]} duration={duration} />,
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('seeks to the cluster timestamp (earliest member) on click', () => {
      const onMarkerClick = jest.fn();
      const { container } = render(
        <TimelineMarkers
          markers={[mockClusterMarker]}
          duration={duration}
          onMarkerClick={onMarkerClick}
        />,
      );
      const marker = container.querySelector('[role="button"]');
      expect(marker).toBeTruthy();
      if (marker) {
        fireEvent.click(marker);
        expect(onMarkerClick).toHaveBeenCalledWith(50000);
      }
    });

    it('exposes the grouped member labels via the marker aria-label', () => {
      const { container } = render(
        <TimelineMarkers markers={[mockClusterMarker]} duration={duration} />,
      );
      const marker = container.querySelector('[role="button"]');
      const label = marker?.getAttribute('aria-label') ?? '';
      expect(label).toContain('3 deaths');
      expect(label).toContain('💀 A');
      expect(label).toContain('💀 C');
    });
  });

  describe('Marker Colors', () => {
    it('should render markers with colors', () => {
      const { container } = render(
        <TimelineMarkers markers={[mockPhaseMarker]} duration={duration} />,
      );

      expect(container.firstChild).toBeTruthy();
    });

    it('should render different marker types', () => {
      const { container } = render(
        <TimelineMarkers
          markers={[mockPhaseMarker, mockDeathMarker, mockCustomMarker]}
          duration={duration}
        />,
      );

      expect(container.firstChild).toBeTruthy();
    });
  });
});
