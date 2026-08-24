import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';
import React from 'react';

/**
 * Public terms for the hosted ESO Toolkit service. These terms intentionally
 * describe the current product without expanding the software license; the
 * repository LICENSE remains authoritative for source-code use.
 */
export const TermsPage: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Terms of Use | ESO Toolkit';
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
            Terms of Use
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
            Effective August 23, 2026
          </Typography>
        </Box>

        <Stack spacing={3} divider={<Divider flexItem />}>
          <Box>
            <Typography variant="h5" gutterBottom>
              About the service
            </Typography>
            <Typography>
              ESO Toolkit is an independent, community-built fan tool for analyzing Elder Scrolls
              Online combat logs and organizing optional build or roster information. It is not
              affiliated with, sponsored by, or endorsed by ZeniMax Online Studios, Bethesda, or ESO
              Logs.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" gutterBottom>
              Acceptable use
            </Typography>
            <Typography>
              Use the service lawfully and only with reports, images, profile details, and other
              content that you are allowed to access or share. Do not attempt to disrupt the
              service, bypass access controls, abuse third-party APIs, or publish another
              person&apos;s private information without permission. ESO Logs access remains subject
              to ESO Logs&apos; own terms and policies.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" gutterBottom>
              User content and public sharing
            </Typography>
            <Typography>
              You retain responsibility for content you publish through public profiles, rosters,
              builds, comments, or shared links. Only publish content you have permission to make
              public. You grant the service the limited rights needed to store, display, and
              transmit that content to provide the requested feature. We may remove content that
              violates these terms or creates a security, legal, or privacy risk.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" gutterBottom>
              Availability and disclaimers
            </Typography>
            <Typography>
              The service is provided on an as-is and as-available basis. Analysis can be affected
              by incomplete logs, API changes, game updates, browser limitations, or service
              outages. Do not rely on the service as a sole source for competitive, financial, or
              safety-critical decisions. We may change, suspend, or discontinue features as the
              project evolves.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" gutterBottom>
              Privacy, source, and third-party rights
            </Typography>
            <Typography>
              Our current data practices are described in the{' '}
              <Link href="/privacy">Privacy Policy</Link>. Source-code permissions are governed by
              the repository{' '}
              <Link href="https://github.com/ESO-Toolkit/eso-toolkit/blob/main/LICENSE">
                LICENSE
              </Link>
              ; these hosted-service terms do not grant additional source-code rights. ESO, its
              names, game data, and third-party assets remain subject to their respective
              owners&apos; rights. See the repository{' '}
              <Link href="https://github.com/ESO-Toolkit/eso-toolkit/blob/main/NOTICE.md">
                NOTICE
              </Link>{' '}
              for attribution and licensing notes.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" gutterBottom>
              Changes and contact
            </Typography>
            <Typography>
              We may update these terms when the service or applicable requirements change. The
              effective date above identifies the current version. Questions or requests can be
              raised in the project&apos;s{' '}
              <Link href="https://github.com/ESO-Toolkit/eso-toolkit/discussions">
                GitHub Discussions
              </Link>
              .
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Container>
  );
};
