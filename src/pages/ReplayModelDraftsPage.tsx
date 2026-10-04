import {
  Alert,
  Box,
  Button,
  CardActionArea,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import React from 'react';
import { useSearchParams } from 'react-router-dom';

import { DraftModelCanvas } from '../features/fight_replay/components/DraftModelCanvas';
import { resolveReplayModelUrl } from '../features/fight_replay/utils/replayActorModelRegistry';
import { usePageTitle } from '../hooks/useDocumentTitle';
import { getBaseUrl } from '../utils/envUtils';

const DraftReplayCanvas = React.lazy(() =>
  import('../features/fight_replay/components/DraftReplayCanvas').then((module) => ({
    default: module.DraftReplayCanvas,
  })),
);

export interface DraftModelEntry {
  id: string;
  name: string;
  kind: 'lesser' | 'boss';
  family: string;
  model: string;
  clayModel?: string;
  referenceImage: string;
  previewImage: string;
  sourceUrl: string;
  reviewNote: string;
  triangleCount?: number;
  bytes?: number;
  modelHeight?: number;
}

export interface DraftModelManifest {
  status: 'draft-unaccepted';
  entries: DraftModelEntry[];
  totalBytes: number;
}

const mediaUrl = (path: string): string =>
  resolveReplayModelUrl(`replay-model-drafts/${path}`, getBaseUrl());

/** Reject an incomplete or accidentally published runtime manifest. */
export function parseDraftModelManifest(value: unknown): DraftModelManifest {
  if (!value || typeof value !== 'object') {
    throw new Error('The draft gallery manifest is invalid.');
  }
  const manifest = value as Partial<DraftModelManifest>;
  const ids = new Set<string>();
  if (
    manifest.status !== 'draft-unaccepted' ||
    !Array.isArray(manifest.entries) ||
    manifest.entries.length === 0 ||
    !manifest.entries.every((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const strings = [
        entry.id,
        entry.name,
        entry.family,
        entry.model,
        entry.referenceImage,
        entry.previewImage,
        entry.sourceUrl,
        entry.reviewNote,
      ];
      if (strings.some((field) => typeof field !== 'string' || field.length === 0)) return false;
      if (!['lesser', 'boss'].includes(entry.kind) || ids.has(entry.id)) return false;
      ids.add(entry.id);
      return true;
    })
  ) {
    throw new Error('The draft gallery manifest is invalid.');
  }
  return manifest as DraftModelManifest;
}

export const ReplayModelDraftsPage: React.FC = () => {
  usePageTitle('/replay-model-drafts');
  const [searchParams, setSearchParams] = useSearchParams();
  const [manifest, setManifest] = React.useState<DraftModelManifest>();
  const [error, setError] = React.useState<string>();
  const [reload, setReload] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [kind, setKind] = React.useState('all');
  const [family, setFamily] = React.useState('all');

  React.useEffect(() => {
    const controller = new AbortController();
    setError(undefined);
    void fetch(mediaUrl('manifest.json'), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The draft gallery could not be loaded.');
        const value: unknown = await response.json();
        return parseDraftModelManifest(value);
      })
      .then((value) => {
        if (!controller.signal.aborted) setManifest(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('The draft gallery could not be loaded.');
      });
    return () => controller.abort();
  }, [reload]);

  const entries = manifest?.entries ?? [];
  const selected = entries.find((entry) => entry.id === searchParams.get('model')) ?? entries[0];
  const replayView = searchParams.get('view') === 'replay';
  const families = [...new Set(entries.map((entry) => entry.family))].sort();
  const query = search.trim().toLowerCase();
  const visible = entries.filter(
    (entry) =>
      (kind === 'all' || entry.kind === kind) &&
      (family === 'all' || entry.family === family) &&
      `${entry.name} ${entry.family}`.toLowerCase().includes(query),
  );

  const selectModel = (entry: DraftModelEntry): void => {
    setSearchParams((params) => {
      params.set('model', entry.id);
      return params;
    });
    if (window.matchMedia('(max-width: 899px)').matches) {
      document
        .getElementById('draft-viewer')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Stack spacing={3} sx={{ py: { xs: 2, md: 4 }, minWidth: 0 }}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
          <Typography variant="overline" color="text.secondary">
            Fight replay · research collection
          </Typography>
          <Chip label="Unaccepted drafts" size="small" color="warning" variant="outlined" />
        </Stack>
        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2rem', md: '2.8rem' } }}>
          Replay model drafts
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
          {entries.length > 0 ? `${entries.length} models` : 'Models'} from the latest research
          batch. Rotate each draft, compare it with the reference, or preview it in the replay
          renderer. These reconstructions still need review before use in recorded fight replays.
        </Typography>
      </Box>

      {error ? (
        <Alert
          severity="error"
          action={<Button onClick={() => setReload((count) => count + 1)}>Retry</Button>}
        >
          {error}
        </Alert>
      ) : !manifest ? (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', py: 6 }} role="status">
          <CircularProgress size={24} />
          <Typography>Loading draft gallery…</Typography>
        </Stack>
      ) : selected ? (
        <>
          <Box
            id="draft-viewer"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.7fr) minmax(0, 1fr)' },
              gap: 2,
              scrollMarginTop: 90,
            }}
          >
            <Paper sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0 }}>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <Box>
                  <Typography variant="h5" component="h2">
                    {selected.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selected.kind === 'boss' ? 'Trial boss' : 'Lesser enemy'} · {selected.family}
                  </Typography>
                </Box>
                <Chip label={`${entries.indexOf(selected) + 1} / ${entries.length}`} size="small" />
              </Stack>
              <ToggleButtonGroup
                exclusive
                value={replayView ? 'replay' : 'model'}
                aria-label="Draft viewing mode"
                size="small"
                sx={{ mb: 2 }}
                onChange={(_event, value: string | null) => {
                  if (!value) return;
                  setSearchParams((params) => {
                    params.set('model', selected.id);
                    if (value === 'replay') params.set('view', 'replay');
                    else params.delete('view');
                    return params;
                  });
                }}
              >
                <ToggleButton value="model">Model viewer</ToggleButton>
                <ToggleButton value="replay">Replay preview</ToggleButton>
              </ToggleButtonGroup>
              {replayView ? (
                <React.Suspense
                  fallback={<CircularProgress size={24} aria-label="Loading replay preview" />}
                >
                  <DraftReplayCanvas entry={selected} />
                </React.Suspense>
              ) : (
                <DraftModelCanvas
                  modelUrl={mediaUrl(selected.model)}
                  name={selected.name}
                  posterUrl={mediaUrl(selected.previewImage)}
                />
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
                <Button
                  component="a"
                  href={mediaUrl(selected.model)}
                  download
                  variant="outlined"
                  size="small"
                >
                  Download draft GLB
                </Button>
                {selected.clayModel && (
                  <Button component="a" href={mediaUrl(selected.clayModel)} download size="small">
                    Download clay GLB
                  </Button>
                )}
              </Stack>
            </Paper>

            <Paper sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0 }}>
              <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
                Reference & review
              </Typography>
              <Box
                component="img"
                src={mediaUrl(selected.referenceImage)}
                alt={`${selected.name} game reference`}
                sx={{
                  width: '100%',
                  height: { xs: 220, lg: 260 },
                  objectFit: 'contain',
                  bgcolor: 'rgba(0,0,0,0.12)',
                  borderRadius: 2,
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1.5 }}>
                {selected.reviewNote}
              </Typography>
              <Button
                component="a"
                href={selected.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
              >
                Open reference source ↗
              </Button>
              {selected.triangleCount !== undefined && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1 }}
                >
                  {selected.triangleCount.toLocaleString()} triangles ·{' '}
                  {selected.bytes !== undefined
                    ? `${(selected.bytes / 1024).toFixed(0)} KB GLB`
                    : 'Draft geometry'}
                </Typography>
              )}
            </Paper>
          </Box>

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Search models"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="draft-kind-label">Type</InputLabel>
                <Select
                  labelId="draft-kind-label"
                  label="Type"
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                >
                  <MenuItem value="all">All models</MenuItem>
                  <MenuItem value="lesser">Lesser enemies</MenuItem>
                  <MenuItem value="boss">Trial bosses</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="draft-family-label">Family</InputLabel>
                <Select
                  labelId="draft-family-label"
                  label="Family"
                  value={family}
                  onChange={(event) => setFamily(event.target.value)}
                >
                  <MenuItem value="all">All families</MenuItem>
                  {families.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Typography variant="body2" color="text.secondary" role="status">
              Showing {visible.length} of {entries.length} drafts
            </Typography>
            {visible.length === 0 && (
              <Alert severity="info">
                No drafts match these filters.
                <Button
                  size="small"
                  onClick={() => {
                    setSearch('');
                    setKind('all');
                    setFamily('all');
                  }}
                >
                  Clear filters
                </Button>
              </Alert>
            )}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  md: 'repeat(4, minmax(0, 1fr))',
                  xl: 'repeat(6, minmax(0, 1fr))',
                },
                gap: 1.5,
              }}
            >
              {visible.map((entry) => (
                <Paper
                  key={entry.id}
                  sx={{
                    overflow: 'hidden',
                    borderColor: entry.id === selected.id ? 'primary.main' : 'divider',
                    borderWidth: entry.id === selected.id ? 2 : 1,
                  }}
                >
                  <CardActionArea
                    onClick={() => selectModel(entry)}
                    aria-label={`View ${entry.name}`}
                    aria-pressed={entry.id === selected.id}
                    sx={{ height: '100%' }}
                  >
                    <Box
                      component="img"
                      src={mediaUrl(entry.previewImage)}
                      alt=""
                      loading="lazy"
                      sx={{
                        display: 'block',
                        width: '100%',
                        height: { xs: 120, sm: 155 },
                        objectFit: 'contain',
                        bgcolor: 'rgba(0,0,0,0.12)',
                      }}
                    />
                    <Box sx={{ p: 1.5 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ lineHeight: 1.3, overflowWrap: 'anywhere' }}
                      >
                        {entry.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {entry.kind === 'boss' ? 'Trial boss' : entry.family}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Paper>
              ))}
            </Box>
          </Stack>
        </>
      ) : null}
    </Stack>
  );
};
