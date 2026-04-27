import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import StopIcon from '@mui/icons-material/Stop';
import { Box, IconButton, InputBase } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import React, { useCallback, useRef, useState, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop, isStreaming, disabled }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
    inputRef.current?.focus();
  }, [value, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const hasContent = value.trim().length > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        p: 1.5,
        pl: 2.5,
        borderRadius: '24px',
        bgcolor: (t: Theme) => t.palette.mode === 'dark'
          ? 'rgba(15, 23, 42, 0.84)'
          : 'rgba(255, 255, 255, 0.84)',
        border: 1,
        borderColor: (t: Theme) => t.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.09)'
          : 'rgba(15, 23, 42, 0.13)',
        backdropFilter: 'blur(16px)',
        boxShadow: (t: Theme) =>
          t.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            : '0 4px 24px rgba(15, 23, 42, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        '&:focus-within': {
          borderColor: (t: Theme) => t.palette.mode === 'dark'
            ? 'rgba(56, 189, 248, 0.35)'
            : 'rgba(15, 23, 42, 0.20)',
          boxShadow: (t: Theme) =>
            t.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.32), 0 0 0 2px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              : '0 4px 24px rgba(15, 23, 42, 0.10), 0 0 0 2px rgba(56, 189, 248, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
        },
      }}
    >
      <InputBase
        inputRef={inputRef}
        fullWidth
        multiline
        maxRows={5}
        placeholder="Ask about ESO builds, weapons, traits, enchants..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        sx={{
          fontSize: '0.938rem',
          lineHeight: 1.5,
          py: 0.5,
          '& .MuiInputBase-input': {
            '&::placeholder': {
              opacity: 0.4,
            },
          },
        }}
      />
      {isStreaming ? (
        <IconButton
          onClick={onStop}
          size="small"
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            bgcolor: (t: Theme) => alpha(t.palette.error.main, 0.15),
            color: 'error.main',
            '&:hover': {
              bgcolor: (t: Theme) => alpha(t.palette.error.main, 0.25),
            },
          }}
        >
          <StopIcon sx={{ fontSize: 18 }} />
        </IconButton>
      ) : (
        <IconButton
          onClick={handleSend}
          size="small"
          disabled={!hasContent}
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            bgcolor: hasContent
              ? 'primary.main'
              : (t: Theme) => alpha(t.palette.text.primary, 0.06),
            color: hasContent
              ? 'primary.contrastText'
              : (t: Theme) => alpha(t.palette.text.primary, 0.25),
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: hasContent
                ? 'primary.dark'
                : (t: Theme) => alpha(t.palette.text.primary, 0.1),
            },
            '&.Mui-disabled': {
              bgcolor: (t: Theme) => alpha(t.palette.text.primary, 0.06),
              color: (t: Theme) => alpha(t.palette.text.primary, 0.2),
            },
          }}
        >
          <ArrowUpwardIcon sx={{ fontSize: 18 }} />
        </IconButton>
      )}
    </Box>
  );
};
