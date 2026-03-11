import { ContentCopy, DeleteOutline, Person, Visibility } from '@mui/icons-material';
import {
  Box,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import type { HubRoster } from '../types/roster-hub.types';

import { VoteButton } from './VoteButton';

interface RosterCardProps {
  roster: HubRoster;
  isOwner: boolean;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onPreview: (roster: HubRoster) => void;
  onDelete: (id: string) => void;
}

// Map short trial IDs to display labels
const TRIAL_SHORT: Record<string, string> = {
  AA: 'AA',
  AS: 'AS',
  BRP: 'BRP',
  CR: 'CR',
  DSR: 'DSR',
  HOF: 'HoF',
  HRC: 'HRC',
  KA: 'KA',
  LC: 'LC',
  MOL: 'MoL',
  RG: 'RG',
  SE: 'SE',
  SO: 'SO',
  SS: 'SS',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const RosterCard: React.FC<RosterCardProps> = ({
  roster,
  isOwner,
  isLoggedIn,
  onVote,
  onPreview,
  onDelete,
}) => {
  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          boxShadow: 4,
          borderColor: 'primary.main',
        },
      }}
    >
      {/* Clickable area — opens preview dialog */}
      <CardActionArea
        onClick={() => onPreview(roster)}
        sx={{ flexGrow: 1, alignItems: 'flex-start', '&:hover .preview-hint': { opacity: 1 } }}
      >
        <CardContent sx={{ pb: 0, width: '100%' }}>
          {/* Header row: trial badge + title + preview hint */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
            <Chip
              label={TRIAL_SHORT[roster.trial_id] ?? roster.trial_id}
              size="small"
              color="primary"
              variant="filled"
              sx={{ fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}
            />
            <Typography
              variant="subtitle1"
              component="h3"
              sx={{ fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word', flexGrow: 1 }}
            >
              {roster.title}
            </Typography>
            <Visibility
              className="preview-hint"
              fontSize="small"
              sx={{
                opacity: 0,
                flexShrink: 0,
                color: 'primary.main',
                transition: 'opacity 0.2s ease',
              }}
            />
          </Box>

          {/* Description */}
          {roster.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {roster.description}
            </Typography>
          )}

          {/* Tags */}
          {roster.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mb: 1 }}>
              {roster.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
              ))}
            </Stack>
          )}

          {/* Author + date */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 'auto' }}>
            <Person sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled">
              {roster.author_name} · {formatDate(roster.created_at)}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>

      {/* Action row — stopPropagation keeps clicks from opening the dialog */}
      <CardActions
        sx={{ px: 2, pt: 1, pb: 1.5, justifyContent: 'space-between' }}
        onClick={(e) => e.stopPropagation()}
      >
        <VoteButton
          voteCount={roster.vote_count}
          voted={roster.user_voted ?? false}
          disabled={!isLoggedIn}
          onVote={() => onVote(roster.id)}
        />

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Copy share link">
            <IconButton
              size="small"
              onClick={() => {
                const url = `${window.location.origin}/rv?r=${roster.roster_data}`;
                void navigator.clipboard.writeText(url);
              }}
              aria-label="Copy share link"
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
          {isOwner && (
            <Tooltip title="Delete roster">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(roster.id)}
                aria-label="Delete roster"
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardActions>
    </Card>
  );
};
