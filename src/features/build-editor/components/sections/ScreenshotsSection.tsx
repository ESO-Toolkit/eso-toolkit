/**
 * Screenshots Section — character stat screenshots with AnimatePresence transitions.
 */

import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { Box, Button, Grid, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { addScreenshot, removeScreenshot } from '../../store/buildEditorSlice';

export const ScreenshotsSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          dispatch(addScreenshot(ev.target.result as string));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
        Screenshots of character stats, gear, or skills.
      </Typography>

      {setup.screenshots.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            background: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
            border: `1px dashed ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06)}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="caption" color="text.disabled" mb={1.5} display="block">
            No screenshots yet
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            onClick={() => inputRef.current?.click()}
            sx={{ fontSize: 11 }}
          >
            Upload
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={1}>
            <AnimatePresence>
              {setup.screenshots.map((src, i) => (
                <Grid item xs={6} sm={4} key={src.slice(0, 48) + i}>
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
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: `1px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`,
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
                          onClick={() => dispatch(removeScreenshot(i))}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            opacity: 0,
                            transition: 'opacity 0.15s',
                            background: alpha('#000', 0.6),
                            color: '#fff',
                            '&:hover': { background: alpha('#ef4444', 0.8) },
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>

          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            sx={{ alignSelf: 'flex-start', fontSize: 11 }}
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
