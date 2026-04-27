import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from '@mui/icons-material/Done';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PersonIcon from '@mui/icons-material/Person';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import { Avatar, Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import React, { type ComponentPropsWithoutRef, useCallback, useMemo, useState } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { ChatMessage } from '../types';

import { SourcesPanel } from './SourcesPanel';

const FOLLOW_UP_PATTERN = /(?:^|\n)(?:Want to |Ask me about |Would you like )[^\n?]*\?/g;
const TRAILING_SUGGESTIONS_PATTERN = /(?:\n\s*(?:Want to |Ask me about |Would you like |Shall I )[^\n?]*\?[\s]*)+$/;

function extractFollowUps(content: string): { cleanContent: string; suggestions: string[] } {
  const suggestions: string[] = [];
  const matches = content.match(FOLLOW_UP_PATTERN);
  if (matches) {
    for (const m of matches) {
      const trimmed = m.trim().replace(/^[-*•]\s*/, '');
      if (trimmed.length > 10 && trimmed.length < 200) {
        suggestions.push(trimmed);
      }
    }
  }
  const cleanContent = content.replace(TRAILING_SUGGESTIONS_PATTERN, '').trimEnd();
  return { cleanContent, suggestions };
}

const mdComponents: Components = {
  h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <Typography
      variant="subtitle1"
      component="h3"
      {...props}
      sx={{
        fontWeight: 700,
        fontSize: '1.05rem',
        mt: 2.5,
        mb: 1,
        pb: 0.5,
        borderBottom: 2,
        borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.2),
        '&:first-of-type': { mt: 0.5 },
      }}
    >
      {children}
    </Typography>
  ),
  h4: ({ children, ...props }: ComponentPropsWithoutRef<'h4'>) => (
    <Typography
      variant="subtitle2"
      component="h4"
      {...props}
      sx={{
        fontWeight: 600,
        fontSize: '0.95rem',
        mt: 2,
        mb: 0.5,
        pl: 1,
        borderLeft: 3,
        borderColor: (t: Theme) => alpha(t.palette.secondary.main, 0.4),
      }}
    >
      {children}
    </Typography>
  ),
  blockquote: ({ children, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
    <Box
      component="blockquote"
      {...props}
      sx={{
        m: 0,
        my: 2,
        p: 2,
        pl: 2.5,
        borderLeft: 3,
        borderColor: 'primary.main',
        bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.06),
        borderRadius: '0 12px 12px 0',
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        '& p': { m: 0 },
      }}
    >
      <InfoOutlinedIcon sx={{ fontSize: 16, mt: 0.3, color: 'primary.main', flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Box>
  ),
  table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
    <Box sx={{ overflowX: 'auto', my: 2, borderRadius: 1.5, border: 1, borderColor: (t: Theme) => alpha(t.palette.divider, 0.12) }}>
      <Box component="table" {...props} sx={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
        {children}
      </Box>
    </Box>
  ),
  thead: ({ children, ...props }: ComponentPropsWithoutRef<'thead'>) => (
    <Box
      component="thead"
      {...props}
      sx={{
        bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.08),
        '& th': {
          px: 2,
          py: 1,
          fontWeight: 700,
          textAlign: 'left',
          borderBottom: 2,
          borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.15),
          whiteSpace: 'nowrap',
          fontSize: '0.83rem',
        },
      }}
    >
      {children}
    </Box>
  ),
  tbody: ({ children, ...props }: ComponentPropsWithoutRef<'tbody'>) => (
    <Box
      component="tbody"
      {...props}
      sx={{
        '& tr:nth-of-type(even)': {
          bgcolor: (t: Theme) => alpha(t.palette.common.white, 0.02),
        },
        '& td': {
          px: 2,
          py: 0.75,
          borderBottom: 1,
          borderColor: (t: Theme) => alpha(t.palette.divider, 0.06),
          fontSize: '0.85rem',
        },
      }}
    >
      {children}
    </Box>
  ),
  ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
    <Box
      component="ol"
      {...props}
      sx={{
        pl: 2.5,
        my: 1,
        '& li': { mb: 0.75, lineHeight: 1.65 },
        '& li::marker': { color: 'primary.main', fontWeight: 700 },
      }}
    >
      {children}
    </Box>
  ),
  ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
    <Box
      component="ul"
      {...props}
      sx={{
        pl: 2.5,
        my: 1,
        '& li': { mb: 0.75, lineHeight: 1.65 },
        '& li::marker': { color: 'secondary.main' },
      }}
    >
      {children}
    </Box>
  ),
  strong: ({ children, ...props }: ComponentPropsWithoutRef<'strong'>) => (
    <Box
      component="strong"
      {...props}
      sx={{
        fontWeight: 700,
        color: (t: Theme) => t.palette.mode === 'dark' ? t.palette.primary.light : t.palette.primary.main,
      }}
    >
      {children}
    </Box>
  ),
};

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  statusText?: string | null;
  onSuggestionClick?: (suggestion: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming, statusText, onSuggestionClick }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const { cleanContent, suggestions } = useMemo(() => {
    if (isUser || isStreaming || !message.content) {
      return { cleanContent: message.content, suggestions: [] };
    }
    return extractFollowUps(message.content);
  }, [isUser, isStreaming, message.content]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  return (
    <Box sx={{ mb: 1 }}>
      {isUser ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            mb: 0.5,
          }}
        >
          <Box
            sx={{
              maxWidth: '80%',
              px: 2.5,
              py: 1.5,
              borderRadius: '20px',
              bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.12),
              border: 1,
              borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.08),
            }}
          >
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                fontSize: '0.938rem',
                lineHeight: 1.6,
              }}
            >
              {message.content}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ py: 1.5 }}>
          {/* Assistant header */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: (t: Theme) => alpha(t.palette.secondary.main, 0.15),
                color: 'secondary.main',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 14 }} />
            </Avatar>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontSize: '0.8rem',
                opacity: 0.7,
                letterSpacing: 0.3,
              }}
            >
              ESO AI
            </Typography>
          </Stack>

          {/* Assistant content — full width, no bubble */}
          <Box
            sx={{
              pl: 4.5,
              '& p': { mt: 0, mb: 1.25, '&:last-child': { mb: 0 } },
              '& code': {
                px: 0.75,
                py: 0.25,
                borderRadius: 0.75,
                bgcolor: (t: Theme) => alpha(t.palette.common.white, 0.06),
                fontSize: '0.85em',
                fontFamily: 'monospace',
              },
              '& pre': {
                p: 2,
                borderRadius: 1.5,
                bgcolor: (t: Theme) => alpha(t.palette.common.black, 0.3),
                overflow: 'auto',
                my: 1.5,
                '& code': { bgcolor: 'transparent', p: 0 },
              },
              fontSize: '0.938rem',
              lineHeight: 1.65,
              color: (t: Theme) => alpha(t.palette.text.primary, 0.9),
            }}
          >
            {!cleanContent && isStreaming ? (
              <TypingIndicator statusText={statusText} />
            ) : (
              <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {cleanContent || ''}
              </Markdown>
            )}
          </Box>

          {/* Post-response action row */}
          {!isStreaming && message.content && (
            <Stack
              direction="row"
              spacing={0.5}
              className="action-row"
              sx={{
                pl: 4.5,
                mt: 1,
                opacity: 0,
                transition: 'opacity 0.2s',
                '&:focus-within': { opacity: 1 },
              }}
            >
              <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                <IconButton
                  onClick={handleCopy}
                  size="small"
                  sx={{
                    color: (t: Theme) => alpha(t.palette.text.primary, 0.35),
                    '&:hover': { color: 'text.primary', bgcolor: (t: Theme) => alpha(t.palette.text.primary, 0.06) },
                    p: 0.75,
                  }}
                >
                  {copied ? <DoneIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Good response">
                <IconButton
                  size="small"
                  sx={{
                    color: (t: Theme) => alpha(t.palette.text.primary, 0.35),
                    '&:hover': { color: 'success.main', bgcolor: (t: Theme) => alpha(t.palette.success.main, 0.08) },
                    p: 0.75,
                  }}
                >
                  <ThumbUpOffAltIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Bad response">
                <IconButton
                  size="small"
                  sx={{
                    color: (t: Theme) => alpha(t.palette.text.primary, 0.35),
                    '&:hover': { color: 'error.main', bgcolor: (t: Theme) => alpha(t.palette.error.main, 0.08) },
                    p: 0.75,
                  }}
                >
                  <ThumbDownOffAltIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          {/* Follow-up suggestions */}
          {suggestions.length > 0 && onSuggestionClick && (
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.5, pl: 4.5 }}>
              {suggestions.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => onSuggestionClick(s)}
                  sx={{
                    fontSize: '0.8rem',
                    height: 32,
                    borderRadius: '16px',
                    borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.2),
                    color: (t: Theme) => alpha(t.palette.text.primary, 0.75),
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.06),
                    },
                  }}
                />
              ))}
            </Stack>
          )}

          {/* Sources */}
          {message.sources &&
            (message.sources.buildStats.length > 0 ||
              message.sources.knowledgeDocs.length > 0) && (
              <Box sx={{ pl: 4.5, mt: 1 }}>
                <SourcesPanel sources={message.sources} />
              </Box>
            )}
        </Box>
      )}
    </Box>
  );
};

const TypingIndicator: React.FC<{ statusText?: string | null }> = ({ statusText }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
    <Stack direction="row" spacing={0.5}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.6),
            animation: 'typingDot 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
            '@keyframes typingDot': {
              '0%, 60%, 100%': { opacity: 0.3, transform: 'translateY(0)' },
              '30%': { opacity: 1, transform: 'translateY(-4px)' },
            },
          }}
        />
      ))}
    </Stack>
    {statusText && (
      <Typography
        variant="caption"
        sx={{
          opacity: 0.5,
          fontSize: '0.75rem',
          animation: 'fadeIn 0.3s ease-in',
          '@keyframes fadeIn': {
            from: { opacity: 0 },
            to: { opacity: 0.5 },
          },
        }}
      >
        {statusText}
      </Typography>
    )}
  </Stack>
);
