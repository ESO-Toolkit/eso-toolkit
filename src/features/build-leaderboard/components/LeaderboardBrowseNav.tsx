/**
 * The crawlable index of every leaderboard board.
 *
 * The encounter picker is a MUI `Select`, and a Select renders its options into
 * a `Menu` that is unmounted while closed. So even after the options became
 * navigations, a crawler parsing the page still saw zero links to the 14 boss
 * boards. This section is always in the DOM and is made of real anchors, so it
 * is the path by which every board is discovered. It is useful to readers for
 * the same reason it is useful to crawlers: it is the only place the full set is
 * visible at once.
 */

import { Box, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
  bossLeaderboardPath,
  classLeaderboardPath,
  LEADERBOARD_BOSS_ROUTES,
  LEADERBOARD_CLASS_ROUTES,
} from '@/constants/leaderboardRoutes';

import { ClassIcon } from '../../../components/ClassIcon';

interface LeaderboardBrowseNavProps {
  /** Slug of the class board currently shown, if any. Rendered as current. */
  activeClassSlug?: string;
  /** Slug of the boss board currently shown, if any. Rendered as current. */
  activeBossSlug?: string;
}

const linkSx = (active: boolean) => (theme: Theme) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.6,
  px: 1,
  py: 0.5,
  borderRadius: 1.25,
  color: active ? 'text.primary' : 'text.secondary',
  fontSize: '0.74rem',
  fontWeight: active ? 700 : 500,
  textDecoration: 'none',
  border: `1px solid ${alpha(theme.palette.divider, active ? 0.8 : 0.4)}`,
  backgroundColor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
  transition: 'background-color 140ms ease, color 140ms ease, border-color 140ms ease',
  '&:hover': {
    color: 'text.primary',
    borderColor: alpha(theme.palette.primary.main, 0.42),
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
});

const headingSx = {
  mb: 0.85,
  color: 'text.primary',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
};

export const LeaderboardBrowseNav: React.FC<LeaderboardBrowseNavProps> = ({
  activeClassSlug,
  activeBossSlug,
}) => (
  <Box
    component="nav"
    aria-label="Browse all leaderboard boards"
    sx={(theme) => ({
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 320px) minmax(0, 1fr)' },
      gap: { xs: 2, md: 3 },
      mt: 3,
      pt: 2,
      borderTop: `1px solid ${alpha(theme.palette.divider, 0.48)}`,
    })}
  >
    <Box>
      <Typography component="h2" sx={headingSx}>
        Builds by class
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
        {LEADERBOARD_CLASS_ROUTES.map((entry) => {
          const active = entry.slug === activeClassSlug;
          return (
            <Box
              key={entry.slug}
              component={RouterLink}
              to={classLeaderboardPath(entry.slug)}
              aria-current={active ? 'page' : undefined}
              sx={linkSx(active)}
            >
              <ClassIcon className={entry.label} size={14} alt="" />
              {entry.label}
            </Box>
          );
        })}
      </Box>
    </Box>

    <Box>
      <Typography component="h2" sx={headingSx}>
        Parses by trial boss
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
        {LEADERBOARD_BOSS_ROUTES.map((entry) => {
          const active = entry.slug === activeBossSlug;
          return (
            <Box
              key={entry.slug}
              component={RouterLink}
              to={bossLeaderboardPath(entry.slug)}
              aria-current={active ? 'page' : undefined}
              // The zone disambiguates bosses whose names give no clue which
              // trial they belong to (The Mage, The Warrior, The Serpent).
              title={`${entry.name} (${entry.zone})`}
              sx={linkSx(active)}
            >
              {entry.name}
            </Box>
          );
        })}
      </Box>
    </Box>
  </Box>
);
