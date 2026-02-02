import { Box, Chip, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import React from 'react';

import { getBuildInfoAsync, getDisplayVersion, isDevelopmentBuild } from '../utils/cacheBusting';

const InfoRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 2,
      flexWrap: 'wrap',
    }}
  >
    <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: 160 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontWeight: 600,
        textAlign: 'right',
        flex: 1,
        wordBreak: 'break-word',
      }}
    >
      {value || 'Unavailable'}
    </Typography>
  </Box>
);

export const AboutPage: React.FC = () => {
  const [buildInfo, setBuildInfo] = React.useState<
    | {
        version: string;
        buildTime: string;
        gitCommit: string;
        shortCommit: string;
        buildId: string;
        timestamp: number;
        cacheBuster: string;
      }
    | undefined
  >(undefined);

  React.useEffect(() => {
    let isMounted = true;
    const loadBuildInfo = async (): Promise<void> => {
      const info = await getBuildInfoAsync();
      if (isMounted) {
        setBuildInfo(info);
      }
    };

    void loadBuildInfo();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayVersion = buildInfo
    ? `v${buildInfo.version} (${buildInfo.shortCommit})`
    : getDisplayVersion();
  const buildTime = buildInfo?.buildTime
    ? new Date(buildInfo.buildTime).toLocaleString()
    : undefined;
  const buildTimestamp = buildInfo?.timestamp
    ? new Date(buildInfo.timestamp).toLocaleString()
    : undefined;
  const buildChannel = buildInfo
    ? buildInfo.gitCommit.length === 40
      ? 'Release'
      : 'Development'
    : isDevelopmentBuild()
      ? 'Development'
      : 'Release';

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>
            About ESO Toolkit
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            Current release details and build metadata.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: (theme) =>
              `1px solid ${
                theme.palette.mode === 'dark'
                  ? 'rgba(148, 163, 184, 0.2)'
                  : 'rgba(148, 163, 184, 0.3)'
              }`,
            background:
              'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(14, 165, 233, 0.03) 100%)',
          }}
        >
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Release information
              </Typography>
              <Chip
                label={buildChannel}
                color={buildChannel === 'Release' ? 'primary' : 'warning'}
                variant="outlined"
              />
            </Stack>

            <Divider />

            <Stack spacing={1.5}>
              <InfoRow label="Display version" value={displayVersion} />
              <InfoRow label="Build version" value={buildInfo?.version} />
              <InfoRow label="Build ID" value={buildInfo?.buildId} />
              <InfoRow label="Short commit" value={buildInfo?.shortCommit} />
              <InfoRow label="Full commit" value={buildInfo?.gitCommit} />
              <InfoRow label="Build time" value={buildTime} />
              <InfoRow label="Build timestamp" value={buildTimestamp} />
              <InfoRow label="Cache buster" value={buildInfo?.cacheBuster} />
            </Stack>
          </Stack>
        </Paper>

        {!buildInfo && (
          <Typography variant="body2" color="text.secondary">
            Loading release information...
          </Typography>
        )}
      </Stack>
    </Container>
  );
};
