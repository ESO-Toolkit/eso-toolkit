import { KeyboardArrowUp } from '@mui/icons-material';
import { Box, ButtonBase, keyframes, Tooltip, Typography, useTheme } from '@mui/material';
import React from 'react';

const pop = keyframes`
  0%   { transform: scale(1) translateY(0); }
  35%  { transform: scale(1.4) translateY(-3px); }
  65%  { transform: scale(0.9) translateY(0); }
  100% { transform: scale(1) translateY(0); }
`;

const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(96,165,250,0.5); }
  70%  { box-shadow: 0 0 0 7px rgba(96,165,250,0); }
  100% { box-shadow: 0 0 0 0 rgba(96,165,250,0); }
`;

interface VoteButtonProps {
  voteCount: number;
  voted: boolean;
  disabled: boolean;
  onVote: () => void;
}

export const VoteButton: React.FC<VoteButtonProps> = React.memo(
  ({ voteCount, voted, disabled, onVote }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const tooltip = disabled ? 'Log in to vote' : voted ? 'Remove vote' : 'Upvote this roster';
    const [animating, setAnimating] = React.useState(false);

    const handleClick = (): void => {
      if (disabled) return;
      setAnimating(true);
      onVote();
      setTimeout(() => setAnimating(false), 400);
    };

    return (
      <Tooltip title={tooltip} placement="top">
        <Box component="span" sx={{ display: 'inline-flex' }}>
          <ButtonBase
            onClick={handleClick}
            disabled={disabled}
            aria-label={tooltip}
            aria-pressed={voted}
            sx={{
              display: 'inline-flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 0.6,
              px: 1.25,
              py: 0.55,
              borderRadius: '999px',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transition: 'all 0.22s ease',
              animation: animating ? `${pulse} 0.4s ease` : 'none',

              ...(voted
                ? {
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(96,165,250,0.25) 0%, rgba(139,92,246,0.2) 100%)'
                      : 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(109,40,217,0.12) 100%)',
                    border: `1px solid ${isDark ? 'rgba(96,165,250,0.45)' : 'rgba(37,99,235,0.35)'}`,
                    boxShadow: isDark
                      ? '0 0 14px rgba(96,165,250,0.28), inset 0 1px 0 rgba(255,255,255,0.1)'
                      : '0 0 12px rgba(37,99,235,0.18), inset 0 1px 0 rgba(255,255,255,0.6)',
                    color: isDark ? '#93c5fd' : '#1d4ed8',
                  }
                : {
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    boxShadow: isDark
                      ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.8)',
                    color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                  }),

              '&:hover:not(.Mui-disabled)': voted
                ? {
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(96,165,250,0.32) 0%, rgba(139,92,246,0.26) 100%)'
                      : 'linear-gradient(135deg, rgba(37,99,235,0.22) 0%, rgba(109,40,217,0.16) 100%)',
                    boxShadow: isDark
                      ? '0 0 20px rgba(96,165,250,0.4), inset 0 1px 0 rgba(255,255,255,0.12)'
                      : '0 0 16px rgba(37,99,235,0.28), inset 0 1px 0 rgba(255,255,255,0.7)',
                    transform: 'translateY(-1px)',
                  }
                : {
                    background: isDark ? 'rgba(96,165,250,0.1)' : 'rgba(37,99,235,0.07)',
                    border: `1px solid ${isDark ? 'rgba(96,165,250,0.32)' : 'rgba(37,99,235,0.22)'}`,
                    color: isDark ? '#93c5fd' : '#1d4ed8',
                    transform: 'translateY(-1px)',
                  },

              '&:active:not(.Mui-disabled)': { transform: 'scale(0.94)' },
              '&.Mui-disabled': { opacity: 0.3, cursor: 'default' },
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                animation: animating ? `${pop} 0.4s cubic-bezier(0.34,1.56,0.64,1)` : 'none',
              }}
            >
              <KeyboardArrowUp sx={{ fontSize: 16, transition: 'color 0.22s ease' }} />
            </Box>
            <Typography
              component="span"
              sx={{
                fontSize: '0.78rem',
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '0.01em',
                transition: 'color 0.22s ease',
              }}
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
