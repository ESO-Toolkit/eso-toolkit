import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Container,
  Fab,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import React, { useCallback } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';

import { ChatInput } from './components/ChatInput';
import { MessageBubble } from './components/MessageBubble';
import { useEsoChat } from './hooks/useEsoChat';
import type { ChatMessage } from './types';

const SUGGESTIONS = [
  { label: "What's the best DPS build for trials?", icon: '🗡️' },
  { label: 'Explain the Power Lash / off-balance mechanic', icon: '⚡' },
  { label: 'What mundus stone should I use for DPS?', icon: '✨' },
  { label: 'Best gear sets for a Dragonknight DPS?', icon: '🔥' },
];

export const EsoChatPage: React.FC = () => {
  const { messages, isStreaming, error, statusText, sendMessage, stopStreaming, clearChat } =
    useEsoChat();

  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom({
    resize: 'smooth',
    initial: 'smooth',
  });

  const handleRetry = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  }, [messages, sendMessage]);

  return (
    <Container maxWidth="md" sx={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', py: 2 }}>
      {/* Header — minimal */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1, flexShrink: 0 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <AutoAwesomeIcon sx={{ fontSize: 20, color: 'secondary.main' }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem' }}>
            ESO AI Chat
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.35, fontSize: '0.7rem' }}>
            Powered by ESO Logs data
          </Typography>
        </Stack>
        {messages.length > 0 && (
          <Tooltip title="Clear chat">
            <IconButton onClick={clearChat} size="small" sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* Messages area */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', mb: 1.5 }}>
        <Box
          ref={scrollRef}
          sx={{
            height: '100%',
            overflow: 'auto',
            px: 1,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 3,
              bgcolor: (t: Theme) => alpha(t.palette.common.white, 0.08),
            },
          }}
        >
          <Box ref={contentRef}>
            {messages.length === 0 ? (
              <EmptyState onSuggestionClick={sendMessage} />
            ) : (
              messages.map((msg: ChatMessage, i: number) => (
                <Box key={msg.id} className="message-block" sx={{ '&:hover .action-row': { opacity: 1 } }}>
                  <MessageBubble
                    message={msg}
                    isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
                    statusText={
                      isStreaming && i === messages.length - 1 && msg.role === 'assistant'
                        ? statusText
                        : null
                    }
                    onSuggestionClick={sendMessage}
                  />
                </Box>
              ))
            )}
          </Box>
        </Box>

        {!isAtBottom && (
          <Fab
            size="small"
            onClick={() => scrollToBottom()}
            sx={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 36,
              height: 36,
              bgcolor: (t: Theme) => alpha(t.palette.background.paper, 0.9),
              backdropFilter: 'blur(8px)',
              boxShadow: 2,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <KeyboardArrowDownIcon fontSize="small" />
          </Fab>
        )}
      </Box>

      {/* Error bar */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 1, flexShrink: 0, borderRadius: 2 }}
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
      gap: 2.5,
    }}
  >
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, opacity: 0.8, fontSize: '1.25rem' }}>
        What would you like to know?
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.4, fontSize: '0.85rem', maxWidth: 340, mx: 'auto' }}>
        Weapon traits, enchants, gear optimization, and build strategy powered by real ESO Logs data.
      </Typography>
    </Box>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 1.25,
        maxWidth: 520,
        width: '100%',
      }}
    >
      {SUGGESTIONS.map((s) => (
        <ButtonBase
          key={s.label}
          onClick={() => onSuggestionClick(s.label)}
          sx={{
            p: 1.75,
            borderRadius: '14px',
            border: 1,
            borderColor: (t: Theme) => alpha(t.palette.divider, 0.1),
            bgcolor: (t: Theme) => alpha(t.palette.background.paper, 0.3),
            textAlign: 'left',
            display: 'block',
            transition: 'all 0.15s ease',
            '&:hover': {
              borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.3),
              bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.04),
              transform: 'translateY(-1px)',
            },
          }}
        >
          <Typography sx={{ fontSize: '1.1rem', mb: 0.75 }}>{s.icon}</Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.82rem',
              lineHeight: 1.4,
              opacity: 0.7,
            }}
          >
            {s.label}
          </Typography>
        </ButtonBase>
      ))}
    </Box>
  </Box>
);
