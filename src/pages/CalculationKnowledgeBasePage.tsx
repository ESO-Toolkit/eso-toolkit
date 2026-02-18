import { InfoOutlined } from '@mui/icons-material';
import { Alert, Box, Container, Divider, Link, Typography, useTheme } from '@mui/material';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import knowledgeBaseContent from '../../documentation/features/calculations/CALCULATION_KNOWLEDGE_BASE.md?raw';

const markdownStyles = {
  '& h1': {
    fontSize: { xs: '1.875rem', md: '2.25rem' },
    fontWeight: 700,
    mt: 4,
    mb: 2,
  },
  '& h2': {
    fontSize: { xs: '1.5rem', md: '1.875rem' },
    fontWeight: 600,
    mt: 4,
    mb: 1.5,
  },
  '& h3': {
    fontSize: { xs: '1.25rem', md: '1.5rem' },
    fontWeight: 600,
    mt: 3,
    mb: 1.25,
  },
  '& h4': {
    fontSize: { xs: '1.1rem', md: '1.25rem' },
    fontWeight: 600,
    mt: 3,
    mb: 1,
  },
  '& p': {
    fontSize: '1rem',
    lineHeight: 1.7,
    mb: 2,
  },
  '& ul, & ol': {
    pl: 3,
    mb: 2,
  },
  '& li': {
    mb: 0.75,
  },
  '& table': {
    width: '100%',
    borderCollapse: 'collapse',
    mb: 3,
    overflowX: 'auto',
    display: 'block',
  },
  '& thead': {
    backgroundColor: 'action.hover',
  },
  '& th, & td': {
    border: (theme: { palette: { divider: string } }) => `1px solid ${theme.palette.divider}`,
    padding: '8px 12px',
    textAlign: 'left',
    verticalAlign: 'top',
  },
  '& code': {
    fontFamily: "Consolas, Monaco, 'Fira Code', monospace",
    backgroundColor: 'action.hover',
    borderRadius: 1,
    px: 0.5,
    py: 0.25,
    fontSize: '0.95em',
  },
  '& pre': {
    backgroundColor: 'action.hover',
    borderRadius: 2,
    p: 2,
    overflowX: 'auto',
    mb: 3,
  },
  '& blockquote': {
    borderLeft: (theme: { palette: { primary: { main: string } } }) =>
      `4px solid ${theme.palette.primary.main}`,
    pl: 2,
    ml: 0,
    color: 'text.secondary',
    fontStyle: 'italic',
    backgroundColor: 'action.hover',
    py: 1,
    pr: 2,
    borderRadius: 1,
    mb: 3,
  },
  '& a': {
    color: 'primary.main',
    fontWeight: 600,
  },
} as const;

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <Link {...props} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </Link>
  ),
};

export const CalculationKnowledgeBasePage: React.FC = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Box display="flex" flexDirection="column" gap={2} mb={4}>
        <Typography variant="h3" component="h1" fontWeight={800} gutterBottom>
          Calculation Knowledge Base
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Explore how ESO Toolkit derives combat analytics, where data comes from, and how we
          transform logs into actionable insights.
        </Typography>
        <Alert
          icon={<InfoOutlined fontSize="small" />}
          severity="info"
          sx={{
            borderLeft: `4px solid ${theme.palette.primary.main}`,
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(59, 130, 246, 0.12)'
                : 'rgba(59, 130, 246, 0.08)',
          }}
        >
          This content mirrors the internal documentation in{' '}
          <Link
            href="https://github.com/ESO-Toolkit/eso-toolkit"
            target="_blank"
            rel="noopener noreferrer"
          >
            documentation/features/calculations/CALCULATION_KNOWLEDGE_BASE.md
          </Link>
          . Updates to the source file are automatically reflected here at build time.
        </Alert>
      </Box>

      <Divider sx={{ mb: 4 }} />

      <Box sx={markdownStyles}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {knowledgeBaseContent}
        </ReactMarkdown>
      </Box>
    </Container>
  );
};
