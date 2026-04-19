/**
 * Standalone Discord bot install guide.
 *
 * Linkable from anywhere — including a DM to a server admin — so installation
 * doesn't require being inside the publish flow. Works unauthenticated.
 *
 * Query params:
 *   ?server=<guildId>  (optional) — pre-fills shareable-link context only;
 *                       the bot invite itself is server-agnostic and Discord
 *                       presents its own server picker during OAuth.
 */

import { ArrowBack } from '@mui/icons-material';
import { Box, Button, Container, Stack, Typography, useTheme } from '@mui/material';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import discordIcon from '../assets/discord-icon.svg';
import { DiscordAdminGuideContent } from '../features/roster-hub/components/DiscordAdminGuideContent';

export const DiscordSetupPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const guildId = searchParams.get('server') ?? undefined;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 5 } }}>
      <Stack spacing={2.5}>
        <Button
          onClick={() => navigate(-1)}
          startIcon={<ArrowBack fontSize="small" />}
          sx={{
            alignSelf: 'flex-start',
            textTransform: 'none',
            color: 'text.secondary',
            fontSize: '0.82rem',
            px: 1,
            '&:hover': { color: 'text.primary', background: 'transparent' },
          }}
        >
          Back
        </Button>

        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
              boxShadow: '0 6px 18px rgba(88,101,242,0.3)',
            }}
          >
            <img
              src={discordIcon}
              alt=""
              style={{ width: 22, height: 22, filter: 'brightness(10)' }}
            />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>
              ESO Toolkit Discord bot
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              Admin setup guide
            </Typography>
          </Box>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: '0.85rem',
            lineHeight: 1.55,
            pb: 0.5,
            borderBottom: isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(0,0,0,0.06)',
          }}
        >
          You&apos;re reading the admin setup guide. A teammate probably sent this so you can add
          the bot to your server — it takes about 60 seconds and doesn&apos;t require an ESO
          Toolkit account.
        </Typography>

        <DiscordAdminGuideContent guildId={guildId} standalone />
      </Stack>
    </Container>
  );
};
