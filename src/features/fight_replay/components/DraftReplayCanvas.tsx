import { Box, Button, Slider, Stack, Typography } from '@mui/material';
import { Canvas } from '@react-three/fiber';
import React from 'react';
import { NeutralToneMapping } from 'three';

import { createDraftReplayModelAsset, type DraftModelEntry } from '../utils/draftReplayModels';
import {
  buildDraftReplayFight,
  buildDraftReplayLookup,
  DRAFT_REPLAY_ACTOR_ID,
  DRAFT_REPLAY_DURATION_MS,
} from '../utils/draftReplayPreview';

import { Arena3DScene } from './Arena3DScene';
import { ReplayErrorBoundary } from './ReplayErrorBoundary';

const Scene = React.memo(Arena3DScene);
const CAMERA_POSITION: [number, number, number] = [64, 12, 67];
const CAMERA_TARGET: [number, number, number] = [50, 1, 50];
const DPR: [number, number] = [1, 1.5];

export const DraftReplayCanvas: React.FC<{ entry: DraftModelEntry }> = ({ entry }) => {
  const timeRef = React.useRef(0);
  const isPlayingRef = React.useRef(false);
  const followingActorIdRef = React.useRef<number | null>(null);
  const [time, setTime] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [showNames, setShowNames] = React.useState(true);
  const lookup = React.useMemo(() => buildDraftReplayLookup(entry), [entry]);
  const fight = React.useMemo(() => buildDraftReplayFight(entry.name), [entry.name]);
  const overrides = React.useMemo(() => {
    const asset = createDraftReplayModelAsset(entry);
    return new Map([[DRAFT_REPLAY_ACTOR_ID, asset]]);
  }, [entry]);

  React.useEffect(() => {
    timeRef.current = 0;
    isPlayingRef.current = false;
    setTime(0);
    setPlaying(false);
  }, [entry.id]);

  React.useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    let lastDisplay = previous;
    let frame = 0;
    const tick = (now: number): void => {
      // Avoid jumping through the loop after a background tab resumes.
      timeRef.current =
        (timeRef.current + Math.min(now - previous, 100)) % DRAFT_REPLAY_DURATION_MS;
      previous = now;
      if (now - lastDisplay >= 200) {
        setTime(timeRef.current);
        lastDisplay = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const togglePlayback = (): void => {
    isPlayingRef.current = !playing;
    setPlaying(!playing);
    setTime(timeRef.current);
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Simulated replay preview · 30-second movement loop with three players for scale. Draft sizes
        are provisional; these static models have no skeletal animation.
      </Typography>
      <Box
        sx={{
          height: { xs: 360, sm: 460 },
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#111827',
          touchAction: 'none',
        }}
      >
        <ReplayErrorBoundary checkWebGL>
          <Canvas
            dpr={DPR}
            camera={{ position: CAMERA_POSITION, fov: 40, near: 0.1, far: 1000 }}
            shadows="percentage"
            gl={{ antialias: true, stencil: false, powerPreference: 'high-performance' }}
            role="img"
            aria-label={`${entry.name} in a simulated 3D fight replay`}
            onCreated={({ gl }) => {
              gl.toneMapping = NeutralToneMapping;
              gl.toneMappingExposure = 1.15;
            }}
          >
            <React.Suspense fallback={null}>
              <Scene
                key={entry.id}
                timeRef={timeRef}
                isPlayingRef={isPlayingRef}
                followingActorIdRef={followingActorIdRef}
                lookup={lookup}
                fight={fight}
                staticModelOverrides={overrides}
                initialPosition={CAMERA_POSITION}
                initialTarget={CAMERA_TARGET}
                showActorNames={showNames}
                qualityPreset="high"
                mobileImmersive
              />
            </React.Suspense>
          </Canvas>
        </ReplayErrorBoundary>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Button variant="contained" size="small" onClick={togglePlayback}>
          {playing ? 'Pause preview' : 'Play preview'}
        </Button>
        <Button
          size="small"
          onClick={() => setShowNames((value) => !value)}
          aria-pressed={showNames}
        >
          {showNames ? 'Hide names' : 'Show names'}
        </Button>
        <Typography variant="caption" color="text.secondary">
          Drag to rotate · pinch or Ctrl/⌘+scroll to zoom
        </Typography>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', px: 1 }}>
        <Slider
          aria-label="Preview time"
          min={0}
          max={DRAFT_REPLAY_DURATION_MS}
          step={100}
          value={time}
          onChange={(_event, value) => {
            const next = typeof value === 'number' ? value : value[0];
            timeRef.current = next;
            setTime(next);
          }}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${(value / 1000).toFixed(1)}s`}
        />
        <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
          {(time / 1000).toFixed(1)} / 30s
        </Typography>
      </Stack>
    </Stack>
  );
};
