import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from '@mui/icons-material/Done';
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

function stripMarkdownFormatting(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1').replace(/`(.+?)`/g, '$1');
}

function extractFollowUps(content: string): { cleanContent: string; suggestions: string[] } {
  const suggestions: string[] = [];
  const matches = content.match(FOLLOW_UP_PATTERN);
  if (matches) {
    for (const m of matches) {
      const trimmed = m.trim().replace(/^[-*•]\s*/, '');
      if (trimmed.length > 10 && trimmed.length < 200) {
        suggestions.push(stripMarkdownFormatting(trimmed));
      }
    }
  }
  const cleanContent = content.replace(TRAILING_SUGGESTIONS_PATTERN, '').trimEnd();
  return { cleanContent, suggestions };
}

const CodeBlock = ({ children, className }: ComponentPropsWithoutRef<'code'>) => {
  const [codeCopied, setCodeCopied] = useState(false);
  const match = /language-(\w+)/.exec(className ?? '');
  const lang = match?.[1];
  const isBlock = typeof children === 'string' && children.includes('\n');

  const handleCodeCopy = useCallback(async () => {
    await navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [children]);

  if (!isBlock && !lang) {
    return (
      <Box
        component="code"
        className={className}
        sx={{
          px: 0.75,
          py: 0.25,
          borderRadius: '4px',
          fontSize: '0.85em',
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          bgcolor: (t: Theme) => t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
        }}
      >
        {children}
      </Box>
    );
  }

  return (
    <Box sx={{
      position: 'relative', my: 2, borderRadius: '12px', overflow: 'hidden',
      border: 1,
      borderColor: (t: Theme) => t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(15, 23, 42, 0.10)',
      boxShadow: (t: Theme) => t.palette.mode === 'dark'
        ? '0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
        : '0 2px 8px rgba(15, 23, 42, 0.06)',
    }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 0.75,
          bgcolor: (t: Theme) => t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
          borderBottom: 1,
          borderColor: (t: Theme) => t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
          {lang ?? 'code'}
        </Typography>
        <Tooltip title={codeCopied ? 'Copied!' : 'Copy code'}>
          <IconButton
            onClick={handleCodeCopy}
            size="small"
            sx={{
              p: 0.5,
              color: (t: Theme) => alpha(t.palette.text.primary, 0.4),
              '&:hover': { color: 'text.primary' },
            }}
          >
            {codeCopied ? <DoneIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          bgcolor: (t: Theme) => t.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.30)' : 'rgba(0, 0, 0, 0.03)',
          overflow: 'auto',
          '& code': { bgcolor: 'transparent', p: 0, fontSize: '0.82rem', fontFamily: '"JetBrains Mono", "Fira Code", monospace', lineHeight: 1.6 },
        }}
      >
        <code className={className}>
          {children}
        </code>
      </Box>
    </Box>
  );
};

const mdComponents: Components = {
  h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <Typography
      variant="subtitle1"
      component="h3"
      {...props}
      sx={{
        fontWeight: 700,
        fontSize: '1.05rem',
        letterSpacing: '0.02em',
        mt: 3,
        mb: 1,
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
        letterSpacing: '0.01em',
        mt: 2.5,
        mb: 0.75,
        color: (t: Theme) => alpha(t.palette.text.primary, 0.85),
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
        my: 1.5,
        pl: 2,
        borderLeft: 2,
        borderColor: (t: Theme) => alpha(t.palette.text.secondary, 0.3),
        color: (t: Theme) => alpha(t.palette.text.primary, 0.75),
        fontStyle: 'italic',
        '& p': { m: 0 },
      }}
    >
      {children}
    </Box>
  ),
  table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
    <Box sx={{ overflowX: 'auto', my: 2 }}>
      <Box component="table" {...props} sx={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.88rem' }}>
        {children}
      </Box>
    </Box>
  ),
  thead: ({ children, ...props }: ComponentPropsWithoutRef<'thead'>) => (
    <Box
      component="thead"
      {...props}
      sx={{
        '& th': {
          px: 1.5,
          py: 0.75,
          fontWeight: 600,
          textAlign: 'left',
          borderBottom: 1,
          borderColor: (t: Theme) => alpha(t.palette.divider, 0.5),
          whiteSpace: 'nowrap',
          fontSize: '0.78rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'text.secondary',
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
        '& td': {
          px: 1.5,
          py: 0.75,
          borderBottom: 1,
          borderColor: (t: Theme) => alpha(t.palette.divider, 0.15),
          fontSize: '0.88rem',
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
        '& li': { mb: 0.5, lineHeight: 1.65 },
        '& li::marker': { color: 'text.secondary', fontWeight: 500, fontSize: '0.9em' },
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
        pl: 2,
        my: 1,
        listStyleType: '"–  "',
        '& li': { mb: 0.5, lineHeight: 1.65, pl: 0.5 },
        '& li::marker': { color: 'text.secondary' },
      }}
    >
      {children}
    </Box>
  ),
  strong: ({ children, ...props }: ComponentPropsWithoutRef<'strong'>) => (
    <Box
      component="strong"
      {...props}
      sx={{ fontWeight: 700 }}
    >
      {children}
    </Box>
  ),
  em: ({ children, ...props }: ComponentPropsWithoutRef<'em'>) => (
    <Box
      component="em"
      {...props}
      sx={{ color: (t: Theme) => alpha(t.palette.text.primary, 0.75) }}
    >
      {children}
    </Box>
  ),
  a: ({ children, href, ...props }: ComponentPropsWithoutRef<'a'>) => (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
      sx={{
        color: 'primary.main',
        textDecoration: 'none',
        fontWeight: 500,
        borderBottom: 1,
        borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.3),
        transition: 'border-color 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      {children}
    </Box>
  ),
  hr: ({ ...props }: ComponentPropsWithoutRef<'hr'>) => (
    <Box
      component="hr"
      {...props}
      sx={{
        border: 'none',
        height: '1px',
        bgcolor: (t: Theme) => alpha(t.palette.divider, 0.3),
        my: 2.5,
      }}
    />
  ),
  code: CodeBlock,
  pre: ({ children }: ComponentPropsWithoutRef<'pre'>) => <>{children}</>,
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

  const showStreamingCaret = isStreaming && !isUser && !!cleanContent;

  return (
    <Box sx={{ mb: 3 }}>
      {isUser ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Box
            sx={{
              maxWidth: '80%',
              px: 2.5,
              py: 1.5,
              borderRadius: '20px',
              background: (t: Theme) => t.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.14) 0%, rgba(0, 225, 255, 0.10) 100%)'
                : 'linear-gradient(135deg, rgba(15, 23, 42, 0.08) 0%, rgba(30, 41, 59, 0.05) 100%)',
              border: 1,
              borderColor: (t: Theme) => t.palette.mode === 'dark'
                ? 'rgba(56, 189, 248, 0.15)'
                : 'rgba(15, 23, 42, 0.10)',
              boxShadow: (t: Theme) => t.palette.mode === 'dark'
                ? '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04)'
                : '0 1px 4px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                fontSize: '1rem',
                lineHeight: 1.6,
              }}
            >
              {message.content}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ py: 1 }}>
          {/* Assistant header */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                background: (t: Theme) => t.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(0, 225, 255, 0.15))'
                  : 'linear-gradient(135deg, rgba(15, 23, 42, 0.10), rgba(30, 41, 59, 0.08))',
                color: (t: Theme) => t.palette.mode === 'dark' ? '#38bdf8' : '#0f172a',
                border: 1,
                borderColor: (t: Theme) => t.palette.mode === 'dark'
                  ? 'rgba(56, 189, 248, 0.20)'
                  : 'rgba(15, 23, 42, 0.10)',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 14 }} />
            </Avatar>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '0.8rem',
                opacity: 0.7,
                letterSpacing: 0.5,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                textTransform: 'uppercase',
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
              fontSize: '1rem',
              lineHeight: 1.65,
              color: (t: Theme) => alpha(t.palette.text.primary, 0.9),
            }}
          >
            {!cleanContent && isStreaming ? (
              <TypingIndicator statusText={statusText} />
            ) : (
              <>
                <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {cleanContent || ''}
                </Markdown>
                {showStreamingCaret && <StreamingCaret />}
              </>
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
                mt: 1.5,
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
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2, pl: 4.5 }}>
              {suggestions.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => onSuggestionClick(s)}
                  sx={{
                    fontSize: '0.82rem',
                    height: 34,
                    borderRadius: '17px',
                    borderColor: (t: Theme) => t.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.20)'
                      : 'rgba(15, 23, 42, 0.12)',
                    color: (t: Theme) => alpha(t.palette.text.primary, 0.75),
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: (t: Theme) => t.palette.mode === 'dark'
                        ? 'rgba(56, 189, 248, 0.45)'
                        : 'rgba(15, 23, 42, 0.25)',
                      bgcolor: (t: Theme) => t.palette.mode === 'dark'
                        ? 'rgba(56, 189, 248, 0.08)'
                        : 'rgba(15, 23, 42, 0.04)',
                      transform: 'translateY(-1px)',
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
              <Box sx={{ pl: 4.5, mt: 1.5 }}>
                <SourcesPanel sources={message.sources} />
              </Box>
            )}
        </Box>
      )}
    </Box>
  );
};

const StreamingCaret: React.FC = () => (
  <Box
    component="span"
    sx={{
      display: 'inline-block',
      color: 'primary.main',
      fontSize: '1rem',
      lineHeight: 1,
      ml: 0.25,
      animation: 'caretBlink 1s step-end infinite',
      '@keyframes caretBlink': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0 },
      },
    }}
  >
    ▋
  </Box>
);

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
            bgcolor: (t: Theme) => t.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.6)' : 'rgba(15, 23, 42, 0.4)',
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
