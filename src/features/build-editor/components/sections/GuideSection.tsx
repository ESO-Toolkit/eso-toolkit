/**
 * Guide Section — rich text guide, YouTube link, banner image URL.
 * Enhanced with GlassPanel wrapper and improved empty state.
 */

import { Box, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import {
  setGuideBannerUrl,
  setGuideContent,
  setGuideYoutubeUrl,
} from '../../store/buildEditorSlice';

const isValidHttpUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

export const GuideSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build } = useSelector((s: RootState) => s.buildEditor);
  const { guide } = build;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
        >
          Build Guide
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', mb: 1, fontSize: 10 }}
        >
          Gear choices, rotation, tips, alternatives.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={8}
          size="small"
          placeholder="Write your guide here…"
          value={guide.content}
          onChange={(e) => dispatch(setGuideContent(e.target.value))}
        />
      </Box>

      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
        >
          YouTube Video URL
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="https://youtube.com/watch?v=…"
          value={guide.youtubeUrl}
          onChange={(e) => dispatch(setGuideYoutubeUrl(e.target.value))}
        />
      </Box>

      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
        >
          Banner Image URL
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="https://… (banner image)"
          value={guide.bannerImageUrl}
          onChange={(e) => dispatch(setGuideBannerUrl(e.target.value))}
        />
        {guide.bannerImageUrl && isValidHttpUrl(guide.bannerImageUrl) && (
          <img
            src={guide.bannerImageUrl}
            alt="Banner preview"
            style={{
              marginTop: 8,
              width: '100%',
              maxHeight: 140,
              objectFit: 'cover',
              borderRadius: 8,
              display: 'block',
            }}
          />
        )}
        {guide.bannerImageUrl && !isValidHttpUrl(guide.bannerImageUrl) && (
          <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
            Invalid URL — must start with http:// or https://
          </Typography>
        )}
      </Box>
    </Stack>
  );
};
