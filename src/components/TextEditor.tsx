import { Box, Typography, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';

const TextEditorFrame = styled('iframe')(({ theme }) => ({
  width: '100%',
  height: '80vh',
  border: 'none',
  borderRadius: theme.spacing(1),
  boxShadow: theme.shadows[4],
}));

const TextEditorContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
}));

export const TextEditor: React.FC = () => {
  return (
    <TextEditorContainer>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            mb: 3,
            textAlign: 'center',
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)'
                : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          📝 Text Editor
        </Typography>
        <Typography
          variant="body1"
          sx={{
            textAlign: 'center',
            color: 'text.secondary',
            mb: 3,
          }}
        >
          ESO/WoW Text Preview Tool - Format your text with colors and see a live preview
        </Typography>
        <TextEditorFrame src="/src/assets/text-editor/text-editor.html" title="ESO Text Editor" />
      </Container>
    </TextEditorContainer>
  );
};
