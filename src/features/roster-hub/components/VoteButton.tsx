import { ThumbUp, ThumbUpOutlined } from '@mui/icons-material';
import { Box, ButtonBase, keyframes, Tooltip, Typography } from '@mui/material';
import React from 'react';

const pop = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.25); }
  100% { transform: scale(1); }
`;

interface VoteButtonProps {
  voteCount: number;
  voted: boolean;
  disabled: boolean;
  onVote: () => void;
}

export const VoteButton: React.FC<VoteButtonProps> = React.memo(
  ({ voteCount, voted, disabled, onVote }) => {
    const tooltip = disabled ? 'Log in to vote' : voted ? 'Remove vote' : 'Upvote this roster';
    const [animating, setAnimating] = React.useState(false);

    const handleClick = (): void => {
      if (disabled) return;
      setAnimating(true);
      onVote();
      setTimeout(() => setAnimating(false), 350);
    };

    return (
      <Tooltip title={tooltip} placement="top">
        {/* span wrapper so Tooltip works when button is disabled */}
        <Box component="span" sx={{ display: 'inline-flex' }}>
          <ButtonBase
            onClick={handleClick}
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
              transition: 'all 0.2s ease',
              minHeight: 32,
              '&:hover:not(.Mui-disabled)': {
                borderColor: 'primary.main',
                color: voted ? 'primary.contrastText' : 'primary.main',
                bgcolor: voted ? 'primary.dark' : 'action.hover',
                transform: 'scale(1.05)',
              },
              '&:active:not(.Mui-disabled)': { transform: 'scale(0.93)' },
              '&.Mui-disabled': { opacity: 0.38, cursor: 'default' },
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                animation: animating ? `${pop} 0.35s ease` : 'none',
              }}
            >
              {voted ? (
                <ThumbUp sx={{ fontSize: 14 }} />
              ) : (
                <ThumbUpOutlined sx={{ fontSize: 14 }} />
              )}
            </Box>
            <Typography component="span" variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>
              {voteCount}
            </Typography>
          </ButtonBase>
        </Box>
      </Tooltip>
    );
  },
);

VoteButton.displayName = 'VoteButton';
