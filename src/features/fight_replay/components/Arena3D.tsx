import { LockOpen } from '@mui/icons-material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box,
  ClickAwayListener,
  IconButton,
  Tooltip,
  Typography,
  Collapse,
  Menu,
  MenuItem,
} from '@mui/material';
import { Canvas } from '@react-three/fiber';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { useActorPositionsTask } from '../../../hooks/workerTasks/useActorPositionsTask';
import { getMapScaleData } from '../../../types/zoneScaleData';
import { Logger, LogLevel } from '../../../utils/logger';
import { MapTimeline } from '../../../utils/mapTimelineUtils';
import { getActorPositionAtClosestTimestamp } from '../../../workers/calculations/CalculateActorPositions';
import { MapMarkersState, ReplayMarker } from '../types/mapMarkers';
import { COMMON_MARKER_GROUPS, MarkerGroup, MarkerGroupKey } from '../utils/mapMarkerConverters';
import { DEFAULT_ACTOR_SCALE, computeActorScaleFromMapData } from '../utils/mapScaling';

import { Arena3DScene, GroundContextMenuPayload } from './Arena3DScene';
import { MarkerContextMenuPayload } from './Marker3D';
import { MarkerSpritePreview } from './MarkerSpritePreview';
import { PerformanceMonitorExternal } from './PerformanceMonitor/PerformanceMonitorExternal';
import { ReplayErrorBoundary } from './ReplayErrorBoundary';

// Create logger instance for Arena3D
const logger = new Logger({
  level: LogLevel.WARN,
  contextPrefix: 'Arena3D',
});

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
  onCameraUnlock?: () => void;
  onActorClick?: (actorId: number) => void;
  markersState?: MapMarkersState | null;
  onAddMarker?: (iconKey: number, arenaPoint: { x: number; y: number; z: number }) => void;
  onRemoveMarker?: (markerId: string) => void;
  /** Fight data for zone/map information (required for map markers coordinate transformation) */
  fight: FightFragment;
}

export const Arena3D: React.FC<Arena3DProps> = ({
  timeRef,
  showActorNames = false,
  mapTimeline,
  scrubbingMode,
  followingActorIdRef,
  onCameraUnlock,
  onActorClick,
  markersState,
  onAddMarker,
  onRemoveMarker,
  fight,
}) => {
  const { lookup, isActorPositionsLoading } = useActorPositionsTask();
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [submenuState, setSubmenuState] = useState<{
    key: MarkerGroupKey;
    anchorEl: HTMLElement | null;
  } | null>(null);

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

      setSubmenuState(null);
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
      if (!onRemoveMarker) {
        return;
      }

      setSubmenuState(null);
      setContextMenu({
        type: 'marker',
        anchor: payload.screenPosition,
        markerId: payload.markerId,
      });
    },
    [onRemoveMarker],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
    setSubmenuState(null);
  }, []);

  const handleAddMarkerOption = useCallback(
    (iconKey: number) => {
      if (!contextMenu || contextMenu.type !== 'ground' || !onAddMarker) {
        return;
      }

      onAddMarker(iconKey, contextMenu.arenaPoint);
      setContextMenu(null);
      setSubmenuState(null);
    },
    [contextMenu, onAddMarker],
  );

  const handleOpenSubmenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, groupKey: MarkerGroupKey) => {
      event.preventDefault();
      event.stopPropagation();

      setSubmenuState({ key: groupKey, anchorEl: event.currentTarget });
    },
    [],
  );

  const handleGroupMouseLeave = useCallback(() => {
    // Don't close submenu on mouse leave - let it stay open
    // It will close when clicking outside or when another group is hovered
  }, []);

  const handleGroupKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>, groupKey: MarkerGroupKey) => {
      if (event.key !== 'ArrowRight' && event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const target = event.currentTarget as HTMLElement;
      setSubmenuState({ key: groupKey, anchorEl: target });
    },
    [],
  );

  const handleCloseSubmenu = useCallback(() => {
    setSubmenuState(null);
  }, []);

  const handleRemoveMarkerClick = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'marker' || !onRemoveMarker) {
      return;
    }

    onRemoveMarker(contextMenu.markerId);
    setContextMenu(null);
  }, [contextMenu, onRemoveMarker]);

  const markerForMenu =
    contextMenu?.type === 'marker' ? (markerLookup.get(contextMenu.markerId) ?? null) : null;
  const markerRemoveLabel =
    markerForMenu && markerForMenu.text && markerForMenu.text.trim().length > 0
      ? `Remove "${markerForMenu.text.trim()}"`
      : 'Remove marker';

  const activeSubmenuGroup: MarkerGroup | null = useMemo(() => {
    if (!submenuState) {
      return null;
    }

    const group = COMMON_MARKER_GROUPS.find((candidate) => candidate.key === submenuState.key);
    return group && group.options.length > 0 ? group : null;
  }, [submenuState]);

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

  useEffect(() => {
    if (!contextMenu) {
      setSubmenuState(null);
    }
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
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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

    if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
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

    if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
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
    const minDistance = Math.max(5, diagonal * 0.3);
    const maxDistance = Math.min(500, Math.max(50, diagonal * 3));

    return {
      target: [centerX, 0, centerZ] as [number, number, number],
      minDistance,
      maxDistance,
    };
  }, [fight.boundingBox]);

  // State to track the currently followed actor ID for UI updates
  const [followingActorId, setFollowingActorId] = useState<number | null>(
    followingActorIdRef.current,
  );

  // Update state when ref changes (this will be triggered by actor clicks)
  useEffect(() => {
    const checkRefChanges = (): void => {
      if (followingActorIdRef.current !== followingActorId) {
        setFollowingActorId(followingActorIdRef.current);
      }
    };

    // Check periodically for ref changes
    const interval = setInterval(checkRefChanges, 100);
    return () => clearInterval(interval);
  }, [followingActorIdRef, followingActorId]);

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

  const handleUnlockCamera = (): void => {
    followingActorIdRef.current = null;
    setFollowingActorId(null);
    onCameraUnlock?.();
  };

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
      const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5) * actorScale;
      const [targetX, targetY, targetZ] = defaultTarget;
      const defaultPosition: [number, number, number] = [
        targetX - viewDistance * 0.6,
        targetY + viewDistance * 0.5,
        targetZ + viewDistance * 0.6,
      ];
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    // Get the earliest timestamp
    const timestamps = Object.keys(lookup.positionsByTimestamp)
      .map(Number)
      .sort((a, b) => a - b);
    if (timestamps.length === 0) {
      const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5) * actorScale;
      const [targetX, targetY, targetZ] = defaultTarget;
      const defaultPosition: [number, number, number] = [
        targetX - viewDistance * 0.6,
        targetY + viewDistance * 0.5,
        targetZ + viewDistance * 0.6,
      ];
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    const startTime = timestamps[0];
    const actorsAtStart = lookup.positionsByTimestamp[startTime];

    if (!actorsAtStart) {
      const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5) * actorScale;
      const [targetX, targetY, targetZ] = defaultTarget;
      const defaultPosition: [number, number, number] = [
        targetX - viewDistance * 0.6,
        targetY + viewDistance * 0.5,
        targetZ + viewDistance * 0.6,
      ];
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    // Get all actor positions at fight start
    const actors = Object.values(actorsAtStart);
    if (actors.length === 0) {
      const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5) * actorScale;
      const [targetX, targetY, targetZ] = defaultTarget;
      const defaultPosition: [number, number, number] = [
        targetX - viewDistance * 0.6,
        targetY + viewDistance * 0.5,
        targetZ + viewDistance * 0.6,
      ];
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    // Calculate bounding box of all actors at fight start
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    actors.forEach((actor) => {
      const [x, y, z] = actor.position;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    });

    // Calculate the center of the bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const target: [number, number, number] = [centerX, centerY, centerZ];

    // Calculate the dimensions of the bounding box
    const rangeX = maxX - minX;
    const rangeZ = maxZ - minZ;

    // Calculate the diagonal distance of the bounding box in the XZ plane
    const boundingBoxDiagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);

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
      centerX + cameraOffset[0],
      centerY + cameraOffset[1],
      centerZ + cameraOffset[2],
    ];

    return { initialCameraTarget: target, initialCameraPosition: position };
  }, [lookup, fight, arenaDimensions.centerX, arenaDimensions.centerZ, cameraSettings]);

  // Don't render until data is loaded
  if (isActorPositionsLoading || !lookup) {
    return (
      <div
        style={{
          width: '100%',
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#white',
        }}
      >
        Loading 3D Arena...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '400px', position: 'relative' }}>
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
          onCreated={({ gl }) => {
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
          shadows
          style={{ background: '#1a1a1a' }}
        >
          <Arena3DScene
            timeRef={timeRef}
            lookup={lookup}
            showActorNames={showActorNames}
            mapTimeline={mapTimeline}
            scrubbingMode={scrubbingMode}
            followingActorIdRef={followingActorIdRef}
            onActorClick={onActorClick}
            markersState={markersState}
            onGroundContextMenu={handleGroundContextMenu}
            onMarkerContextMenu={handleMarkerContextMenu}
            fight={fight}
            initialTarget={initialCameraTarget}
          />
        </Canvas>
        {contextMenu && (
          <ClickAwayListener onClickAway={handleCloseContextMenu}>
            <div>
              <Menu
                open={Boolean(contextMenu)}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                  contextMenu
                    ? { top: contextMenu.anchor.top, left: contextMenu.anchor.left }
                    : undefined
                }
                disableScrollLock
                MenuListProps={{
                  dense: true,
                  onContextMenu: (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  },
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                {contextMenu?.type === 'ground' &&
                  COMMON_MARKER_GROUPS.filter((group) => group.options.length > 0).map((group) => (
                    <MenuItem
                      key={group.key}
                      onMouseEnter={(event) => handleOpenSubmenu(event, group.key)}
                      onMouseLeave={handleGroupMouseLeave}
                      onClick={(event) => handleOpenSubmenu(event, group.key)}
                      onContextMenu={(event) => handleOpenSubmenu(event, group.key)}
                      onKeyDown={(event) => handleGroupKeyDown(event, group.key)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {group.label}
                      </Typography>
                      <ChevronRightIcon fontSize="small" />
                    </MenuItem>
                  ))}
                {contextMenu?.type === 'marker' && (
                  <MenuItem onClick={handleRemoveMarkerClick} disabled={!onRemoveMarker}>
                    {markerRemoveLabel}
                  </MenuItem>
                )}
              </Menu>
              <Menu
                open={Boolean(activeSubmenuGroup && submenuState?.anchorEl)}
                anchorEl={submenuState?.anchorEl ?? null}
                onClose={handleCloseSubmenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                disableScrollLock
                disableAutoFocus
                disableEnforceFocus
                disableRestoreFocus
                MenuListProps={{
                  dense: true,
                  onContextMenu: (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  },
                  onMouseLeave: handleGroupMouseLeave,
                  sx: { pointerEvents: 'auto' },
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                slotProps={{
                  paper: {
                    onMouseLeave: handleGroupMouseLeave,
                    sx: { pointerEvents: 'auto' },
                  },
                  root: {
                    sx: { pointerEvents: 'none' },
                  },
                }}
              >
                {activeSubmenuGroup?.options.map((option) => (
                  <MenuItem
                    key={option.iconKey}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleAddMarkerOption(option.iconKey);
                    }}
                    disabled={!onAddMarker}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                  >
                    <MarkerSpritePreview iconKey={option.iconKey} label={option.label} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option.label}
                    </Typography>
                  </MenuItem>
                ))}
              </Menu>
            </div>
          </ClickAwayListener>
        )}
      </ReplayErrorBoundary>

      {/* Performance Monitor Overlay - rendered outside Canvas for proper screen-space positioning */}
      {process.env.NODE_ENV === 'development' && <PerformanceMonitorExternal />}

      {/* Keyboard Controls Help - Shows briefly on load */}
      <Collapse in={showKeyboardHelp}>
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            borderRadius: 1,
            padding: 2,
            maxWidth: 280,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 600 }}>
            Camera Controls
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255, 255, 255, 0.8)', display: 'block', mb: 0.5 }}
          >
            <strong>WASD:</strong> Move camera
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255, 255, 255, 0.8)', display: 'block', mb: 0.5 }}
          >
            <strong>Shift:</strong> Sprint (faster movement)
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255, 255, 255, 0.8)', display: 'block', mb: 0.5 }}
          >
            <strong>Mouse:</strong> Rotate & zoom
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mt: 1, fontSize: '0.7rem' }}
          >
            Press H to toggle this help
          </Typography>
        </Box>
      </Collapse>

      {/* Camera Unlock Button - Show when following an actor */}
      {followingActorId && followingActorName && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 1,
            padding: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: 'white' }}>
            Following: {followingActorName}
          </Typography>
          <Tooltip title="Unlock camera from actor">
            <IconButton
              size="small"
              onClick={handleUnlockCamera}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <LockOpen fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </div>
  );
};
