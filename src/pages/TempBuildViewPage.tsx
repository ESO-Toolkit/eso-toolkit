/**
 * TempBuildViewPage — resolves a temporary build slug and redirects to the
 * standard BuildViewPage for rendering.
 *
 * Route: /b/:slug
 * - Fetches GET /temp-builds/:slug from the API
 * - On success: redirects to /bv?b=<build_data> (replace in history)
 * - On expired/not-found: shows an "expired" message with CTA
 */

import { Alert, Box, Button, Container, Skeleton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { tempBuildApi } from '../features/build-editor/api/temp-build-api';
import { GlassPanel } from '../features/build-editor/components/primitives/GlassPanel';

export const TempBuildViewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setExpired(true);
      return;
    }

    void tempBuildApi
      .get(slug)
      .then((result) => {
        if (!result) {
          setExpired(true);
          return;
        }
        // Redirect to BuildViewPage with the encoded build data
        navigate(`/bv?b=${encodeURIComponent(result.build_data)}`, { replace: true });
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, [slug, navigate]);

  // Loading state (before redirect or error)
  if (!expired && !error) {
    return (
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6, px: { xs: 2, sm: 3 } }}>
        <Skeleton
          variant="rectangular"
          height={400}
          sx={{
            borderRadius: 3,
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          }}
        />
      </Container>
    );
  }

  // Expired or not found
  return (
    <Container maxWidth="sm" sx={{ pt: 8, pb: 6 }}>
      <GlassPanel variant="default" sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ borderRadius: '12px', mb: 3, justifyContent: 'center' }}>
          {error ?? 'This build link has expired or does not exist.'}
        </Alert>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, fontFamily: 'Space Grotesk, Inter, system-ui' }}
        >
          Temporary build links expire after 5 days. Create a new build to get a fresh link.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={() => navigate('/build-editor')}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%)',
              },
            }}
          >
            Create New Build
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/build-hub')}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Browse Build Hub
          </Button>
        </Box>
      </GlassPanel>
    </Container>
  );
};
