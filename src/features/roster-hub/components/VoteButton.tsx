import { ThumbUp, ThumbUpOutlined } from '@mui/icons-material';
import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import React from 'react';

interface VoteButtonProps {
  voteCount: number;
  voted: boolean;
  disabled: boolean;
  onVote: () => void;
}

export const VoteButton: React.FC<VoteButtonProps> = React.memo(
  ({ voteCount, voted, disabled, onVote }) => {
    const tooltip = disabled ? 'Log in to vote' : voted ? 'Remove vote' : 'Upvote this roster';

    return (
      <Tooltip title={tooltip} placement="top">
        {/* span wrapper so Tooltip works when button is disabled */}
        <Box component="span" sx={{ display: 'inline-flex' }}>
          <ButtonBase
            onClick={onVote}
            disabled={disabled}
            aria-label={tooltip}
            aria-pressed={voted}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              borderRadius: '20px',
              border: '1px solid',
              borderColor: voted ? 'primary.main' : 'divider',
              bgcolor: voted ? 'primary.main' : 'transparent',
              color: voted ? 'primary.contrastText' : 'text.secondary',
              transition: 'all 0.15s ease',
              minHeight: 32,
              '&:hover:not(.Mui-disabled)': {
                borderColor: 'primary.main',
                color: voted ? 'primary.contrastText' : 'primary.main',
                bgcolor: voted ? 'primary.dark' : 'action.hover',
              },
              '&:active:not(.Mui-disabled)': { transform: 'scale(0.95)' },
              '&.Mui-disabled': { opacity: 0.38, cursor: 'default' },
            }}
          >
            {voted ? (
              <ThumbUp sx={{ fontSize: 14 }} />
            ) : (
              <ThumbUpOutlined sx={{ fontSize: 14 }} />
            )}
            <Typography
              component="span"
              variant="caption"
              sx={{ fontWeight: 700, lineHeight: 1 }}
            >
              {voteCount}
            </Typography>
          </ButtonBase>
        </Box>
      </Tooltip>
    );
  },
);

VoteButton.displayName = 'VoteButton';
