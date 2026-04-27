import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import { IconButton, InputAdornment, TextField } from '@mui/material';
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

  return (
    <TextField
      inputRef={inputRef}
      fullWidth
      multiline
      maxRows={4}
      placeholder="Ask about ESO builds, weapons, traits, enchants..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              {isStreaming ? (
                <IconButton onClick={onStop} size="small" color="error">
                  <StopIcon />
                </IconButton>
              ) : (
                <IconButton
                  onClick={handleSend}
                  size="small"
                  disabled={!value.trim()}
                  color="primary"
                >
                  <SendIcon />
                </IconButton>
              )}
            </InputAdornment>
          ),
        },
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          bgcolor: (t: Theme) => alpha(t.palette.background.paper, 0.6),
          backdropFilter: 'blur(8px)',
          borderRadius: 2,
        },
      }}
    />
  );
};
