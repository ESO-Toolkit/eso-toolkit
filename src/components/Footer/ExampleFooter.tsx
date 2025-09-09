/**
 * Example Footer component showing how to use version information
 * This demonstrates the cache-busting utilities in action
 */

import { Box, Typography, Link } from '@mui/material';
import React from 'react';

import { VersionInfo } from '../../components/UpdateNotification';
import { useVersionInfo } from '../../hooks/useCacheInvalidation';

export const ExampleFooter: React.FC = () => {
  const versionInfo = useVersionInfo();

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 2,
        px: 3,
        backgroundColor: 'grey.900',
        color: 'grey.300',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" sx={{ mb: 1 }}>
        ESO Log Insights by NotaGuild
      </Typography>

      {/* Example of using VersionInfo component */}
      <VersionInfo format="short" sx={{ display: 'block', mb: 1 }} />

      {/* Example of using version information directly */}
      <Typography variant="caption" sx={{ opacity: 0.7 }}>
        Build: {versionInfo.buildTime}
      </Typography>

      {/* Example of showing git commit link */}
      <Box sx={{ mt: 1 }}>
        <Link
          href={`https://github.com/bkrupa/eso-log-aggregator/commit/${versionInfo.gitCommit}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: 'primary.light',
            textDecoration: 'none',
            fontSize: '0.75rem',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          View commit {versionInfo.shortCommit}
        </Link>
      </Box>
    </Box>
  );
};
