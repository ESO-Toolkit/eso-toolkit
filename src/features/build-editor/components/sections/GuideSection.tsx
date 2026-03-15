/**
 * Guide Section — glass-style text inputs with invisible-until-focus borders,
 * glass banner preview with rounded corners and border glow.
 */

import { Box, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import {
  setGuideBannerUrl,
  setGuideContent,
  setGuideYoutubeUrl,
} from '../../store/buildEditorSlice';

/** Only allow HTTPS image URLs to prevent mixed-content and protocol-based attacks */
const isValidImageUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Glass input styling shared across guide fields */
const glassInputSx = (isDark: boolean): Record<string, unknown> => ({
  '& .MuiOutlinedInput-root': {
    fontFamily: 'Space Grotesk, Inter, system-ui',
    fontSize: 13,
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'transparent',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--be-accent, #38bdf8)',
      borderWidth: '1px',
    },
  },
});

const sectionLabelSx = {
  fontWeight: 700,
  mb: 0.75,
  display: 'block',
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  fontFamily: 'Space Grotesk, Inter, system-ui',
};

export const GuideSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build } = useSelector((s: RootState) => s.buildEditor);
  const { guide } = build;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={sectionLabelSx}>
          Build Guide
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', mb: 1, fontSize: 10, fontFamily: 'Space Grotesk, Inter, system-ui' }}
        >
          Gear choices, rotation, tips, alternatives.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={8}
          size="small"
          placeholder="Write your guide here..."
          value={guide.content}
          onChange={(e) => dispatch(setGuideContent(e.target.value))}
          inputProps={{ 'aria-label': 'Build guide content', maxLength: 50000 }}
          sx={glassInputSx(isDark)}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={sectionLabelSx}>
          YouTube Video URL
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="https://youtube.com/watch?v=..."
          value={guide.youtubeUrl}
          onChange={(e) => dispatch(setGuideYoutubeUrl(e.target.value))}
          inputProps={{ 'aria-label': 'YouTube video URL' }}
          sx={glassInputSx(isDark)}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={sectionLabelSx}>
          Banner Image URL
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="https://... (banner image)"
          value={guide.bannerImageUrl}
          onChange={(e) => dispatch(setGuideBannerUrl(e.target.value))}
          inputProps={{ 'aria-label': 'Banner image URL' }}
          sx={glassInputSx(isDark)}
        />
        {guide.bannerImageUrl && isValidImageUrl(guide.bannerImageUrl) && (
          <Box
            sx={{
              mt: 1,
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${isDark ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: isDark
                ? '0 4px 16px rgba(0,0,0,0.3), 0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                : '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <img
              src={guide.bannerImageUrl}
              alt="Banner preview"
              style={{
                width: '100%',
                maxHeight: 160,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </Box>
        )}
        {guide.bannerImageUrl && !isValidImageUrl(guide.bannerImageUrl) && (
          <Typography
            variant="caption"
            color="error.main"
            sx={{ mt: 0.5, display: 'block', fontFamily: 'Space Grotesk, Inter, system-ui' }}
          >
            Invalid URL — must start with https://
          </Typography>
        )}
      </Box>
    </Stack>
  );
};
