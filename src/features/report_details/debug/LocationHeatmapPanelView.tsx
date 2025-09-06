import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Timeline as TimelineIcon,
  Place as PlaceIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Divider,
  Stack,
  Tooltip,
  Badge,
} from '@mui/material';
import React from 'react';

import { ReportActorFragment } from '../../../graphql/generated';

interface LocationPoint {
  x: number;
  y: number;
  timestamp: number;
  playerId: string;
  playerName: string;
  role: 'tank' | 'dps' | 'healer';
}

interface VoxelData {
  x: number;
  y: number;
  timeSpent: number;
  players: Set<string>;
  lastTimestamp: Map<string, number>;
  role: 'tank' | 'dps' | 'healer' | 'mixed';
}

interface ELMSMarker {
  x: number;
  y: number;
  role: 'tank' | 'dps' | 'healer';
  description: string;
  tankId?: string;
}

interface FightPhase {
  id: number;
  startTime: number;
  endTime: number;
  label: string;
  totalDamage: number;
}

interface PlayerActor {
  id: string;
  name: string;
  role: 'tank' | 'dps' | 'healer';
  healing: number;
  taunts: number;
  actor: ReportActorFragment;
  player?: Record<string, unknown>; // Optional player data
}

interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface LocationHeatmapPanelViewProps {
  locationData: LocationPoint[];
  playerActors: PlayerActor[];
  fightPhases: FightPhase[];
  filteredLocationData: LocationPoint[];
  heatmapVoxels: VoxelData[];
  elmsMarkers: ELMSMarker[];
  mapBounds: MapBounds;
  selectedPlayer: string;
  showHeatmap: boolean;
  showMarkers: boolean;
  selectedPhase: number | 'all';
  onPlayerChange: (event: SelectChangeEvent) => void;
  onPhaseChange: (event: SelectChangeEvent) => void;
  onShowHeatmapChange: (checked: boolean) => void;
  onShowMarkersChange: (checked: boolean) => void;
  onPhaseClick: (phaseId: number) => void;
  onViewAllPhases: () => void;
  onCopyELMSCode: () => void;
  generateELMSCode: () => string;
}

const TOP_POSITIONS_PER_TANK = 3;

export const LocationHeatmapPanelView: React.FC<LocationHeatmapPanelViewProps> = ({
  locationData,
  playerActors,
  fightPhases,
  filteredLocationData,
  heatmapVoxels,
  elmsMarkers,
  mapBounds,
  selectedPlayer,
  showHeatmap,
  showMarkers,
  selectedPhase,
  onPlayerChange,
  onPhaseChange,
  onShowHeatmapChange,
  onShowMarkersChange,
  onPhaseClick,
  onViewAllPhases,
  onCopyELMSCode,
  generateELMSCode,
}) => {
  if (locationData.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Tank Movement Tracker & ELMS Markers
        </Typography>
        <Alert severity="info">
          No tank position data found in this fight. Position data is extracted from resource change
          events and requires tanks to be present in the encounter.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Icon */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <PlaceIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Tank Movement Tracker & ELMS Markers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track tank movement patterns through position updates based on time spent in each area
          </Typography>
        </Box>
      </Stack>

      {/* Controls */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack spacing={3}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            Controls & Filters
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ minWidth: 200, flexGrow: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Tank Filter</InputLabel>
                <Select value={selectedPlayer} label="Tank Filter" onChange={onPlayerChange}>
                  <MenuItem value="all">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <GroupIcon fontSize="small" />
                      <Typography variant="body2">All Tanks</Typography>
                    </Stack>
                  </MenuItem>
                  {playerActors
                    .filter((player) => player.role === 'tank')
                    .map((player, index) => {
                      const tankColor = index === 0 ? 'error' : 'warning';
                      const tankColorName = index === 0 ? 'RED' : 'ORANGE';

                      return (
                        <MenuItem key={player.id} value={player.id}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ width: '100%' }}
                          >
                            <Box sx={{ flexGrow: 1 }}>{player.name}</Box>
                            <Chip label={`${tankColorName} TANK`} size="small" color={tankColor} />
                          </Stack>
                        </MenuItem>
                      );
                    })}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ minWidth: 200, flexGrow: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Fight Phase</InputLabel>
                <Select
                  value={selectedPhase === 'all' ? 'all' : String(selectedPhase)}
                  label="Fight Phase"
                  onChange={onPhaseChange}
                >
                  <MenuItem value="all">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TimelineIcon fontSize="small" />
                      <Typography variant="body2">All Phases</Typography>
                    </Stack>
                  </MenuItem>
                  {fightPhases.map((phase) => (
                    <MenuItem key={phase.id} value={String(phase.id)}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                        <Box sx={{ flexGrow: 1 }}>{phase.label}</Box>
                        <Chip
                          label={`${Math.round((phase.endTime - phase.startTime) / 1000)}s`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ minWidth: 160 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showHeatmap}
                    onChange={(e) => onShowHeatmapChange(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {showHeatmap ? (
                      <VisibilityIcon fontSize="small" />
                    ) : (
                      <VisibilityOffIcon fontSize="small" />
                    )}
                    <Typography variant="body2">Heatmap</Typography>
                  </Stack>
                }
              />
            </Box>

            <Box sx={{ minWidth: 160 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showMarkers}
                    onChange={(e) => onShowMarkersChange(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {showMarkers ? (
                      <VisibilityIcon fontSize="small" />
                    ) : (
                      <VisibilityOffIcon fontSize="small" />
                    )}
                    <Typography variant="body2">ELMS Markers</Typography>
                  </Stack>
                }
              />
            </Box>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 300 }}>
            <Stack spacing={1}>
              <Typography
                variant="subtitle2"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <AssessmentIcon fontSize="small" />
                Voxel Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Map divided into 50x50 unit grid cells, showing only voxels where players spent ≥30
                seconds
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ minWidth: 300 }}>
            <Stack spacing={1}>
              <Typography
                variant="subtitle2"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <TimelineIcon fontSize="small" />
                Phase Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {fightPhases.length} active combat phase{fightPhases.length !== 1 ? 's' : ''}{' '}
                separated by 2+ second damage gaps
              </Typography>
              {selectedPhase !== 'all' && (
                <Chip
                  label={`Viewing: ${fightPhases.find((p) => p.id === selectedPhase)?.label}`}
                  color="primary"
                  size="small"
                />
              )}
            </Stack>
          </Box>
        </Box>
      </Paper>

      {/* Heatmap Visualization */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlaceIcon />
            Position Heatmap
            {selectedPhase !== 'all' && (
              <Chip
                label={fightPhases.find((p) => p.id === selectedPhase)?.label || 'Unknown Phase'}
                color="primary"
                size="small"
              />
            )}
          </Typography>

          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: 400,
              border: '1px solid #ccc',
              background:
                'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              overflow: 'hidden',
            }}
          >
            {/* Coordinate system labels */}
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                top: 5,
                left: 5,
                background: 'rgba(255,255,255,0.8)',
                padding: '2px 4px',
                borderRadius: 1,
              }}
            >
              ({mapBounds.minX}, {mapBounds.maxY})
            </Typography>
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 5,
                right: 5,
                background: 'rgba(255,255,255,0.8)',
                padding: '2px 4px',
                borderRadius: 1,
              }}
            >
              ({mapBounds.maxX}, {mapBounds.minY})
            </Typography>

            {/* Heatmap voxels */}
            {showHeatmap &&
              heatmapVoxels.map((voxel, index) => {
                const normalizedX =
                  ((voxel.x - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX)) * 100;
                const normalizedY =
                  ((mapBounds.maxY - voxel.y) / (mapBounds.maxY - mapBounds.minY)) * 100;

                const voxelDisplaySize = Math.max(
                  (50 / (mapBounds.maxX - mapBounds.minX)) * 400,
                  20,
                );

                const timeSeconds = voxel.timeSpent / 1000;
                const intensity = Math.min(Math.max((timeSeconds - 30) / 270, 0.2), 1);

                let baseColor = 'rgba(255, 99, 71';
                if (voxel.role === 'tank') baseColor = 'rgba(244, 67, 54';
                else if (voxel.role === 'healer') baseColor = 'rgba(76, 175, 80';
                else if (voxel.role === 'dps') baseColor = 'rgba(33, 150, 243';
                else baseColor = 'rgba(156, 39, 176';

                return (
                  <Box
                    key={index}
                    sx={{
                      position: 'absolute',
                      left: `${normalizedX}%`,
                      top: `${normalizedY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: voxelDisplaySize,
                      height: voxelDisplaySize,
                      backgroundColor: `${baseColor}, ${intensity})`,
                      border: `1px solid ${baseColor}, 0.8)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      color: 'white',
                      textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                    }}
                    title={`${Math.round(timeSeconds)}s spent in this area (${voxel.players.size} players)`}
                  >
                    {Math.round(timeSeconds)}s
                  </Box>
                );
              })}

            {/* ELMS Markers */}
            {showMarkers &&
              elmsMarkers.map((marker, index) => {
                const normalizedX =
                  ((marker.x - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX)) * 100;
                const normalizedY =
                  ((mapBounds.maxY - marker.y) / (mapBounds.maxY - mapBounds.minY)) * 100;

                let color = '#2196f3';
                if (marker.role === 'tank' && marker.tankId) {
                  const uniqueTankIds = Array.from(
                    new Set(elmsMarkers.map((m) => m.tankId).filter(Boolean)),
                  );
                  const tankIndex = uniqueTankIds.indexOf(marker.tankId);
                  color = tankIndex === 0 ? '#f44336' : tankIndex === 1 ? '#ff9800' : '#f44336';
                } else if (marker.role === 'healer') {
                  color = '#4caf50';
                } else if (marker.role === 'tank') {
                  color = '#f44336';
                }

                return (
                  <Box
                    key={index}
                    sx={{
                      position: 'absolute',
                      left: `${normalizedX}%`,
                      top: `${normalizedY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 20,
                      height: 20,
                      backgroundColor: color,
                      border: '2px solid white',
                      borderRadius: '50%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                    title={marker.description}
                  >
                    {marker.role === 'tank' ? 'T' : marker.role === 'healer' ? 'H' : 'D'}
                  </Box>
                );
              })}
          </Box>
        </Stack>
      </Paper>

      {/* Statistics */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon />
          Tank Movement Statistics
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Tooltip title="Total number of tank position updates from resource change events" arrow>
            <Card sx={{ minWidth: 160, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h4"
                  color="primary"
                  fontWeight="bold"
                  data-testid="tank-position-updates-count"
                >
                  {locationData.length.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tank Position Updates
                </Typography>
              </CardContent>
            </Card>
          </Tooltip>

          <Tooltip
            title="Voxels where tanks spent 3 or more seconds showing tank movement patterns"
            arrow
          >
            <Card sx={{ minWidth: 160, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h4"
                  color="primary"
                  fontWeight="bold"
                  data-testid="movement-hotspots-count"
                >
                  {heatmapVoxels.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Movement Hotspots
                </Typography>
              </CardContent>
            </Card>
          </Tooltip>

          <Tooltip title="Generated movement markers for frequently visited tank positions" arrow>
            <Card sx={{ minWidth: 160, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h4"
                  color="primary"
                  fontWeight="bold"
                  data-testid="movement-markers-count"
                >
                  {elmsMarkers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Movement Markers
                </Typography>
                {(() => {
                  const uniqueTankIds = Array.from(
                    new Set(elmsMarkers.map((m) => m.tankId).filter(Boolean)),
                  );
                  if (uniqueTankIds.length > 1) {
                    const redMarkers = elmsMarkers.filter((m) => {
                      if (!m.tankId) return false;
                      return uniqueTankIds.indexOf(m.tankId) === 0;
                    }).length;
                    const orangeMarkers = elmsMarkers.filter((m) => {
                      if (!m.tankId) return false;
                      return uniqueTankIds.indexOf(m.tankId) === 1;
                    }).length;

                    return (
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        {redMarkers > 0 && (
                          <Chip
                            label={`${redMarkers} Red`}
                            size="small"
                            sx={{ backgroundColor: '#f44336', color: 'white', fontSize: '0.75rem' }}
                          />
                        )}
                        {orangeMarkers > 0 && (
                          <Chip
                            label={`${orangeMarkers} Orange`}
                            size="small"
                            sx={{ backgroundColor: '#ff9800', color: 'white', fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>
                    );
                  }
                  return null;
                })()}
              </CardContent>
            </Card>
          </Tooltip>

          <Tooltip title="Active combat phases detected in the fight" arrow>
            <Card sx={{ minWidth: 160, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h4"
                  color="primary"
                  fontWeight="bold"
                  data-testid="combat-phases-count"
                >
                  {fightPhases.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Combat Phases
                </Typography>
              </CardContent>
            </Card>
          </Tooltip>

          {selectedPhase !== 'all' && (
            <Tooltip title="Duration of the currently selected phase" arrow>
              <Card
                sx={{
                  minWidth: 160,
                  flexGrow: 1,
                  border: '2px solid',
                  borderColor: 'primary.main',
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h4"
                    color="primary"
                    fontWeight="bold"
                    data-testid="selected-phase-duration"
                  >
                    {(() => {
                      const phase = fightPhases.find((p) => p.id === selectedPhase);
                      return phase ? Math.round((phase.endTime - phase.startTime) / 1000) : 0;
                    })()}
                    s
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Phase Duration
                  </Typography>
                </CardContent>
              </Card>
            </Tooltip>
          )}
        </Box>
      </Paper>

      {/* Individual Tank Movement Breakdown */}
      {(() => {
        const tanksWithData = playerActors.filter(
          (player) =>
            player.role === 'tank' && locationData.some((point) => point.playerId === player.id),
        );

        if (tanksWithData.length > 0) {
          return (
            <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography
                variant="h6"
                sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <GroupIcon />
                Individual Tank Movement Analysis
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {tanksWithData.map((tank, index) => {
                  const tankPositions = locationData.filter((point) => point.playerId === tank.id);
                  const tankVoxels = heatmapVoxels.filter((voxel) => voxel.players.has(tank.id));
                  const topVoxels = tankVoxels
                    .sort((a, b) => b.timeSpent - a.timeSpent)
                    .slice(0, TOP_POSITIONS_PER_TANK);

                  const tankColor = index === 0 ? 'error' : 'warning';
                  const tankColorName = index === 0 ? 'RED' : 'ORANGE';

                  return (
                    <Card key={tank.id} variant="outlined" sx={{ p: 2 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Chip label={`${tankColorName} TANK`} size="small" color={tankColor} />
                        {tank.name}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {tankPositions.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Position Updates
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {tankVoxels.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Unique Areas
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {Math.min(TOP_POSITIONS_PER_TANK, topVoxels.length)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Top Positions
                          </Typography>
                        </Box>
                      </Box>

                      {topVoxels.length > 0 && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Most Time-Intensive Positions:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {topVoxels.map((voxel, index) => {
                              const timeInSeconds = Math.round(voxel.timeSpent / 1000);
                              return (
                                <Chip
                                  key={`${voxel.x}-${voxel.y}`}
                                  label={`#${index + 1}: ${timeInSeconds}s`}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </Card>
                  );
                })}
              </Box>
            </Paper>
          );
        }
        return null;
      })()}

      {/* Fight Phase Details */}
      {fightPhases.length > 1 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Active Combat Phase Analysis
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Each phase represents a period of active combat. Phases are separated by gaps of 2+
            seconds where no friendly damage is dealt.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {fightPhases.map((phase, index) => (
              <Box
                key={phase.id}
                sx={{
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  backgroundColor: selectedPhase === phase.id ? '#f5f5f5' : 'transparent',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f9f9f9' },
                }}
                onClick={() => onPhaseClick(phase.id)}
              >
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    {phase.label} - Active Combat
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Math.round((phase.endTime - phase.startTime) / 1000)}s active
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 4, mt: 1 }}>
                  <Typography variant="body2">
                    Start: {new Date(phase.startTime).toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body2">
                    End: {new Date(phase.endTime).toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body2">
                    Total Damage: {phase.totalDamage.toLocaleString()}
                  </Typography>
                </Box>

                {index < fightPhases.length - 1 &&
                  (() => {
                    const nextPhase = fightPhases[index + 1];
                    const gapDuration = Math.round((nextPhase.startTime - phase.endTime) / 1000);
                    return (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: 'block' }}
                      >
                        {gapDuration}s gap until next phase begins
                      </Typography>
                    );
                  })()}
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={onViewAllPhases}
              disabled={selectedPhase === 'all'}
              startIcon={<TimelineIcon />}
            >
              View All Phases
            </Button>
            <Typography variant="body2" color="text.secondary">
              Click on a phase above to view its heatmap data individually
            </Typography>
          </Box>
        </Paper>
      )}

      {/* ELMS Code Generation */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlaceIcon />
              ELMS Marker Code
              <Badge badgeContent={elmsMarkers.length} color="primary">
                <Chip label="Markers" size="small" variant="outlined" />
              </Badge>
            </Typography>
            <Tooltip title="Copy generated ELMS code to clipboard" arrow>
              <Button
                variant="contained"
                onClick={onCopyELMSCode}
                disabled={elmsMarkers.length === 0}
                startIcon={<AssessmentIcon />}
                sx={{ borderRadius: 2 }}
              >
                Copy to Clipboard
              </Button>
            </Tooltip>
          </Box>

          <Box
            component="pre"
            sx={{
              backgroundColor: 'grey.100',
              border: '1px solid',
              borderColor: 'grey.300',
              p: 2,
              borderRadius: 2,
              overflow: 'auto',
              maxHeight: 300,
              fontSize: '13px',
              fontFamily: 'monospace',
              lineHeight: 1.4,
              '&:hover': {
                borderColor: 'primary.main',
              },
            }}
          >
            {generateELMSCode()}
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};
