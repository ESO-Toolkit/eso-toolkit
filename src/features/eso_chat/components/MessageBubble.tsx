import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PersonIcon from '@mui/icons-material/Person';
import { Avatar, Box, Paper, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import React, { type ComponentPropsWithoutRef } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { ChatMessage } from '../types';

import { SourcesPanel } from './SourcesPanel';

const mdComponents: Components = {
  h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <Typography
      variant="subtitle1"
      component="h3"
      {...props}
      sx={{
        fontWeight: 700,
        mt: 2,
        mb: 1,
        pb: 0.5,
        borderBottom: 2,
        borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.25),
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
        mt: 1.5,
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
        my: 1.5,
        p: 1.5,
        pl: 2,
        borderLeft: 3,
        borderColor: 'primary.main',
        bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.06),
        borderRadius: '0 8px 8px 0',
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
    <Box sx={{ overflowX: 'auto', my: 1.5, borderRadius: 1, border: 1, borderColor: (t: Theme) => alpha(t.palette.divider, 0.15) }}>
      <Box component="table" {...props} sx={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem' }}>
        {children}
      </Box>
    </Box>
  ),
  thead: ({ children, ...props }: ComponentPropsWithoutRef<'thead'>) => (
    <Box
      component="thead"
      {...props}
      sx={{
        bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.1),
        '& th': {
          px: 1.5,
          py: 0.75,
          fontWeight: 700,
          textAlign: 'left',
          borderBottom: 2,
          borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.2),
          whiteSpace: 'nowrap',
          fontSize: '0.78rem',
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
          px: 1.5,
          py: 0.6,
          borderBottom: 1,
          borderColor: (t: Theme) => alpha(t.palette.divider, 0.08),
          fontSize: '0.8rem',
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
        my: 0.75,
        '& li': { mb: 0.5 },
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
        my: 0.75,
        '& li': { mb: 0.5 },
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
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming }) => {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
        gap: 1.5,
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: (t: Theme) =>
            alpha(t.palette.primary.main, isUser ? 0.2 : 0),
          color: isUser ? 'primary.main' : 'secondary.main',
          flexShrink: 0,
          mt: 0.5,
          ...(!isUser && {
            bgcolor: (t: Theme) => alpha(t.palette.secondary.main, 0.2),
          }),
        }}
      >
        {isUser ? <PersonIcon sx={{ fontSize: 18 }} /> : <AutoAwesomeIcon sx={{ fontSize: 18 }} />}
      </Avatar>

      <Box sx={{ maxWidth: isUser ? '75%' : '85%', minWidth: 0 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: isUser
              ? (t: Theme) => alpha(t.palette.primary.main, 0.08)
              : (t: Theme) => alpha(t.palette.background.paper, 0.6),
            border: 1,
            borderColor: isUser
              ? (t: Theme) => alpha(t.palette.primary.main, 0.15)
              : (t: Theme) => alpha(t.palette.divider, 0.12),
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
          }}
        >
          {isUser ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
          ) : (
            <Box
              sx={{
                '& p': { mt: 0, mb: 1, '&:last-child': { mb: 0 } },
                '& code': {
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  bgcolor: (t: Theme) => alpha(t.palette.common.white, 0.06),
                  fontSize: '0.85em',
                  fontFamily: 'monospace',
                },
                '& pre': {
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: (t: Theme) => alpha(t.palette.common.black, 0.3),
                  overflow: 'auto',
                  my: 1,
                  '& code': { bgcolor: 'transparent', p: 0 },
                },
                fontSize: '0.875rem',
                lineHeight: 1.7,
              }}
            >
              <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {message.content || (isStreaming ? '...' : '')}
              </Markdown>
            </Box>
          )}
        </Paper>

        {message.sources &&
          (message.sources.buildStats.length > 0 ||
            message.sources.knowledgeDocs.length > 0) && (
            <SourcesPanel sources={message.sources} />
          )}
      </Box>
    </Box>
  );
};
