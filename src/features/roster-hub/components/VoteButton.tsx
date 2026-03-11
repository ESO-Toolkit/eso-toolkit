import { ThumbUp, ThumbUpOutlined } from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import React from 'react';

interface VoteButtonProps {
  voteCount: number;
  voted: boolean;
  disabled: boolean;
  onVote: () => void;
}

export const VoteButton: React.FC<VoteButtonProps> = ({ voteCount, voted, disabled, onVote }) => {
  const tooltip = disabled ? 'Log in to vote' : voted ? 'Remove vote' : 'Upvote this roster';

  return (
    <Tooltip title={tooltip} placement="top">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        <IconButton
          size="small"
          onClick={onVote}
          disabled={disabled}
          aria-label={tooltip}
          sx={{
            color: voted ? 'primary.main' : 'text.secondary',
            transition: 'transform 0.15s ease, color 0.15s ease',
            '&:hover': { transform: 'scale(1.2)' },
            '&:active': { transform: 'scale(0.95)' },
          }}
        >
          {voted ? <ThumbUp fontSize="small" /> : <ThumbUpOutlined fontSize="small" />}
        </IconButton>
        <Typography
          variant="caption"
          sx={{ color: voted ? 'primary.main' : 'text.secondary', fontWeight: 600, lineHeight: 1 }}
        >
          {voteCount}
        </Typography>
      </Box>
    </Tooltip>
  );
};
