import { MorMarker } from '@/types/mapMarkers';

export type MarkerFormat = 'elms' | 'mor';

type MarkerSource = 'imported' | 'manual';

export interface ReplayMarker extends MorMarker {
  id: string;
  /** Origin of the marker to help with future workflows */
  source: MarkerSource;
}

export interface MapMarkersState {
  format: MarkerFormat;
  zoneId: number;
  markers: ReplayMarker[];
  /** Preserve the original encoded string when markers were loaded */
  originalEncodedString?: string;
}
