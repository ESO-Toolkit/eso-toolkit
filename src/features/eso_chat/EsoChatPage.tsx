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
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem', fontFamily: 'Space Grotesk, Inter, system-ui' }}>
            ESO AI Chat
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.35, fontSize: '0.7rem', letterSpacing: 0.3 }}>
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
            '&::-webkit-scrollbar': { display: 'none !important' },
            scrollbarWidth: 'none !important',
            msOverflowStyle: 'none',
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
              bgcolor: (t: Theme) => t.palette.mode === 'dark'
                ? 'rgba(15, 23, 42, 0.90)'
                : 'rgba(255, 255, 255, 0.90)',
              backdropFilter: 'blur(16px)',
              border: 1,
              borderColor: (t: Theme) => t.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.09)'
                : 'rgba(15, 23, 42, 0.10)',
              boxShadow: (t: Theme) => t.palette.mode === 'dark'
                ? '0 4px 16px rgba(0, 0, 0, 0.3)'
                : '0 2px 8px rgba(15, 23, 42, 0.08)',
              '&:hover': {
                bgcolor: (t: Theme) => t.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.95)'
                  : 'rgba(255, 255, 255, 0.95)',
                borderColor: (t: Theme) => t.palette.mode === 'dark'
                  ? 'rgba(56, 189, 248, 0.25)'
                  : 'rgba(15, 23, 42, 0.15)',
              },
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
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, opacity: 0.8, fontSize: '1.25rem', fontFamily: 'Space Grotesk, Inter, system-ui' }}>
        What would you like to know?
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.4, fontSize: '0.85rem', maxWidth: 340, mx: 'auto', letterSpacing: 0.1 }}>
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
            borderRadius: '12px',
            border: 1,
            borderColor: (t: Theme) => t.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.09)'
              : 'rgba(15, 23, 42, 0.10)',
            bgcolor: (t: Theme) => t.palette.mode === 'dark'
              ? 'rgba(15, 23, 42, 0.84)'
              : 'rgba(255, 255, 255, 0.84)',
            backdropFilter: 'blur(16px)',
            boxShadow: (t: Theme) => t.palette.mode === 'dark'
              ? '0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              : '0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            textAlign: 'left',
            display: 'block',
            transition: 'all 0.25s ease',
            '&:hover': {
              borderColor: (t: Theme) => t.palette.mode === 'dark'
                ? 'rgba(56, 189, 248, 0.3)'
                : 'rgba(15, 23, 42, 0.15)',
              transform: 'translateY(-3px)',
              boxShadow: (t: Theme) => t.palette.mode === 'dark'
                ? '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 60px rgba(56, 189, 248, 0.08)'
                : '0 6px 20px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)',
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
