/**
 * Guide & Media Section — combined build guide (text, YouTube, banner) + screenshots.
 * Merges what were previously two separate section cards into one logical unit:
 * "documenting the build for readers."
 */

import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useSnackbar } from 'notistack';
import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectActiveSetup, selectBuildGuide } from '../../store/buildEditorSelectors';
import {
  addScreenshot,
  MAX_SCREENSHOTS,
  removeScreenshot,
  setGuideBannerUrl,
  setGuideContent,
  setGuideYoutubeUrl,
} from '../../store/buildEditorSlice';
import { glassInputSx } from '../primitives/glassInputSx';

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5 MB

/** Only allow HTTPS image URLs to prevent mixed-content and protocol-based attacks */
/** Returns the sanitized https URL string, or null if invalid/unsafe. */
const sanitizeImageUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
};

const sectionLabelSx = {
  fontWeight: 700,
  mb: 0.75,
  display: 'block',
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  fontFamily: 'Space Grotesk, Inter, system-ui',
};

const GuideSectionComponent: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();
  const { enqueueSnackbar } = useSnackbar();
  const setup = useSelector(selectActiveSetup);
  const guide = useSelector(selectBuildGuide);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (!files) return;
    if (!setup) return;
    const remaining = MAX_SCREENSHOTS - setup.screenshots.length;
    if (remaining <= 0) {
      enqueueSnackbar(`Screenshot limit reached (${MAX_SCREENSHOTS} max).`, { variant: 'warning' });
      e.target.value = '';
      return;
    }
    Array.from(files)
      .slice(0, remaining)
      .forEach((file) => {
        if (file.size > MAX_SCREENSHOT_SIZE) {
          enqueueSnackbar(`"${file.name}" exceeds 5 MB — please resize before uploading.`, {
            variant: 'warning',
          });
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            dispatch(addScreenshot(ev.target.result as string));
          }
        };
        reader.onerror = () =>
          enqueueSnackbar(`Failed to read "${file.name}".`, { variant: 'error' });
        reader.readAsDataURL(file);
      });
    if (files.length > remaining) {
      enqueueSnackbar(
        `Only ${remaining} screenshot${remaining === 1 ? '' : 's'} added — limit is ${MAX_SCREENSHOTS}.`,
        { variant: 'warning' },
      );
    }
    e.target.value = '';
  };

  if (!setup) return null;

  return (
    <Stack spacing={2.5}>
      {/* ── Guide text ───────────────────────────────────────────────── */}
      <Box>
        <Typography variant="caption" sx={{ ...(sectionLabelSx), color: 'text.secondary' }}>
          Build Guide
        </Typography>
        <Typography
          variant="caption"
         
          sx={{ color: 'text.disabled',
            display: 'block',
            mb: 1,
            fontSize: 10,
            fontFamily: 'Space Grotesk, Inter, system-ui',
          }}
        >
          Gear choices, rotation, tips, alternatives.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={6}
          size="small"
          placeholder="Write your guide here..."
          value={guide.content}
          onChange={(e) => dispatch(setGuideContent(e.target.value))}
          inputProps={{ 'aria-label': 'Build guide content', maxLength: 50000 }}
          sx={glassInputSx(isDark)}
        />
      </Box>

      {/* ── YouTube + Banner URL (side by side on desktop) ───────────── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ ...(sectionLabelSx), color: 'text.secondary' }}>
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
          <Typography variant="caption" sx={{ ...(sectionLabelSx), color: 'text.secondary' }}>
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
          {guide.bannerImageUrl && !sanitizeImageUrl(guide.bannerImageUrl) && (
            <Typography
              variant="caption"
             
              sx={{ color: 'error.main', mt: 0.5, display: 'block', fontFamily: 'Space Grotesk, Inter, system-ui' }}
            >
              Invalid URL — must start with https://
            </Typography>
          )}
        </Box>
      </Box>

      {/* Banner preview — src is the sanitized canonical URL, not raw user input */}
      {(() => {
        const safeBannerUrl = sanitizeImageUrl(guide.bannerImageUrl);
        return (
          safeBannerUrl && (
            <Box
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                border: `1px solid ${isDark ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)' : 'rgba(0,0,0,0.08)'}`,
                boxShadow: isDark
                  ? '0 4px 16px rgba(0,0,0,0.3), 0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                  : '0 4px 12px rgba(0,0,0,0.08)',
              }}
            >
              <img
                src={safeBannerUrl}
                alt="Banner preview"
                style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }}
              />
            </Box>
          )
        );
      })()}

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <Divider
        sx={{
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.9,
            textTransform: 'uppercase',
            color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            px: 1,
          }}
        >
          Screenshots
          {setup.screenshots.length > 0 ? ` (${setup.screenshots.length}/${MAX_SCREENSHOTS})` : ''}
        </Typography>
      </Divider>

      {/* ── Screenshots ──────────────────────────────────────────────── */}
      <Typography
        variant="caption"
       
        sx={{ color: 'text.disabled', fontSize: 10, fontFamily: 'Space Grotesk, Inter, system-ui', mt: -1 }}
      >
        Character stats, gear, or skills.
      </Typography>

      {setup.screenshots.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            border: `1px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 3,
          }}
        >
          <Typography
            variant="caption"
           
           
           
            sx={{ color: 'text.disabled', display: 'block', mb: 1.5, fontFamily: 'Space Grotesk, Inter, system-ui', fontStyle: 'italic' }}
          >
            No screenshots yet
          </Typography>
          <Button
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            variant="outlined"
            size="small"
            onClick={() => inputRef.current?.click()}
            sx={{
              fontSize: 11,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 600,
              borderRadius: '99px',
              textTransform: 'none',
              borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)',
              color: 'var(--be-accent, #38bdf8)',
              '&:hover': {
                borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.45)',
                background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
              },
            }}
          >
            Upload Screenshots
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={1}>
            <AnimatePresence>
              {setup.screenshots.map((src, i) => (
                <Grid size={{ xs: 6, sm: 4 }} key={src.slice(0, 48) + i}>
                  <motion.div
                    layout={!prefersReduced}
                    initial={prefersReduced ? false : { scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={prefersReduced ? undefined : { scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        borderRadius: 2.5,
                        overflow: 'hidden',
                        border: `1px solid ${isDark ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.15)' : 'rgba(0,0,0,0.08)'}`,
                        boxShadow: isDark
                          ? '0 4px 14px rgba(0,0,0,0.3)'
                          : '0 4px 12px rgba(0,0,0,0.08)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: isDark
                            ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)'
                            : 'rgba(0,0,0,0.15)',
                          boxShadow: isDark
                            ? '0 8px 24px rgba(0,0,0,0.4), 0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)'
                            : '0 8px 20px rgba(0,0,0,0.12)',
                        },
                        '&:hover .remove-btn': { opacity: 1 },
                      }}
                    >
                      <img
                        src={src}
                        alt={`Screenshot ${i + 1}`}
                        style={{
                          width: '100%',
                          aspectRatio: '16/9',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      <Tooltip title="Remove">
                        <IconButton
                          className="remove-btn"
                          size="small"
                          aria-label="Remove screenshot"
                          onClick={() => dispatch(removeScreenshot(i))}
                          sx={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 26,
                            height: 26,
                            opacity: 0,
                            transition: 'opacity 0.15s',
                            background: 'rgba(0,0,0,0.72)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#fff',
                            '&:hover': {
                              background: alpha('#ef4444', 0.85),
                              borderColor: alpha('#ef4444', 0.5),
                            },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>

          <Button
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            variant="outlined"
            size="small"
            disabled={setup.screenshots.length >= MAX_SCREENSHOTS}
            onClick={() => inputRef.current?.click()}
            sx={{
              alignSelf: 'flex-start',
              fontSize: 11,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 600,
              borderRadius: '99px',
              textTransform: 'none',
              borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
              color: 'var(--be-accent, #38bdf8)',
              '&:hover:not(:disabled)': {
                borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.40)',
                background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
              },
            }}
          >
            {setup.screenshots.length >= MAX_SCREENSHOTS ? 'Limit reached' : 'Add More'}
          </Button>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Stack>
  );
};

export const GuideSection = React.memo(GuideSectionComponent);
