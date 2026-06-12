import { Fullscreen, FullscreenExit, LockOpen, Videocam } from '@mui/icons-material';
import Bolt from '@mui/icons-material/Bolt';
import HelpOutline from '@mui/icons-material/HelpOutlineOutlined';
import Insights from '@mui/icons-material/Insights';
import Label from '@mui/icons-material/Label';
import LabelOff from '@mui/icons-material/LabelOff';
import OpenInFull from '@mui/icons-material/OpenInFull';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Collapse,
  Menu,
  MenuItem,
} from '@mui/material';
import { Canvas } from '@react-three/fiber';
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { usePerfTier } from '../../../hooks/usePerfTier';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useReplayPrefs } from '../../../hooks/useReplayPrefs';
import { useActorPositionsTask } from '../../../hooks/workerTasks/useActorPositionsTask';
import { getMapScaleData } from '../../../types/zoneScaleData';
import { Logger, LogLevel } from '../../../utils/logger';
import { MapTimeline } from '../../../utils/mapTimelineUtils';
import { getActorPositionAtClosestTimestamp } from '../../../workers/calculations/CalculateActorPositions';
import { ARENA_HEIGHT } from '../constants/replayDesign';
import { MapMarkersState, ReplayMarker } from '../types/mapMarkers';
import { computeRobustActorFraming } from '../utils/cameraFraming';
import { DEFAULT_ACTOR_SCALE, computeActorScaleFromMapData } from '../utils/mapScaling';
import { getVisiblePlayerIds } from '../utils/pathUtils';
import { decidePreviewMode } from '../utils/previewMode';

import { ADD_MARKER_AT_CENTER_EVENT, Arena3DScene, GroundContextMenuPayload } from './Arena3DScene';
import { BossHealthPanel } from './BossHealthPanel';
import { LockedPlayerStatsPanel } from './LockedPlayerStatsPanel';
import { MarkerContextMenuPayload } from './Marker3D';
import { MarkerIconPicker } from './MarkerIconPicker';
import { MobileReplayControls } from './MobileReplayControls';
import { PerformanceMonitorExternal } from './PerformanceMonitor/PerformanceMonitorExternal';
import { PlayerListPanel } from './PlayerListPanel';
import { ReplayErrorBoundary } from './ReplayErrorBoundary';
import { ReplayZoomHint } from './ReplayZoomHint';

// Create logger instance for Arena3D
const logger = new Logger({
  level: LogLevel.WARN,
  contextPrefix: 'Arena3D',
});

// Stable empty Set for the player-list overlay's selection fallback — avoids a fresh Set
// each render churning the panel.
const EMPTY_SELECTION: Set<number> = new Set();

/**
 * Compute the default (fallback) camera position used whenever actor positions
 * are unavailable. The camera is placed southwest of and above the target.
 * Extracted so the four fallback branches share one implementation.
 */
function computeDefaultCameraPosition(
  target: [number, number, number],
  minDistance: number,
  actorScale: number,
): [number, number, number] {
  const viewDistance = Math.max(30, minDistance * 2.5) * actorScale;
  const [targetX, targetY, targetZ] = target;
  return [targetX - viewDistance * 0.6, targetY + viewDistance * 0.5, targetZ + viewDistance * 0.6];
}

type ContextMenuState =
  | {
      type: 'ground';
      anchor: { left: number; top: number };
      arenaPoint: { x: number; y: number; z: number };
    }
  | {
      type: 'marker';
      anchor: { left: number; top: number };
      markerId: string;
    };

interface Arena3DProps {
  timeRef: React.RefObject<number> | { current: number };
  showActorNames?: boolean;
  mapTimeline?: MapTimeline;
  scrubbingMode?: {
    renderQuality: 'high' | 'medium' | 'low';
    shouldUpdatePositions: boolean;
    shouldRenderEffects: boolean;
    frameSkipRate: number;
  };
  followingActorIdRef: React.RefObject<number | null>;
  /**
   * Currently-followed actor ID as React state (mirrors `followingActorIdRef.current`).
   * Owned by FightReplay3D so the "Following:" chip re-renders when the followed actor
   * changes — without polling the ref.
   */
  followingActorId: number | null;
  onCameraUnlock?: () => void;
  onActorClick?: (actorId: number) => void;
  markersState?: MapMarkersState | null;
  onAddMarker?: (iconKey: number, arenaPoint: { x: number; y: number; z: number }) => void;
  onRemoveMarker?: (markerId: string) => void;
  /** Marker edit mode: plain right-click context menus + draggable markers (no Alt chord). */
  markersEditMode?: boolean;
  /** Toggle marker edit mode — surfaced in the mobile tools sheet (no page toolbar in immersive). */
  onToggleMarkersEditMode?: () => void;
  /** Drag-to-move commit for a marker (arena-space coordinates). */
  onMarkerMove?: (markerId: string, arenaPoint: { x: number; z: number }) => void;
  /** Opens the marker edit dialog (owned by FightReplay) for the given marker. */
  onEditMarker?: (markerId: string) => void;
  /** Marker undo/redo (mobile tools sheet — Ctrl+Z/Ctrl+Shift+Z have no touch equivalent). */
  canUndoMarkers?: boolean;
  onUndoMarkers?: () => void;
  canRedoMarkers?: boolean;
  onRedoMarkers?: () => void;
  /** Fight data for zone/map information (required for map markers coordinate transformation) */
  fight: FightFragment;
  /** Selected player IDs for path visualization */
  selectedPlayerIds?: Set<number>;
  /** Callback when player selection changes */
  onPlayerSelectionChange?: (selectedIds: Set<number>) => void;
  /** Whether to show player paths HUD */
  showPlayerPathsHUD?: boolean;
  /** Whether to show player trail paths */
  showPlayerTrails?: boolean;
  /** Toggle the player-paths HUD (the P key on desktop) — used by the mobile control cluster. */
  onTogglePlayerPathsHUD?: () => void;
  /** Toggle player trails (the T key on desktop) — used by the mobile control cluster. */
  onToggleTrails?: () => void;
  /**
   * Display settings, controlled by FightReplay3D so the mobile shell's Settings sheet shares one
   * source of truth with the in-canvas/desktop toggles. Optional: when omitted (defensive — Arena3D
   * is only rendered by FightReplay3D, which always supplies them) they fall back to internal state.
   * Name tags (N key), performance mode (drop figure shadows), and the locked-player stats panel
   * (J key) respectively.
   */
  namesEnabled?: boolean;
  onToggleNames?: () => void;
  performanceMode?: boolean;
  onTogglePerformance?: () => void;
  statsPanelEnabled?: boolean;
  onToggleStats?: () => void;
  /** True when the replay block is fullscreen/immersive (drives the fill-height layout + toggle icon). */
  isFullscreen?: boolean;
  /** Toggle fullscreen of the whole replay block (owned by FightReplay3D, which holds the target ref). */
  onToggleFullscreen?: () => void;
  /**
   * True when the replay is in its mobile layout (narrow viewport). Combined with `isFullscreen`
   * (which on mobile means the pseudo-fullscreen overlay) this yields the two mobile states:
   *  - mobile preview  = isMobile && !isFullscreen → a scroll-safe, non-interactive teaser.
   *  - mobile immersive = isMobile && isFullscreen → the live interactive overlay.
   * Desktop passes false, so every mobile branch below is dead and the layout is unchanged.
   */
  isMobile?: boolean;
  /**
   * Vertical band (px) reserved at the bottom for the transport bar, forwarded to the overlay
   * panels so their height caps clear the bar. Owned by FightReplay3D (it knows the bar's
   * visibility); when the bar is hidden in fullscreen it passes a tiny value so the panels grow.
   */
  reservedInset?: number;
  /**
   * When true, suppress Arena3D's in-canvas mobile control cluster (close + tools). Set by the
   * dedicated mobile shell, which owns the close button and all controls itself.
   */
  hideMobileControls?: boolean;
}

const Arena3DComponent: React.FC<Arena3DProps> = ({
  timeRef,
  showActorNames = false,
  mapTimeline,
  scrubbingMode,
  followingActorIdRef,
  followingActorId,
  onCameraUnlock,
  onActorClick,
  isFullscreen = false,
  onToggleFullscreen,
  isMobile = false,
  markersState,
  onAddMarker,
  onRemoveMarker,
  markersEditMode = false,
  onToggleMarkersEditMode,
  onMarkerMove,
  onEditMarker,
  canUndoMarkers = false,
  onUndoMarkers,
  canRedoMarkers = false,
  onRedoMarkers,
  fight,
  selectedPlayerIds,
  onPlayerSelectionChange,
  showPlayerPathsHUD = false,
  showPlayerTrails = false,
  onTogglePlayerPathsHUD,
  onToggleTrails,
  namesEnabled: namesEnabledProp,
  onToggleNames,
  performanceMode: performanceModeProp,
  onTogglePerformance,
  statsPanelEnabled: statsPanelEnabledProp,
  onToggleStats,
  reservedInset,
  hideMobileControls = false,
}) => {
  const { lookup, isActorPositionsLoading } = useActorPositionsTask();

  // The two mobile sub-states (see the isMobile prop doc). On desktop both are false.
  //  - mobilePreview: scroll-safe teaser on the report page; the canvas must NOT capture touches.
  //  - mobileImmersive: the live pseudo-fullscreen overlay; full touch interaction, room for chrome.
  const mobilePreview = isMobile && !isFullscreen;
  const mobileImmersive = isMobile && isFullscreen;

  // Inline-preview fidelity (static poster vs gentle idle), decided from GPU tier + reduced-motion.
  // Only meaningful while in mobilePreview; on desktop these hooks still run but the value is unused.
  const perfTier = usePerfTier();
  const prefersReducedMotion = usePrefersReducedMotion();
  const previewMode = decidePreviewMode(perfTier, prefersReducedMotion);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Persisted viewer prefs (localStorage). Arena3D owns the names + performance slices; the
  // speed/path slices live in FightReplay3D. Both use the same read-merge-write hook so neither
  // clobbers the other's keys. initialPrefs is a one-time mount snapshot used only to seed below.
  const { initialPrefs, persistPrefs } = useReplayPrefs();

  // Display settings (name tags, performance mode, stats-panel master) are now CONTROLLED by
  // FightReplay3D so the mobile Settings sheet shares one source of truth with the in-canvas/desktop
  // toggles. We keep an internal fallback for the (defensive) uncontrolled case and resolve each to
  // the prop when supplied. Toggles route to the parent handler when controlled.
  //  - namesEnabled ANDs with the showActorNames prop so turning names off here always wins (declutter
  //    a crowd to see the models, then bring identity back). Applies to every variant.
  //  - performanceMode (off by default): the player figures stop casting shadows — the shadow pass
  //    re-submits the full humanoid geometry per figure (~75k tris at 23 players), so dropping it
  //    roughly halves the figure tri load and buys headroom for very large fights.
  const [namesEnabledLocal, setNamesEnabledLocal] = useState(initialPrefs.showNames);
  const [performanceModeLocal, setPerformanceModeLocal] = useState(initialPrefs.performanceMode);
  const [statsPanelEnabledLocal, setStatsPanelEnabledLocal] = useState(
    initialPrefs.statsPanelEnabled,
  );
  const namesEnabled = namesEnabledProp ?? namesEnabledLocal;
  const performanceMode = performanceModeProp ?? performanceModeLocal;
  const statsPanelEnabled = statsPanelEnabledProp ?? statsPanelEnabledLocal;
  const toggleNames = useMemo(
    () => onToggleNames ?? (() => setNamesEnabledLocal((v) => !v)),
    [onToggleNames],
  );
  const togglePerformance = useMemo(
    () => onTogglePerformance ?? (() => setPerformanceModeLocal((v) => !v)),
    [onTogglePerformance],
  );
  const toggleStats = useMemo(
    () => onToggleStats ?? (() => setStatsPanelEnabledLocal((v) => !v)),
    [onToggleStats],
  );

  // The stats-panel section checklist (the panel's gear menu) stays owned here — it's the panel's own
  // local config and not surfaced in the mobile Settings sheet.
  const [statsPanelSections, setStatsPanelSections] = useState(initialPrefs.statsPanelSections);

  // Per-player visibility of the 3D actor models. Owned here (rather than in Arena3DScene)
  // so the DOM PlayerListPanel overlay — which renders the toggle controls — and the
  // in-canvas actors share one source of truth. Changes only on a user toggle, so the
  // re-render is rare and cheap; Arena3D's React.memo still guards against the per-tick
  // currentTime re-render from FightReplay3D (that prop is unaffected here).
  const [playerVisibility, setPlayerVisibility] = useState<Map<number, boolean>>(new Map());
  const handlePlayerVisibilityChange = useCallback((actorId: number, visible: boolean) => {
    setPlayerVisibility((prev) => {
      const next = new Map(prev);
      next.set(actorId, visible);
      return next;
    });
  }, []);

  // Per-player body-color overrides (actorId → hex), owned here for the same one-source-of-truth
  // reason as playerVisibility: the DOM player panel sets them and the in-canvas figures read them.
  // Empty by default → every player falls back to its role color. A null value clears the override
  // (back to role). Changes only on a user action, so the re-render is rare and cheap.
  const [playerColorOverrides, setPlayerColorOverrides] = useState<Map<number, string>>(new Map());
  const handlePlayerColorChange = useCallback((actorId: number, color: string | null) => {
    setPlayerColorOverrides((prev) => {
      const next = new Map(prev);
      if (color === null) next.delete(actorId);
      else next.set(actorId, color);
      return next;
    });
  }, []);

  // Persist only the stats-panel section checklist — Arena3D's remaining own slice. The names /
  // performance / stats-master prefs are now persisted by FightReplay3D (which owns that state).
  // Read-merge-write in the hook means this never clobbers the slices the other consumers persist.
  useEffect(() => {
    persistPrefs({ statsPanelSections });
  }, [persistPrefs, statsPanelSections]);

  // Player IDs for the DOM player-list overlay (derived from the same lookup the scene uses).
  const availablePlayerIds = useMemo(() => (lookup ? getVisiblePlayerIds(lookup) : []), [lookup]);
  // Tap detection for the mobile preview teaser (tap expands; a drag scrolls the page).
  const previewTapRef = useRef<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const markerLookup = useMemo(() => {
    if (!markersState) {
      return new Map<string, ReplayMarker>();
    }

    return new Map<string, ReplayMarker>(
      markersState.markers.map((marker) => [marker.id, marker] as [string, ReplayMarker]),
    );
  }, [markersState]);

  const handleGroundContextMenu = useCallback(
    (payload: GroundContextMenuPayload) => {
      if (!onAddMarker) {
        return;
      }

      setContextMenu({
        type: 'ground',
        anchor: payload.screenPosition,
        arenaPoint: payload.arenaPoint,
      });
    },
    [onAddMarker],
  );

  const handleMarkerContextMenu = useCallback(
    (payload: MarkerContextMenuPayload) => {
      if (!onRemoveMarker && !onEditMarker) {
        return;
      }

      setContextMenu({
        type: 'marker',
        anchor: payload.screenPosition,
        markerId: payload.markerId,
      });
    },
    [onRemoveMarker, onEditMarker],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleAddMarkerOption = useCallback(
    (iconKey: number) => {
      if (!contextMenu || contextMenu.type !== 'ground' || !onAddMarker) {
        return;
      }

      onAddMarker(iconKey, contextMenu.arenaPoint);
      setContextMenu(null);
    },
    [contextMenu, onAddMarker],
  );

  const handleRemoveMarkerClick = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'marker' || !onRemoveMarker) {
      return;
    }

    onRemoveMarker(contextMenu.markerId);
    setContextMenu(null);
  }, [contextMenu, onRemoveMarker]);

  const handleEditMarkerClick = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'marker' || !onEditMarker) {
      return;
    }

    onEditMarker(contextMenu.markerId);
    setContextMenu(null);
  }, [contextMenu, onEditMarker]);

  const markerForMenu =
    contextMenu?.type === 'marker' ? (markerLookup.get(contextMenu.markerId) ?? null) : null;
  const markerRemoveLabel =
    markerForMenu && markerForMenu.text && markerForMenu.text.trim().length > 0
      ? `Remove "${markerForMenu.text.trim()}"`
      : 'Remove marker';

  const handleCanvasContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const suppressNativeContextMenu = (event: MouseEvent): void => {
      event.preventDefault();
    };

    document.addEventListener('contextmenu', suppressNativeContextMenu);
    return () => {
      document.removeEventListener('contextmenu', suppressNativeContextMenu);
    };
  }, [contextMenu]);

  // Show keyboard help on initial mount for 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowKeyboardHelp(true);
    }, 500);

    const hideTimer = setTimeout(() => {
      setShowKeyboardHelp(false);
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Toggle help with 'H' key
  useEffect(() => {
    // Guard against SSR or environments without window
    if (typeof window === 'undefined') return;

    const handleKeyPress = (event: KeyboardEvent): void => {
      // Don't interfere with text input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key.toLowerCase() === 'h') {
        setShowKeyboardHelp((prev) => !prev);
        event.preventDefault();
      }

      // N toggles the floating name cards on/off (declutter the crowd).
      if (event.key.toLowerCase() === 'n') {
        toggleNames();
        event.preventDefault();
      }

      // J toggles the locked-player stats panel on/off. Gated on actually following someone (read
      // via the always-current ref) so the key mirrors the on-screen button, which only appears
      // while following — no flipping a hidden pref with zero feedback.
      if (event.key.toLowerCase() === 'j' && followingActorIdRef.current != null) {
        toggleStats();
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // followingActorIdRef is a stable ref; the toggles are stable when controlled by the parent.
  }, [followingActorIdRef, toggleNames, toggleStats]);

  // Calculate arena dimensions based on fight bounding box
  const arenaDimensions = useMemo(() => {
    const defaults = {
      size: 100,
      centerX: 50,
      centerZ: 50,
    };

    if (!fight?.boundingBox) {
      return defaults;
    }

    const { minX, maxX, minY, maxY } = fight.boundingBox;

    if (![minX, maxX, minY, maxY].every((v) => Number.isFinite(v))) {
      return defaults;
    }

    // Convert to arena coordinates (divide by 100)
    // Note: X is flipped in convertCoordinatesWithBottomLeft (100 - x/100)
    const arenaMinX = 100 - maxX / 100;
    const arenaMaxX = 100 - minX / 100;
    const arenaMinZ = minY / 100;
    const arenaMaxZ = maxY / 100;

    const rangeX = arenaMaxX - arenaMinX;
    const rangeZ = arenaMaxZ - arenaMinZ;
    const maxRange = Math.max(rangeX, rangeZ);

    const centerX = (arenaMinX + arenaMaxX) / 2;
    const centerZ = (arenaMinZ + arenaMaxZ) / 2;

    // Add 20% padding
    const size = maxRange * 1.2;

    return { size, centerX, centerZ };
  }, [fight.boundingBox]);

  // Calculate dynamic camera settings based on fight bounding box (same as in Scene)
  const cameraSettings = useMemo(() => {
    const defaults = {
      target: [50, 0, 50] as [number, number, number],
      minDistance: 5,
      maxDistance: 200,
    };

    if (!fight?.boundingBox) {
      return defaults;
    }

    const { minX, maxX, minY, maxY } = fight.boundingBox;

    if (![minX, maxX, minY, maxY].every((v) => Number.isFinite(v))) {
      return defaults;
    }

    const arenaMinX = minX / 100;
    const arenaMaxX = maxX / 100;
    const arenaMinZ = -(maxY / 100);
    const arenaMaxZ = -(minY / 100);

    const centerX = (arenaMinX + arenaMaxX) / 2;
    const centerZ = (arenaMinZ + arenaMaxZ) / 2;

    const rangeX = arenaMaxX - arenaMinX;
    const rangeZ = arenaMaxZ - arenaMinZ;
    const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);
    // Cap the close-zoom bound so an outlier-inflated whole-fight diagonal can't force the fallback
    // initial framing absurdly far out (mirrors the cap in Arena3DScene, which owns the live clamp).
    const minDistance = Math.min(Math.max(5, diagonal * 0.3), 12);
    const maxDistance = Math.min(500, Math.max(50, diagonal * 3));

    return {
      target: [centerX, 0, centerZ] as [number, number, number],
      minDistance,
      maxDistance,
    };
  }, [fight.boundingBox]);

  // `followingActorId` is supplied by FightReplay3D (the single source of truth that also
  // updates `followingActorIdRef`). No polling needed — the chip re-renders whenever the
  // parent state changes.

  // Get the name of the actor being followed
  const followingActorName = useMemo(() => {
    if (!lookup || !followingActorId || !timeRef) return null;

    // Get the current time and actor position
    const currentTime = timeRef.current;
    const actorPosition = getActorPositionAtClosestTimestamp(lookup, followingActorId, currentTime);

    if (actorPosition) {
      return actorPosition.name || `Actor ${followingActorId}`;
    }
    return `Actor ${followingActorId}`;
  }, [lookup, followingActorId, timeRef]);

  const handleUnlockCamera = useCallback((): void => {
    // Delegate to the owner (FightReplay3D), which clears both the ref and the mirrored
    // state. Also clear the ref directly so the synchronous render-loop read is correct
    // even if no onCameraUnlock handler was provided.
    followingActorIdRef.current = null;
    onCameraUnlock?.();
  }, [followingActorIdRef, onCameraUnlock]);

  // Calculate initial camera target and position based on actor bounding box at fight start
  // MUST be before any early returns to comply with React Hooks rules
  const { initialCameraTarget, initialCameraPosition } = useMemo(() => {
    // Calculate actor scale based on fight size (same logic as Arena3DScene)
    let actorScale = DEFAULT_ACTOR_SCALE;

    if (fight) {
      const zoneId = fight.gameZone?.id;
      const mapId = fight.maps?.[0]?.id;

      if (zoneId && mapId) {
        const mapData = getMapScaleData(zoneId, mapId);
        const mapScale = mapData ? computeActorScaleFromMapData(mapData) : null;

        if (mapScale) {
          actorScale = mapScale;
        }
      }

      if ((!fight.gameZone?.id || !fight.maps?.[0]?.id) && fight.boundingBox) {
        const { minX, maxX, minY, maxY } = fight.boundingBox;
        if (minX !== undefined && maxX !== undefined && minY !== undefined && maxY !== undefined) {
          const rangeX = (maxX - minX) / 100;
          const rangeZ = (maxY - minY) / 100;
          const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);

          if (diagonal > 0) {
            const relativeFightSize = Math.min(1, diagonal / 141.42);
            actorScale = 0.5 + relativeFightSize * 0.3;
          }
        }
      }
    }

    // Use arena dimensions center as fallback
    const defaultTarget: [number, number, number] = [
      arenaDimensions.centerX,
      0,
      arenaDimensions.centerZ,
    ];

    if (!lookup?.positionsByTimestamp || !fight) {
      const defaultPosition = computeDefaultCameraPosition(
        defaultTarget,
        cameraSettings.minDistance,
        actorScale,
      );
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    // Get the earliest timestamp
    const timestamps = Object.keys(lookup.positionsByTimestamp)
      .map(Number)
      .sort((a, b) => a - b);
    if (timestamps.length === 0) {
      const defaultPosition = computeDefaultCameraPosition(
        defaultTarget,
        cameraSettings.minDistance,
        actorScale,
      );
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    const startTime = timestamps[0];
    const actorsAtStart = lookup.positionsByTimestamp[startTime];

    if (!actorsAtStart) {
      const defaultPosition = computeDefaultCameraPosition(
        defaultTarget,
        cameraSettings.minDistance,
        actorScale,
      );
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    // Get all actor positions at fight start
    const actors = Object.values(actorsAtStart);
    if (actors.length === 0) {
      const defaultPosition = computeDefaultCameraPosition(
        defaultTarget,
        cameraSettings.minDistance,
        actorScale,
      );
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    // Frame the actors at fight start with OUTLIER REJECTION — a single stray position (a pet/add at
    // the zone edge, a teleport, a glitched sample) must not dominate the initial view. Legitimately
    // spread raids are kept intact. See computeRobustActorFraming.
    const framing = computeRobustActorFraming(actors.map((actor) => actor.position));
    if (!framing) {
      const defaultPosition = computeDefaultCameraPosition(
        defaultTarget,
        cameraSettings.minDistance,
        actorScale,
      );
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    const target: [number, number, number] = [framing.centerX, framing.centerY, framing.centerZ];

    // The diagonal of the (outlier-trimmed) XZ extent — the size measure for the distance calc.
    const boundingBoxDiagonal = framing.diagonalXZ;

    // Calculate camera distance to fit all actors in view
    // Use the bounding box diagonal to determine appropriate distance
    // Camera FOV is 30 degrees, so we need to account for that
    const fov = 30; // degrees
    const fovRadians = (fov * Math.PI) / 180;

    // Calculate distance needed to fit the bounding box in view
    // Use a tight framing multiplier for a closer initial view
    const requiredDistance = (boundingBoxDiagonal / 2 / Math.tan(fovRadians / 2)) * 0.5;

    // Use our calculated distance, but ensure it's reasonable
    // Don't use cameraSettings.minDistance as it can be too large for initial view
    const viewDistance = Math.max(
      2, // Absolute minimum of 2 units (very close)
      Math.min(requiredDistance, cameraSettings.maxDistance * 0.3),
    );

    // Position camera: southwest of target, elevated for good viewing angle
    const cameraOffset = [-viewDistance * 0.6, viewDistance * 0.5, viewDistance * 0.6];
    const position: [number, number, number] = [
      target[0] + cameraOffset[0],
      target[1] + cameraOffset[1],
      target[2] + cameraOffset[2],
    ];

    return { initialCameraTarget: target, initialCameraPosition: position };
  }, [lookup, fight, arenaDimensions.centerX, arenaDimensions.centerZ, cameraSettings]);

  // Don't render until data is loaded. Fill the fullscreen container's height (so the backdrop
  // doesn't collapse to the windowed clamp during an in-fullscreen fight transition).
  if (isActorPositionsLoading || !lookup) {
    return (
      <div
        style={{
          width: '100%',
          height: isFullscreen ? '100%' : ARENA_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: 'white',
        }}
      >
        Loading 3D Arena...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        // Fill the fullscreen container's height; otherwise the responsive 16:9-ish clamp.
        height: isFullscreen ? '100%' : ARENA_HEIGHT,
        position: 'relative',
        // Mobile: suppress the OS long-press behaviors (text-selection loupe, Copy/Look Up
        // callout) across the whole replay block — they hijack the marker long-press/drag
        // gestures on iOS Safari and select the HUD chrome's text.
        ...(isMobile
          ? {
              userSelect: 'none' as const,
              WebkitUserSelect: 'none' as const,
              WebkitTouchCallout: 'none' as const,
            }
          : null),
      }}
      role="img"
      aria-label="3D fight replay arena showing player positions over time"
    >
      <ReplayErrorBoundary checkWebGL={true}>
        <Canvas
          key={`canvas-${fight.id}`} // Stable key prevents unnecessary recreation
          camera={{
            position: initialCameraPosition,
            fov: 30,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            // Prevent context loss during Strict Mode remounts
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
            antialias: true,
            // Fail if context cannot be created
            failIfMajorPerformanceCaveat: false,
          }}
          onContextMenu={handleCanvasContextMenu}
          onCreated={(state) => {
            const { gl } = state;
            // Dev-only: expose the renderer/scene/camera for perf probing (e.g.
            // gl.info.render.frame, toggling gl.shadowMap.autoUpdate, timing gl.render).
            // R3F keeps these in its own reconciler, unreachable through the main React
            // fiber tree, so this is the only handle. Stripped from production builds.
            if (process.env.NODE_ENV === 'development') {
              const w = window as unknown as {
                __gl?: unknown;
                __scene?: unknown;
                __camera?: unknown;
                __r3f?: unknown;
              };
              w.__gl = gl;
              w.__scene = state.scene;
              w.__camera = state.camera;
              w.__r3f = state; // root store; has advance(timestamp) to run all useFrame subs once
            }

            // Handle WebGL context loss and restoration
            const canvas = gl.domElement;

            canvas.addEventListener('webglcontextlost', (event) => {
              event.preventDefault();
              logger.warn('WebGL context lost, preventing default to allow restoration');
            });

            canvas.addEventListener('webglcontextrestored', () => {
              logger.info('WebGL context restored successfully');
            });
          }}
          // 'percentage' = PCFShadowMap; the bare `shadows` default (PCFSoftShadowMap)
          // is deprecated in three 0.184 and logs a console warning every render.
          shadows="percentage"
          // In the mobile inline PREVIEW the canvas must not capture touches: pointer-events:none lets
          // a one-finger drag fall straight through to the page so it scrolls normally (OrbitControls'
          // hardcoded touch-action:none never bites because the element receives no touches). The
          // user enters interaction via the Expand button. Desktop/immersive keep the default 'auto'.
          style={{ background: '#1a1a1a', pointerEvents: mobilePreview ? 'none' : 'auto' }}
        >
          <Arena3DScene
            timeRef={timeRef}
            lookup={lookup}
            showActorNames={showActorNames && namesEnabled}
            mapTimeline={mapTimeline}
            scrubbingMode={scrubbingMode}
            followingActorIdRef={followingActorIdRef}
            onActorClick={onActorClick}
            markersState={markersState}
            onGroundContextMenu={handleGroundContextMenu}
            onMarkerContextMenu={handleMarkerContextMenu}
            markersEditMode={markersEditMode}
            onMarkerMove={onMarkerMove}
            fight={fight}
            initialTarget={initialCameraTarget}
            initialPosition={initialCameraPosition}
            onUnfollow={handleUnlockCamera}
            selectedPlayerIds={selectedPlayerIds}
            showPlayerTrails={showPlayerTrails}
            playerVisibility={playerVisibility}
            playerColorOverrides={playerColorOverrides}
            performanceMode={performanceMode}
            mobileImmersive={mobileImmersive}
          />
        </Canvas>

        {/* Mobile inline PREVIEW scrim — the report page shows a dimmed, non-interactive teaser of the
            3D scene with one clear way in. The scrim is a thin gradient (scene still reads through),
            sits above the pointer-events:none canvas, and carries the Expand affordance. The WHOLE
            teaser accepts a true tap (≤10px travel — the natural first gesture on a big inviting
            canvas) while a drag still falls through as page scroll (no preventDefault, no
            touch-action override: a real scroll fires pointercancel so the tap branch never runs).
            The button stays the visible affordance + the keyboard/AT path. */}
        {mobilePreview && (
          <Box
            aria-hidden={false}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              previewTapRef.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              const start = previewTapRef.current;
              previewTapRef.current = null;
              if (!start) return;
              if ((e.target as HTMLElement).closest('button')) return;
              if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
              onToggleFullscreen?.();
            }}
            onPointerCancel={() => {
              previewTapRef.current = null;
            }}
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'auto',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1,
              pb: 3,
              background:
                'linear-gradient(180deg, rgba(15,20,40,0.18) 0%, rgba(10,14,30,0.05) 35%, rgba(10,14,30,0.45) 100%)',
            }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<OpenInFull />}
              onClick={onToggleFullscreen}
              aria-label="Open the interactive 3D replay"
              sx={(theme) => ({
                pointerEvents: 'auto',
                borderRadius: '999px',
                px: 2.5,
                py: 1,
                fontWeight: 700,
                textTransform: 'none',
                backgroundColor: 'rgba(13,20,48,0.86)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `1px solid ${theme.palette.primary.main}66`,
                boxShadow: `0 8px 26px rgba(0,0,0,0.5), 0 0 18px ${theme.palette.primary.main}40`,
                color: '#e2e8f0',
                '& .MuiButton-startIcon': { color: theme.palette.primary.main },
                '&:hover': { backgroundColor: 'rgba(13,20,48,0.95)' },
              })}
            >
              Tap to explore
            </Button>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(226,232,240,0.75)', fontSize: '0.7rem', pointerEvents: 'none' }}
            >
              {previewMode === 'static' ? 'Interactive 3D replay' : 'Live 3D replay'}
            </Typography>
          </Box>
        )}

        {/* One-time "Ctrl + scroll to zoom" hint — surfaced the first time the user scrolls plainly
            over the canvas (cooperative zoom: plain wheel scrolls the page, Ctrl/⌘+wheel zooms). */}
        {!mobilePreview && <ReplayZoomHint />}

        {/* Boss health — DOM overlay (top-right), crisp + theme-styled. Always shown when
            bosses with health are present. Hidden in the mobile inline preview (the teaser stays
            uncluttered); it returns inside the pseudo-fullscreen interactive mode. */}
        {!mobilePreview && (
          <BossHealthPanel lookup={lookup} timeRef={timeRef} isMobile={mobileImmersive} />
        )}

        {/* Locked-player stats — DOM overlay (bottom-left), shown only while following a player.
            Role-aware up-to-playhead readout (DPS / healer / tank), reusing the fight-insights
            calcs via a prefix-sum engine + own rAF loop. Renders nothing when not following or
            when locked onto a non-player. Gated on statsPanelEnabled (J key / button): disabling
            UNMOUNTS it, which stops the inner rAF loops — not just a visual hide. Also suppressed in
            the mobile inline preview. */}
        {statsPanelEnabled && !mobilePreview && (
          <LockedPlayerStatsPanel
            followingActorId={followingActorId}
            lookup={lookup}
            timeRef={timeRef}
            fightStartTime={fight.startTime}
            fightDurationMs={fight.endTime - fight.startTime}
            sections={statsPanelSections}
            onSectionsChange={setStatsPanelSections}
            isMobile={mobileImmersive}
          />
        )}

        {/* Player list — DOM overlay (top-left), shown when the player-paths HUD is toggled
            on (P key). Real scroll region so every player is reachable. Suppressed in the mobile
            inline preview. */}
        {showPlayerPathsHUD && onPlayerSelectionChange && !mobilePreview && (
          <PlayerListPanel
            playerIds={availablePlayerIds}
            lookup={lookup}
            timeRef={timeRef}
            selectedPlayerIds={selectedPlayerIds ?? EMPTY_SELECTION}
            onPlayerSelectionChange={onPlayerSelectionChange}
            playerVisibility={playerVisibility}
            onPlayerVisibilityChange={handlePlayerVisibilityChange}
            playerColorOverrides={playerColorOverrides}
            onPlayerColorChange={handlePlayerColorChange}
            reservedInset={reservedInset}
            isMobile={mobileImmersive}
            onClose={onTogglePlayerPathsHUD}
          />
        )}

        {/* Player-list + boss-health HUDs are DOM overlays (above) rendered as siblings of
            the <Canvas>, not in-canvas textured planes — crisp text, real scroll, native
            MUI styling. */}

        {/* Add-marker picker: one flat surface with every icon (bottom sheet on touch,
            popover at the click point on desktop). Kept mounted so close transitions run. */}
        <MarkerIconPicker
          open={contextMenu?.type === 'ground'}
          anchorPosition={contextMenu?.type === 'ground' ? contextMenu.anchor : null}
          mobile={isMobile}
          onSelect={handleAddMarkerOption}
          onClose={handleCloseContextMenu}
        />

        {/* Marker context menu: edit/remove for an existing marker. */}
        <Menu
          open={contextMenu?.type === 'marker'}
          onClose={handleCloseContextMenu}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu?.type === 'marker'
              ? { top: contextMenu.anchor.top, left: contextMenu.anchor.left }
              : undefined
          }
          disableScrollLock
          slotProps={{
            list: {
              dense: !isMobile,
              onContextMenu: (event: React.MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
              },
            },
            // Portaled past the replay container, so it needs its own selection
            // suppression: iOS otherwise text-selects the menu items the long-press
            // gesture lands on and covers them with the Copy/Look Up callout.
            paper: {
              sx: { userSelect: 'none', WebkitTouchCallout: 'none' },
            },
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {onEditMarker && (
            <MenuItem onClick={handleEditMarkerClick} sx={isMobile ? { minHeight: 48 } : undefined}>
              Edit marker…
            </MenuItem>
          )}
          <MenuItem
            onClick={handleRemoveMarkerClick}
            disabled={!onRemoveMarker}
            sx={isMobile ? { minHeight: 48 } : undefined}
          >
            {markerRemoveLabel}
          </MenuItem>
        </Menu>
      </ReplayErrorBoundary>

      {/* Performance Monitor Overlay - rendered outside Canvas for proper screen-space positioning */}
      {process.env.NODE_ENV === 'development' && <PerformanceMonitorExternal />}

      {/* Keyboard Controls Help - Shows briefly on load. Desktop-only: it documents physical-key
          shortcuts (WASD/H/etc.) that don't exist on touch, so it never renders on mobile. */}
      <Collapse in={showKeyboardHelp && !isMobile}>
        <Box
          sx={{
            position: 'absolute',
            // Raised to clear the docked control-bar overlay at the bottom of the canvas.
            bottom: 104,
            right: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            borderRadius: 1,
            padding: 2,
            maxWidth: 280,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: 'white', mb: 0.5, fontWeight: 600 }}>
            Camera
          </Typography>
          {[
            ['WASD', 'Move camera'],
            ['Shift', 'Sprint'],
            ['Drag', 'Rotate · Ctrl+scroll: Zoom'],
            ['R', 'Reset view · G: Frame all'],
          ].map(([k, label]) => (
            <Typography
              key={k}
              variant="caption"
              sx={{ color: 'rgba(255, 255, 255, 0.8)', display: 'block', mb: 0.25 }}
            >
              <strong>{k}:</strong> {label}
            </Typography>
          ))}
          <Typography variant="subtitle2" sx={{ color: 'white', mt: 1, mb: 0.5, fontWeight: 600 }}>
            Playback
          </Typography>
          {[
            ['Space', 'Play / pause'],
            ['← →', 'Seek ±1s · Shift: ±10s'],
            ['+ −', 'Speed up / down'],
            [', .', 'Frame step'],
            ['< >', 'Prev / next event'],
            ['I O', 'Set loop in / out · U: Clear'],
            ['[ ]', 'Prev / next boss'],
          ].map(([k, label]) => (
            <Typography
              key={k}
              variant="caption"
              sx={{ color: 'rgba(255, 255, 255, 0.8)', display: 'block', mb: 0.25 }}
            >
              <strong>{k}:</strong> {label}
            </Typography>
          ))}
          <Typography variant="subtitle2" sx={{ color: 'white', mt: 1, mb: 0.5, fontWeight: 600 }}>
            View
          </Typography>
          {[
            ['P', 'Player list'],
            ['T', 'Player trails'],
            ['N', 'Name cards'],
            ['J', 'Player stats (when locked)'],
            ['F', 'Fullscreen'],
            ['C', 'Collapse controls'],
          ].map(([k, label]) => (
            <Typography
              key={k}
              variant="caption"
              sx={{ color: 'rgba(255, 255, 255, 0.8)', display: 'block', mb: 0.25 }}
            >
              <strong>{k}:</strong> {label}
            </Typography>
          ))}
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mt: 1, fontSize: '0.7rem' }}
          >
            Press H to toggle this help
          </Typography>
        </Box>
      </Collapse>

      {/* Locked-player stats toggle — only shown while following a player (the panel's condition),
          so it doesn't clutter the cluster otherwise. Mirrors the J key; on/off shown by color.
          Desktop/immersive-only: on mobile the equivalent lives in the mobile control cluster. */}
      {!isMobile && followingActorId != null && (
        <Tooltip title={statsPanelEnabled ? 'Hide player stats (J)' : 'Show player stats (J)'}>
          <IconButton
            aria-label={statsPanelEnabled ? 'Hide locked-player stats' : 'Show locked-player stats'}
            aria-pressed={statsPanelEnabled}
            size="small"
            onClick={toggleStats}
            sx={{
              position: 'absolute',
              bottom: 296,
              right: 16,
              color: statsPanelEnabled ? 'white' : 'rgba(255, 255, 255, 0.55)',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
              },
            }}
          >
            <Insights fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Fullscreen toggle — fullscreens the whole replay block (canvas + overlays + control bar).
          Topmost in the bottom-right cluster; mirrors the F key. Desktop-only: mobile expands via the
          preview's "Tap to explore" and exits via the mobile control cluster's Close. */}
      {!isMobile && onToggleFullscreen && (
        <Tooltip title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}>
          <IconButton
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-pressed={isFullscreen}
            size="small"
            onClick={onToggleFullscreen}
            sx={{
              position: 'absolute',
              bottom: 248,
              right: 16,
              color: 'rgba(255, 255, 255, 0.7)',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
              },
            }}
          >
            {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
          </IconButton>
        </Tooltip>
      )}

      {/* Performance-mode toggle — drops player-figure shadows for extra headroom on very large
          fights. Button-only (P/T are already bound to the player-paths HUD and trails). Desktop/
          immersive-only on the right-edge stack; the mobile equivalent lives in the mobile cluster. */}
      {!isMobile && (
        <Tooltip
          title={
            performanceMode
              ? 'Performance mode on — figure shadows off'
              : 'Performance mode — drop figure shadows for large fights'
          }
        >
          <IconButton
            aria-label={performanceMode ? 'Disable performance mode' : 'Enable performance mode'}
            aria-pressed={performanceMode}
            size="small"
            onClick={togglePerformance}
            sx={{
              position: 'absolute',
              // Raised to clear the docked control-bar overlay at the bottom of the canvas.
              bottom: 200,
              right: 16,
              color: performanceMode ? '#fcd34d' : 'rgba(255, 255, 255, 0.55)',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
              },
            }}
          >
            <Bolt fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Name-tag toggle - the on-screen affordance for the same state the N key flips, so the
          declutter control is discoverable without knowing the shortcut. Desktop/immersive-only. */}
      {!isMobile && (
        <Tooltip title={namesEnabled ? 'Hide name tags (N)' : 'Show name tags (N)'}>
          <IconButton
            aria-label={namesEnabled ? 'Hide actor name tags' : 'Show actor name tags'}
            aria-pressed={namesEnabled}
            size="small"
            onClick={toggleNames}
            sx={{
              position: 'absolute',
              bottom: 152,
              right: 16,
              color: namesEnabled ? 'white' : 'rgba(255, 255, 255, 0.55)',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
              },
            }}
          >
            {namesEnabled ? <Label fontSize="small" /> : <LabelOff fontSize="small" />}
          </IconButton>
        </Tooltip>
      )}

      {/* Persistent help affordance - re-opens the keyboard help panel once it auto-hides.
          Desktop-only (no keyboard help on touch). */}
      {!isMobile && !showKeyboardHelp && (
        <Tooltip title="Keyboard controls (H)">
          <IconButton
            aria-label="Show keyboard controls"
            size="small"
            onClick={() => setShowKeyboardHelp(true)}
            sx={{
              position: 'absolute',
              bottom: 104,
              right: 16,
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
              },
            }}
          >
            <HelpOutline fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Camera Unlock Chip - Show when following an actor. Anchored top-center so it
          doesn't overlap the top-left PlayerListPanel DOM overlay. Styled to
          match the elevated transport: dark cyan-glass with a glowing accent border + a
          videocam glyph, so it reads as part of the same designed surface over the 3D scene.
          Suppressed in the mobile inline preview, AND in the mobile immersive overlay — there the
          dedicated shell's top bar already shows a "Following ✕" chip, so this would duplicate it
          (and add another backdrop-blur layer over the canvas). Desktop/immersive keeps it. */}
      {!mobilePreview && !mobileImmersive && followingActorId && followingActorName && (
        <Tooltip title="Unlock camera from actor">
          <Chip
            icon={<Videocam sx={{ fontSize: '1rem' }} />}
            label={
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 0.5,
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="span"
                  sx={{ color: 'rgba(226,232,240,0.7)', fontSize: '0.7rem', flexShrink: 0 }}
                >
                  Following
                </Box>
                <Box
                  component="span"
                  sx={{
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}
                >
                  {followingActorName}
                </Box>
              </Box>
            }
            aria-label="Unlock camera from actor"
            onDelete={handleUnlockCamera}
            // On mobile the whole pill unlocks on tap (a 44px touch target beats the tiny delete glyph).
            // handleUnlockCamera is idempotent, so a body tap + the delete-icon tap can't conflict.
            onClick={mobileImmersive ? handleUnlockCamera : undefined}
            deleteIcon={<LockOpen />}
            sx={(theme) => ({
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              // Mobile: 44px tall (touch minimum) and capped wide enough to clear the top-right Close
              // button (~56px in from the right), with the name ellipsizing instead of overflowing.
              height: mobileImmersive ? 44 : 32,
              maxWidth: mobileImmersive ? 'calc(100vw - 120px)' : 'none',
              zIndex: mobileImmersive ? 3 : undefined,
              color: '#e2e8f0',
              backgroundColor: 'rgba(13, 20, 48, 0.82)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1px solid ${theme.palette.primary.main}59`,
              borderRadius: '999px',
              boxShadow: `0 6px 22px rgba(0,0,0,0.5), 0 0 16px ${theme.palette.primary.main}3a`,
              fontSize: '0.8rem',
              '& .MuiChip-icon': { color: theme.palette.primary.main, ml: 0.75 },
              '& .MuiChip-deleteIcon': {
                color: 'rgba(226,232,240,0.6)',
                fontSize: mobileImmersive ? '1.4rem' : '1.05rem',
                ...(mobileImmersive ? { padding: '6px', marginRight: '4px' } : null),
                '&:hover': { color: theme.palette.primary.main },
              },
            })}
          />
        </Tooltip>
      )}

      {/* Mobile touch control cluster — only inside the immersive overlay, where there's room. Gives
          the keyboard-only controls (P/T/N/R/G/J + perf) a touch home and the only way out (Close),
          since the desktop right-edge stack and the F-key are unavailable on a phone. */}
      {mobileImmersive && !hideMobileControls && (
        <MobileReplayControls
          onClose={() => onToggleFullscreen?.()}
          showPlayerList={showPlayerPathsHUD}
          onTogglePlayerList={() => onTogglePlayerPathsHUD?.()}
          showTrails={showPlayerTrails}
          onToggleTrails={() => onToggleTrails?.()}
          namesEnabled={namesEnabled}
          onToggleNames={toggleNames}
          performanceMode={performanceMode}
          onTogglePerformance={togglePerformance}
          following={followingActorId != null}
          statsPanelEnabled={statsPanelEnabled}
          onToggleStats={toggleStats}
          markersEditMode={markersEditMode}
          onToggleMarkersEditMode={onToggleMarkersEditMode}
          onAddMarkerAtCenter={
            onAddMarker
              ? () => window.dispatchEvent(new CustomEvent(ADD_MARKER_AT_CENTER_EVENT))
              : undefined
          }
          canUndoMarkers={canUndoMarkers}
          onUndoMarkers={onUndoMarkers}
          canRedoMarkers={canRedoMarkers}
          onRedoMarkers={onRedoMarkers}
        />
      )}

      {/* Marker edit-mode hint — touch gestures are invisible, so name them while the mode is on.
          Anchored bottom-center, just above the transport dock: the top band is taken by the
          full-width fight-name bar (which would paint over a top-center chip) and the boss HUD
          (top-right), so the clear horizontal strip is here, above the controls and below the
          arena. Non-interactive. */}
      {mobileImmersive && markersEditMode && (
        <Box
          sx={{
            position: 'absolute',
            // Plain px (no env()) — the immersive overlay container already pads the safe area,
            // matching the Tools button (bottom: 96) in MobileReplayControls. 150 clears the
            // transport dock + that button's band.
            bottom: 150,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            pointerEvents: 'none',
            px: 1.5,
            py: 0.5,
            borderRadius: '999px',
            backgroundColor: 'rgba(13,20,48,0.85)',
            border: '1px solid rgba(148,210,255,0.35)',
            maxWidth: 'calc(100% - 32px)',
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: 'rgba(226,232,240,0.92)', whiteSpace: 'nowrap', fontSize: '0.68rem' }}
          >
            Hold map: add · drag marker: move · hold marker: edit
          </Typography>
        </Box>
      )}
    </div>
  );
};

/**
 * Memoized so the entire 3D scene tree (the R3F <Canvas>, ~50 actor components, HUD,
 * markers) does NOT re-reconcile on every playback tick. The parent FightReplay3D updates
 * `currentTime` state ~10×/sec during playback (for the playback controls); that re-render
 * would otherwise reconcile this whole subtree, which dominated the playback frame cost and
 * collapsed it to single-digit fps. None of Arena3D's props depend on `currentTime` — the
 * scene reads time via the mutable `timeRef` inside useFrame — so the memo holds across the
 * tick. (Requires the props to be referentially stable: scrubbingMode is memoized in
 * useScrubbingMode; the handlers are useCallback'd in FightReplay3D.)
 */
export const Arena3D = React.memo(Arena3DComponent);
