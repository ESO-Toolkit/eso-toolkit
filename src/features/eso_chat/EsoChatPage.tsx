import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import React, { useCallback, useEffect, useRef } from 'react';

import { ChatInput } from './components/ChatInput';
import { MessageBubble } from './components/MessageBubble';
import { useEsoChat } from './hooks/useEsoChat';
import type { ChatMessage } from './types';

const SUGGESTIONS = [
  "What's the best DPS build for trials?",
  'Explain the Power Lash / off-balance mechanic',
  'What mundus stone should I use for DPS?',
  'Best gear sets for a Dragonknight DPS?',
];

export const EsoChatPage: React.FC = () => {
  const { messages, isStreaming, error, sendMessage, stopStreaming, clearChat } = useEsoChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleRetry = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  }, [messages, sendMessage]);

  return (
    <Container maxWidth="md" sx={{ height: '100%', display: 'flex', flexDirection: 'column', py: 2 }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            ESO AI Chat
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.5 }}>
            Powered by ESO Logs data
          </Typography>
        </Stack>
        {messages.length > 0 && (
          <Tooltip title="Clear chat">
            <IconButton onClick={clearChat} size="small">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* Messages area */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          mb: 2,
          px: 1,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 3,
            bgcolor: (t: Theme) => alpha(t.palette.common.white, 0.1),
          },
        }}
      >
        {messages.length === 0 ? (
          <EmptyState onSuggestionClick={sendMessage} />
        ) : (
          messages.map((msg: ChatMessage, i: number) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
              onSuggestionClick={sendMessage}
            />
          ))
        )}
      </Box>

      {/* Error bar */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 1, flexShrink: 0 }}
          action={
            <Button size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Input */}
      <Box sx={{ flexShrink: 0 }}>
        <ChatInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
        />
      </Box>
    </Container>
  );
};

const EmptyState: React.FC<{ onSuggestionClick: (msg: string) => void }> = ({ onSuggestionClick }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      textAlign: 'center',
      gap: 3,
    }}
  >
    <AutoAwesomeIcon sx={{ fontSize: 48, opacity: 0.3 }} />
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5, opacity: 0.7 }}>
        Ask me about ESO builds
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.4 }}>
        I can help with weapon traits, enchants, gear optimization, and build strategy using real ESO
        Logs data.
      </Typography>
    </Box>
    <Stack spacing={1} sx={{ maxWidth: 400 }}>
      {SUGGESTIONS.map((s) => (
        <Button
          key={s}
          variant="outlined"
          size="small"
          onClick={() => onSuggestionClick(s)}
          sx={{
            textTransform: 'none',
            justifyContent: 'flex-start',
            borderColor: (t: Theme) => alpha(t.palette.divider, 0.15),
            fontSize: '0.8rem',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.05),
            },
          }}
        >
          {s}
        </Button>
      ))}
    </Stack>
  </Box>
);
