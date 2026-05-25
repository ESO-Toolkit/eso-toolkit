import { VisibilityOff } from '@mui/icons-material';
import {
  alpha,
  Box,
  Chip,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import React from 'react';

import { PACK_TAG_COLORS, PACK_TYPE_LABELS, PRESET_PACK_TAGS } from '../types/pack-hub.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TAGS = 5;
const PACK_TYPES = ['addon-pack', 'build-pack', 'roster-pack'] as const;

// ---------------------------------------------------------------------------
// Glassmorphic Input sx helper
// ---------------------------------------------------------------------------

const glassInputSx = (isDark: boolean, accent: string): Record<string, unknown> => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: isDark ? alpha('#0f172a', 0.8) : '#ffffff',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '& fieldset': {
      borderColor: isDark ? alpha('#38bdf8', 0.15) : alpha('#0f172a', 0.12),
      transition: 'border-color 0.3s ease',
    },
    '&:hover fieldset': {
      borderColor: isDark ? alpha('#38bdf8', 0.35) : alpha('#0f172a', 0.25),
    },
    '&.Mui-focused fieldset': {
      borderColor: accent,
      borderWidth: 2,
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 3px ${alpha(accent, 0.12)}`,
    },
  },
  '& .MuiInputLabel-root': {
    color: isDark ? '#94a3b8' : '#64748b',
    fontWeight: 400,
    '&.Mui-focused': { color: accent },
  },
});

// ---------------------------------------------------------------------------
// Character count progress bar
// ---------------------------------------------------------------------------

const CharProgress: React.FC<{ current: number; max: number; accent: string }> = ({
  current,
  max,
  accent,
}) => {
  const pct = Math.min((current / max) * 100, 100);
  const isNearLimit = pct > 85;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
      <Box
        sx={{
          flex: 1,
          height: 2,
          borderRadius: 1,
          bgcolor: alpha('#fff', 0.06),
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 1,
            bgcolor: isNearLimit ? '#f59e0b' : accent,
            transition: 'width 0.3s ease, background-color 0.3s',
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.6rem',
          fontFamily: 'monospace',
          color: isNearLimit ? '#f59e0b' : 'text.disabled',
          minWidth: 38,
          textAlign: 'right',
        }}
      >
        {current}/{max}
      </Typography>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PackDetailsStepProps {
  title: string;
  description: string;
  packType: string;
  selectedTags: string[];
  isAnonymous: boolean;
  titleTouched: boolean;
  isDark: boolean;
  accentColor: string;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  onDescriptionChange: (value: string) => void;
  onPackTypeChange: (value: string) => void;
  onTagToggle: (tag: string) => void;
  onAnonymousChange: (value: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PackDetailsStep: React.FC<PackDetailsStepProps> = ({
  title,
  description,
  packType,
  selectedTags,
  isAnonymous,
  titleTouched,
  isDark,
  accentColor,
  onTitleChange,
  onTitleBlur,
  onDescriptionChange,
  onPackTypeChange,
  onTagToggle,
  onAnonymousChange,
}) => {
  const titleError = titleTouched && !title.trim();
  const atTagLimit = selectedTags.length >= MAX_TAGS;

  return (
    <motion.div
      key="step-0"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        {/* Title */}
        <Box>
          <TextField
            label="Pack Name"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={onTitleBlur}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            required
            fullWidth
            size="small"
            autoFocus
            error={titleError}
            helperText={titleError ? 'Give your pack a name' : undefined}
            placeholder="e.g. Trial Essentials, PvP Toolkit"
            sx={glassInputSx(isDark, accentColor)}
          />
          <CharProgress current={title.length} max={100} accent={accentColor} />
        </Box>

        {/* Description */}
        <Box>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            multiline
            rows={3}
            fullWidth
            size="small"
            placeholder="What is this pack for? Who should use it?"
            sx={glassInputSx(isDark, accentColor)}
          />
          <CharProgress current={description.length} max={500} accent={accentColor} />
        </Box>

        {/* Pack type */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.65rem',
              color: 'text.secondary',
              mb: 0.75,
              display: 'block',
            }}
          >
            Pack Type
          </Typography>
          <Select
            size="small"
            value={packType}
            onChange={(e: SelectChangeEvent) => onPackTypeChange(e.target.value)}
            fullWidth
            sx={{
              borderRadius: 2,
              backgroundColor: isDark ? alpha('#0f172a', 0.8) : '#ffffff',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? alpha('#38bdf8', 0.15) : alpha('#0f172a', 0.12),
                transition: 'border-color 0.3s',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? alpha('#38bdf8', 0.35) : alpha('#0f172a', 0.25),
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: accentColor,
              },
            }}
          >
            {PACK_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {PACK_TYPE_LABELS[t]}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Tags */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              mb: 0.75,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.65rem',
                color: 'text.secondary',
              }}
            >
              Tags
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                color: atTagLimit ? '#f59e0b' : 'text.disabled',
                transition: 'color 0.2s',
              }}
            >
              {selectedTags.length}/{MAX_TAGS}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
            {PRESET_PACK_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = !isSelected && atTagLimit;
              const accent = PACK_TAG_COLORS[tag] ?? '#888';
              return (
                <Tooltip key={tag} title={isDisabled ? `Remove a tag first (max ${MAX_TAGS})` : ''}>
                  <span>
                    <Chip
                      label={tag}
                      size="small"
                      onClick={isDisabled ? undefined : () => onTagToggle(tag)}
                      variant={isSelected ? 'filled' : 'outlined'}
                      sx={{
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.35 : 1,
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                        ...(isSelected
                          ? {
                              bgcolor: accent,
                              color: '#fff',
                              borderColor: accent,
                              boxShadow: `0 0 10px ${alpha(accent, 0.35)}`,
                              '&:hover': { bgcolor: accent, filter: 'brightness(0.9)' },
                            }
                          : {
                              borderColor: isDark ? alpha(accent, 0.3) : alpha(accent, 0.4),
                              color: accent,
                              '&:hover': isDisabled
                                ? {}
                                : {
                                    bgcolor: alpha(accent, 0.1),
                                    borderColor: accent,
                                    transform: 'scale(1.04)',
                                  },
                            }),
                      }}
                    />
                  </span>
                </Tooltip>
              );
            })}
          </Box>
        </Box>

        {/* Anonymous toggle */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.25,
            px: 1.5,
            borderRadius: '10px',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
            border: `1px solid ${isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
          }}
        >
          <VisibilityOff sx={{ fontSize: 18, color: 'text.disabled' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              Publish anonymously
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: 1.2 }}>
              Your name won&apos;t appear on this pack
            </Typography>
          </Box>
          <Switch
            checked={isAnonymous}
            onChange={(e) => onAnonymousChange(e.target.checked)}
            size="small"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: accentColor,
                '& + .MuiSwitch-track': {
                  bgcolor: alpha(accentColor, 0.4),
                },
              },
            }}
          />
        </Box>
      </Stack>
    </motion.div>
  );
};
