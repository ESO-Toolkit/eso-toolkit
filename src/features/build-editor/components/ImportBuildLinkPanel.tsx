/**
 * ImportBuildLinkPanel — import a build by pasting a guide URL.
 *
 * Flow: paste a guide link → the worker fetches the page server-side (CORS) →
 * we extract its text → hand it to ImportBuildTextPanel for review/Apply. Works
 * great for text-based guides (the build is in the page's HTML); guides that
 * render the build only as images won't yield much text (use the Image tab).
 */

import { LinkOutlined as LinkIcon, TravelExploreOutlined as FetchIcon } from '@mui/icons-material';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';

import { fetchGuideByUrl } from '../api/fetch-guide-api';

import { ImportBuildTextPanel } from './ImportBuildTextPanel';
import { glassInputSx } from './primitives/glassInputSx';

interface ImportBuildLinkPanelProps {
  onClose: () => void;
}

const pillSx = {
  borderRadius: '99px',
  textTransform: 'none',
  fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
  fontWeight: 600,
  fontSize: 12,
} as const;

const looksLikeUrl = (s: string): boolean => /^https?:\/\/\S+\.\S+/i.test(s.trim());

export const ImportBuildLinkPanel: React.FC<ImportBuildLinkPanelProps> = ({ onClose }) => {
  const isDark = useTheme().palette.mode === 'dark';

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [thin, setThin] = useState(false);
  const [truncated, setTruncated] = useState(false);

  const handleFetch = async (): Promise<void> => {
    if (!looksLikeUrl(url)) {
      setError('Enter a full guide URL starting with https://');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchGuideByUrl(url.trim());
      // Heuristic: a build-bearing page has plenty of text. Very little usually
      // means the build is image-only — let the user know but still proceed.
      setThin(result.text.replace(/\s+/g, ' ').trim().length < 200);
      setTruncated(result.truncated);
      setText(result.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch that link.');
    } finally {
      setLoading(false);
    }
  };

  // Once we have text, reuse the full text-review → Apply pipeline.
  if (text !== null) {
    return (
      <Stack spacing={1}>
        {truncated && (
          <Alert severity="warning" sx={{ py: 0.25, fontSize: 11, borderRadius: 2 }}>
            This page was too large to read fully, so the build below may be incomplete — review
            carefully before applying.
          </Alert>
        )}
        {thin && (
          <Alert severity="info" sx={{ py: 0.25, fontSize: 11, borderRadius: 2 }}>
            This guide seems to show its build mostly as images — little text was found. Try the
            Image tab with a screenshot instead.
          </Alert>
        )}
        <ImportBuildTextPanel onClose={onClose} initialText={text} />
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: 12,
          fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
        }}
      >
        Paste a build-guide link. We&apos;ll fetch the page and pull out the gear, skills, champion
        points and more for you to review. Works best on text-based guides.
      </Typography>

      <TextField
        fullWidth
        size="small"
        placeholder="https://example.com/eso/best-build"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !loading) void handleFetch();
        }}
        disabled={loading}
        slotProps={{
          input: {
            startAdornment: (
              <Box sx={{ display: 'flex', mr: 1, color: 'var(--be-accent, #38bdf8)' }}>
                <LinkIcon sx={{ fontSize: 18 }} />
              </Box>
            ),
          },
        }}
        sx={glassInputSx(isDark, false)}
      />

      {error && (
        <Alert severity="error" sx={{ py: 0.25, fontSize: 11, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button variant="outlined" size="small" onClick={onClose} sx={pillSx} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={
            loading ? (
              <CircularProgress size={14} sx={{ color: 'inherit' }} />
            ) : (
              <FetchIcon sx={{ fontSize: 16 }} />
            )
          }
          disabled={loading || url.trim().length === 0}
          onClick={() => void handleFetch()}
          sx={{
            ...pillSx,
            background:
              'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.85), rgba(var(--be-accent-rgb, 56, 189, 248), 0.65))',
          }}
        >
          {loading ? 'Fetching…' : 'Fetch guide'}
        </Button>
      </Stack>
    </Stack>
  );
};
