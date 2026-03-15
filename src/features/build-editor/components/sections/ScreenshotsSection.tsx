/**
 * Screenshots Section — character stat screenshots.
 */

import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { addScreenshot, removeScreenshot } from '../../store/buildEditorSlice';

export const ScreenshotsSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
    // Reset so same file can be re-uploaded
    e.target.value = '';
  };

  return (
    <Stack spacing={2}>
      <Typography variant="caption" color="text.secondary">
        Add screenshots of your character stats, gear, or skills.
      </Typography>

      {setup.screenshots.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 5,
            background: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
            border: `1px dashed ${isDark ? alpha('#fff', 0.1) : alpha('#000', 0.08)}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" color="text.disabled" mb={1.5}>
            No screenshots uploaded yet
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            onClick={() => inputRef.current?.click()}
          >
            Upload Screenshot
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={1.5}>
            {setup.screenshots.map((src, i) => (
              <Grid item xs={6} sm={4} key={src.slice(0, 48) + i}>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: `1px solid ${isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1)}`,
                    '&:hover .remove-btn': { opacity: 1 },
                  }}
                >
                  <img
                    src={src}
                    alt={`Screenshot ${i + 1}`}
                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
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
              </Grid>
            ))}
          </Grid>

          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            sx={{ alignSelf: 'flex-start' }}
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
