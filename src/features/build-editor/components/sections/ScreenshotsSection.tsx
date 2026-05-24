/**
 * Screenshots Section — character stat screenshots with AnimatePresence transitions.
 */

import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { Box, Button, Grid, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useSnackbar } from 'notistack';
import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectActiveSetup } from '../../store/buildEditorSelectors';
import { addScreenshot, removeScreenshot } from '../../store/buildEditorSlice';

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5 MB

const ScreenshotsSectionComponent: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();
  const { enqueueSnackbar } = useSnackbar();
  const setup = useSelector(selectActiveSetup);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (!files) return;
    if (!setup) return;
    Array.from(files).forEach((file) => {
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
    e.target.value = '';
  };

  if (!setup) return null;

  return (
    <Stack spacing={1.5}>
      <Typography
        variant="caption"
       
        sx={{ color: 'text.disabled', fontSize: 10, fontFamily: 'Space Grotesk, Inter, system-ui' }}
      >
        Screenshots of character stats, gear, or skills.
      </Typography>

      {setup.screenshots.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
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
            Upload
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
            sx={{
              alignSelf: 'flex-start',
              fontSize: 11,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 600,
              borderRadius: '99px',
              textTransform: 'none',
              borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
              color: 'var(--be-accent, #38bdf8)',
              '&:hover': {
                borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.40)',
                background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
              },
            }}
            onClick={() => inputRef.current?.click()}
          >
            Add More
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

export const ScreenshotsSection = React.memo(ScreenshotsSectionComponent);
