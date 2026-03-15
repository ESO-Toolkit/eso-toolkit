/**
 * Guide Section — rich text guide, YouTube link, banner image URL.
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
    <Stack spacing={3}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
          Build Guide
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
          Explain your gear choices, rotation, tips, alternatives, etc. Players appreciate detailed guides.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={10}
          size="small"
          placeholder="Write your guide here…"
          value={guide.content}
          onChange={(e) => dispatch(setGuideContent(e.target.value))}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
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
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
          Banner Image URL
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="https://… (banner image for your build)"
          value={guide.bannerImageUrl}
          onChange={(e) => dispatch(setGuideBannerUrl(e.target.value))}
        />
        {guide.bannerImageUrl && isValidHttpUrl(guide.bannerImageUrl) && (
          <img
            src={guide.bannerImageUrl}
            alt="Banner preview"
            style={{
              marginTop: 12,
              width: '100%',
              maxHeight: 160,
              objectFit: 'cover',
              borderRadius: 8,
              display: 'block',
            }}
          />
        )}
        {guide.bannerImageUrl && !isValidHttpUrl(guide.bannerImageUrl) && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="error.main">
              Invalid URL — must start with http:// or https://
            </Typography>
          </Box>
        )}
      </Box>
    </Stack>
  );
};
