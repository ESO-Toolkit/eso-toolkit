import {
  Box,
  CircularProgress,
  Container,
  Chip,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { Center, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import React from 'react';
import * as THREE from 'three';

import bossData from '../../data/trial-boss-models/trial_boss_complete.json';

// ── Types ──────────────────────────────────────────────────────────────────

interface BossTexture {
  file_index: number;
  width: number;
  height: number;
  format: string;
  size_kb: number;
  role: string;
}

interface BossModel {
  name: string;
  file_index: number;
  size_kb: number;
  verts: number;
  tris: number;
}

interface BossTextures {
  primary: BossTexture[];
  additional: BossTexture[] | null;
  total_count: number;
  note?: string;
}

interface RelatedGr2 {
  animations: { file_index: number; size_kb: number }[];
  skeletons: { file_index: number; size_kb: number }[];
  other: { file_index: number; size_kb: number; type?: string }[];
}

interface Boss {
  name: string;
  model_type: 'creature' | 'humanoid';
  species?: string;
  notes?: string;
  model?: BossModel;
  textures?: BossTextures;
  related_gr2?: RelatedGr2;
}

interface Trial {
  location: string;
  year: number;
  bosses: Boss[];
}

interface BossDataFile {
  trials: Record<string, Trial>;
}

// ── Build flat boss list ───────────────────────────────────────────────────

interface BossOption {
  id: string;
  trialName: string;
  boss: Boss;
}

const typedData = bossData as unknown as BossDataFile;

const bossOptions: BossOption[] = Object.entries(typedData.trials).flatMap(([trialName, trial]) =>
  trial.bosses.map((boss, i) => ({
    id: `${trialName}::${i}`,
    trialName,
    boss,
  })),
);

// ── 3D Scene ───────────────────────────────────────────────────────────────

/** Path convention: /models/bosses/{model_name}.glb */
const getModelUrl = (boss: Boss): string | null => {
  if (boss.model) return `/models/bosses/${boss.model.name}.glb`;
  // Humanoid bosses without a model field — derive name from boss name
  const safeName = boss.name
    .replace(/ /g, '_')
    .replace(/\//g, '_')
    .replace(/\\/g, '_');
  return `/models/bosses/${safeName}.glb`;
};

// Color based on species/type
const getSpeciesColor = (boss: Boss): string => {
  if (boss.model_type === 'humanoid') return '#9ca3af';
  const species = boss.species ?? '';
  const speciesColors: Record<string, string> = {
    DwemerCenturion: '#d4a843',
    ClockWorkTitan: '#c0a030',
    ClockWorkImperfect: '#b08820',
    StormAtronach: '#60a0ff',
    StoneAtronach: '#8b7355',
    FleshAbomination: '#8b2252',
    Titan: '#ff4444',
    Dragon: '#22cc44',
    Senche: '#ff9900',
    Lurcher: '#558844',
    Gargoyle: '#777788',
    Harvester: '#aa44aa',
    Mammoth: '#8b6e4e',
    Wamasu: '#44bbaa',
    Lamia: '#55aa88',
    Ogrim: '#884422',
    ArgonianBehemoth: '#448844',
    Mantikora: '#aa6644',
    Gryphon: '#ddcc88',
    BoneDragon: '#88aa66',
    CoralAtronach: '#38bdf8',
    MindTerror: '#9f44dd',
  };
  return speciesColors[species] ?? '#38bdf8';
};

/** Renders an actual GLB model. */
const GlbModel: React.FC<{ url: string; color: string }> = ({ url, color }) => {
  const { scene } = useGLTF(url);
  const cloned = React.useMemo(() => scene.clone(true), [scene]);

  // Auto-fit: compute bounding box and normalize scale + centering
  const { camera } = useThree();
  React.useEffect(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetScale = 3 / maxDim; // Fit within ~3 units
    cloned.scale.setScalar(targetScale);

    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center.multiplyScalar(targetScale));

    // Apply species color tint to all meshes
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.isMeshStandardMaterial) {
          mat.emissive = new THREE.Color(color);
          mat.emissiveIntensity = 0.05;
        }
      }
    });

    // Adjust camera to fit
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(4, 3, 4);
      camera.lookAt(0, 0, 0);
    }
  }, [cloned, color, camera]);

  return <primitive object={cloned} />;
};

/** Fallback placeholder geometry when no GLB is available. */
const PlaceholderMesh: React.FC<{ boss: Boss }> = ({ boss }) => {
  const verts = boss.model?.verts ?? 1000;
  const scale = Math.max(0.5, Math.min(3, Math.log10(verts) / 2));
  const color = getSpeciesColor(boss);
  const hasTextures = (boss.textures?.total_count ?? 0) > 0;

  const geometry = React.useMemo(() => {
    if (!boss.model) return new THREE.CapsuleGeometry(0.5, 1.5, 8, 16);
    const tris = boss.model.tris;
    if (tris > 20000) return new THREE.IcosahedronGeometry(1, 4);
    if (tris > 8000) return new THREE.DodecahedronGeometry(1, 2);
    return new THREE.OctahedronGeometry(1, 2);
  }, [boss.model]);

  return (
    <mesh scale={scale} position={[0, 0, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={color}
        roughness={hasTextures ? 0.3 : 0.7}
        metalness={hasTextures ? 0.6 : 0.2}
        emissive={color}
        emissiveIntensity={hasTextures ? 0.15 : 0}
        wireframe={!hasTextures && boss.model_type === 'creature'}
      />
    </mesh>
  );
};

/** Tries to load GLB, falls back to placeholder on error. */
const BossModelMesh: React.FC<{ boss: Boss; onModelStatus: (status: ModelStatus) => void }> = ({
  boss,
  onModelStatus,
}) => {
  const modelUrl = getModelUrl(boss);
  const [useGlb, setUseGlb] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const color = getSpeciesColor(boss);

  // Probe whether the GLB file exists via a HEAD request
  React.useEffect(() => {
    if (!modelUrl) {
      onModelStatus('no-model');
      return;
    }
    setChecking(true);
    setUseGlb(false);

    const controller = new AbortController();
    fetch(modelUrl, { method: 'HEAD', signal: controller.signal })
      .then((res) => {
        if (res.ok) {
          setUseGlb(true);
          onModelStatus('glb');
        } else {
          onModelStatus('placeholder');
        }
      })
      .catch(() => {
        onModelStatus('placeholder');
      })
      .finally(() => {
        setChecking(false);
      });
    return () => {
      controller.abort();
    };
  }, [modelUrl, onModelStatus]);

  if (checking) return null;
  if (useGlb && modelUrl) {
    return (
      <Center>
        <GlbModel url={modelUrl} color={color} />
      </Center>
    );
  }
  return <PlaceholderMesh boss={boss} />;
};

type ModelStatus = 'loading' | 'glb' | 'placeholder' | 'no-model';

const BossScene: React.FC<{ boss: Boss; onModelStatus: (status: ModelStatus) => void }> = ({
  boss,
  onModelStatus,
}) => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-3, 4, -3]} intensity={0.3} />
      <BossModelMesh boss={boss} onModelStatus={onModelStatus} />
      <gridHelper args={[10, 20, '#334155', '#1e293b']} position={[0, -2, 0]} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2 - 0.05}
        autoRotate
        autoRotateSpeed={1.5}
      />
    </>
  );
};

// ── Info Panel ─────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
      {value}
    </Typography>
  </Box>
);

const BossInfoPanel: React.FC<{ boss: Boss; trialName: string }> = ({ boss, trialName }) => {
  const trial = typedData.trials[trialName];

  return (
    <Stack spacing={2}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6))'
              : 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(241,245,249,0.7))',
          backdropFilter: 'blur(16px)',
          border: (theme) =>
            `1px solid ${theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.15)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Model Info
        </Typography>
        <Stack spacing={1}>
          <InfoRow label="Trial" value={`${trialName} (${trial.year})`} />
          <InfoRow label="Location" value={trial.location} />
          <InfoRow
            label="Type"
            value={
              <Chip
                label={boss.model_type}
                size="small"
                color={boss.model_type === 'creature' ? 'primary' : 'default'}
                sx={{ fontWeight: 600 }}
              />
            }
          />
          {boss.species && <InfoRow label="Species" value={boss.species} />}
          {boss.model && (
            <>
              <InfoRow label="Model" value={boss.model.name} />
              <InfoRow label="File Index" value={boss.model.file_index.toLocaleString()} />
              <InfoRow label="Vertices" value={boss.model.verts.toLocaleString()} />
              <InfoRow label="Triangles" value={boss.model.tris.toLocaleString()} />
              <InfoRow label="Size" value={`${boss.model.size_kb} KB`} />
            </>
          )}
        </Stack>
      </Paper>

      {boss.textures && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(241,245,249,0.7))',
            backdropFilter: 'blur(16px)',
            border: (theme) =>
              `1px solid ${theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.15)' : 'rgba(0,0,0,0.08)'}`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Textures ({boss.textures.total_count})
          </Typography>
          {boss.textures.total_count === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No textures found via adjacency scan
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {boss.textures.primary.map((tex) => (
                <InfoRow
                  key={tex.file_index}
                  label={tex.role}
                  value={`${tex.width}×${tex.height} ${tex.format} (${tex.size_kb} KB)`}
                />
              ))}
              {boss.textures.additional && boss.textures.additional.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
                  + {boss.textures.additional.length} additional texture
                  {boss.textures.additional.length !== 1 ? 's' : ''}
                </Typography>
              )}
            </Stack>
          )}
        </Paper>
      )}

      {boss.notes && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {boss.notes}
        </Typography>
      )}
    </Stack>
  );
};

// ── Page Component ─────────────────────────────────────────────────────────

export const BossModelViewerPage: React.FC = () => {
  const [selectedId, setSelectedId] = React.useState<string>('');
  const [modelStatus, setModelStatus] = React.useState<ModelStatus>('loading');

  const selected = React.useMemo(() => bossOptions.find((o) => o.id === selectedId), [selectedId]);

  const handleChange = (event: SelectChangeEvent<string>): void => {
    setSelectedId(event.target.value);
    setModelStatus('loading');
  };

  const handleModelStatus = React.useCallback((status: ModelStatus) => {
    setModelStatus(status);
  }, []);

  // Build grouped menu items
  const menuItems = React.useMemo(() => {
    const items: React.ReactNode[] = [];
    let currentTrial = '';

    for (const option of bossOptions) {
      if (option.trialName !== currentTrial) {
        currentTrial = option.trialName;
        const trial = typedData.trials[currentTrial];
        items.push(
          <ListSubheader key={`header-${currentTrial}`} sx={{ fontWeight: 700 }}>
            {currentTrial} ({trial.year})
          </ListSubheader>,
        );
      }

      const isCreature = option.boss.model_type === 'creature';
      items.push(
        <MenuItem key={option.id} value={option.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2">{option.boss.name}</Typography>
            <Chip
              label={isCreature ? option.boss.species : 'humanoid'}
              size="small"
              variant="outlined"
              color={isCreature ? 'primary' : 'default'}
              sx={{ ml: 'auto', fontSize: '0.7rem', height: 20 }}
            />
          </Box>
        </MenuItem>,
      );
    }

    return items;
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Boss Model Viewer
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse 3D model data for all 53 trial bosses across 14 ESO trials. Creature bosses include
          extractable GR2 model geometry and DDS texture mappings.
        </Typography>

        <FormControl fullWidth>
          <InputLabel id="boss-select-label">Select a boss</InputLabel>
          <Select
            labelId="boss-select-label"
            value={selectedId}
            label="Select a boss"
            onChange={handleChange}
            MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
          >
            {menuItems}
          </Select>
        </FormControl>

        {selected && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 340px' },
              gap: 3,
            }}
          >
            {/* 3D Viewport */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                height: { xs: 350, md: 500 },
                position: 'relative',
                background: (theme) => (theme.palette.mode === 'dark' ? '#0a0f1a' : '#e8ecf0'),
                border: (theme) =>
                  `1px solid ${theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.15)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              <Canvas
                camera={{ position: [4, 3, 4], fov: 45, near: 0.1, far: 100 }}
                gl={{ antialias: true, powerPreference: 'high-performance' }}
              >
                <BossScene boss={selected.boss} onModelStatus={handleModelStatus} />
              </Canvas>
              {/* Loading overlay */}
              {modelStatus === 'loading' && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.4)',
                    zIndex: 1,
                  }}
                >
                  <CircularProgress size={40} />
                </Box>
              )}
              {/* Model source badge */}
              {modelStatus !== 'loading' && (
                <Chip
                  label={
                    modelStatus === 'glb'
                      ? 'GLB Model'
                      : modelStatus === 'no-model'
                        ? 'No Model Data'
                        : 'Placeholder'
                  }
                  size="small"
                  color={modelStatus === 'glb' ? 'success' : 'default'}
                  variant={modelStatus === 'glb' ? 'filled' : 'outlined'}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                    fontSize: '0.7rem',
                    opacity: 0.85,
                  }}
                />
              )}
            </Paper>

            {/* Info Panel */}
            <BossInfoPanel boss={selected.boss} trialName={selected.trialName} />
          </Box>
        )}

        {!selected && (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              borderRadius: 3,
              textAlign: 'center',
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(15,23,42,0.5), rgba(30,41,59,0.3))'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(241,245,249,0.5))',
              backdropFilter: 'blur(16px)',
              border: (theme) =>
                `1px solid ${theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.1)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Select a boss from the dropdown to view its model data
            </Typography>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};
