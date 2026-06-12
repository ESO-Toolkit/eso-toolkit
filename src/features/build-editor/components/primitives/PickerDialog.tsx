/**
 * PickerDialog — shared glassmorphism dialog shell for all picker modals.
 *
 * Encapsulates:
 *  - Glassmorphism Paper with backdrop-blur + border
 *  - Gradient title with close (×) button and optional badge
 *  - Sticky search field with clear button, result count, and keyboard hint
 *  - Slide-up entrance animation
 *  - Mobile fullscreen at xs breakpoint
 *  - Optional tab bar slot and scrollable content area
 *
 * Usage:
 *   <PickerDialog open={open} onClose={onClose} title="Select Food / Drink">
 *     <PickerDialog.Search value={search} onChange={setSearch} placeholder="Search..." />
 *     <PickerDialog.Tabs> ... tab buttons ... </PickerDialog.Tabs>
 *     <PickerDialog.Body>{children}</PickerDialog.Body>
 *   </PickerDialog>
 */

import { Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Slide,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { TransitionProps } from '@mui/material/transitions';
import React from 'react';

// ── Slide-up transition ─────────────────────────────────────────────────────

const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// ── Sub-components (compound component pattern) ─────────────────────────────

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  autoFocus?: boolean;
}

const Search: React.FC<SearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  resultCount,
  autoFocus = true,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  // iOS Safari zooms the page when a focused input is <16px. Use ≥16px on
  // mobile (≤600px) to prevent that, while keeping 13px on desktop where
  // vertical space is abundant.
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <TextField
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        size="small"
        fullWidth
        autoFocus={autoFocus}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, opacity: 0.4 }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end" sx={{ gap: 0.5 }}>
                {resultCount != null && value.trim().length >= 2 && (
                  <Typography
                    sx={{
                      fontSize: 10,
                      fontWeight: 600,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {resultCount} result{resultCount !== 1 ? 's' : ''}
                  </Typography>
                )}
                {value.length > 0 && (
                  <IconButton
                    size="small"
                    onClick={() => onChange('')}
                    aria-label="Clear search"
                    tabIndex={-1}
                    sx={{
                      p: 0.25,
                      color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
                      '&:hover': {
                        color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.55)',
                      },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            borderRadius: 2,
            fontSize: isMobile ? 16 : 13,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            transition: 'background 0.15s, border-color 0.15s',
            '&.Mui-focused': {
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
            },
          },
        }}
      />
    </Box>
  );
};

// Tab bar wrapper — just provides consistent layout spacing
const Tabs: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      display: 'flex',
      gap: 0.5,
      px: 2,
      pb: 1.5,
      overflowX: 'auto',
      flexWrap: 'wrap',
      rowGap: 0.5,
      // Hide scrollbar but allow scroll
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': { display: 'none' },
    }}
  >
    {children}
  </Box>
);

// Scrollable body area
interface BodyProps {
  children: React.ReactNode;
  maxHeight?: number | string;
  empty?: boolean;
  emptyMessage?: string;
}

const Body = React.forwardRef<HTMLDivElement, BodyProps>(function Body(
  { children, maxHeight = 'calc(80vh - 180px)', empty = false, emptyMessage = 'Nothing found' },
  ref,
) {
  const isDark = useTheme().palette.mode === 'dark';

  if (empty) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 5,
          px: 3,
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 0.5,
          }}
        >
          <SearchIcon
            sx={{
              fontSize: 22,
              color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
            }}
          />
        </Box>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
            textAlign: 'center',
          }}
        >
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={ref}
      sx={{
        maxHeight,
        overflowY: 'auto',
        px: 1,
        pb: 1.5,
        // Subtle scroll styling
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(128,128,128,0.25) transparent',
        '&::-webkit-scrollbar': { width: 5 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          borderRadius: 3,
          background: 'rgba(128,128,128,0.25)',
          '&:hover': { background: 'rgba(128,128,128,0.40)' },
        },
      }}
    >
      {children}
    </Box>
  );
});

// ── Main PickerDialog ───────────────────────────────────────────────────────

interface PickerDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional badge text shown to the right of the title (e.g. "3 selected") */
  badge?: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md';
}

const PickerDialogRoot: React.FC<PickerDialogProps> = ({
  open,
  onClose,
  title,
  badge,
  children,
  maxWidth = 'sm',
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={isMobile}
      className="glass-dialog"
      slots={{ transition: SlideUp }}
      slotProps={{
        transition: { timeout: { enter: 280, exit: 200 } },
        paper: {
          sx: {
            borderRadius: isMobile ? 0 : '20px',
            // Phase 3 M9: blur reduced from 20px → 10px to cut composite cost.
            // On mobile the dialog is fullScreen and the blur is invisible
            // behind the opaque sheet, so no media-gating needed.
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
            backgroundColor: 'transparent',
            border: isMobile
              ? 'none'
              : isDark
                ? '1px solid #1f2937'
                : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.25)' : '0 4px 12px rgba(15,23,42,0.06)',
            maxHeight: isMobile ? '100vh' : '90vh',
            // Subtle top-edge glow
            '&::after': isMobile
              ? {}
              : {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '10%',
                  right: '10%',
                  height: '1px',
                  background: isDark
                    ? 'linear-gradient(90deg, transparent, rgba(var(--be-accent-rgb, 56, 189, 248), 0.35), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(var(--be-accent-rgb, 56, 189, 248), 0.18), transparent)',
                  pointerEvents: 'none',
                  zIndex: 1,
                },
          },
        },
        backdrop: {
          sx: {
            background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)',
          },
        },
      }}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          pt: isMobile ? 2 : undefined,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontSize: '1rem',
              background: isDark
                ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {title}
          </Typography>
          {badge && (
            <Typography
              component="span"
              sx={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.35)',
                flexShrink: 0,
              }}
            >
              {badge}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* ESC hint */}
          <Typography
            sx={{
              fontSize: 9,
              fontWeight: 600,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              color: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: '4px',
              px: 0.6,
              py: 0.15,
              lineHeight: 1.4,
              userSelect: 'none',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            ESC
          </Typography>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Close dialog"
            sx={{
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)',
              transition: 'all 0.15s',
              '&:hover': {
                color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.60)',
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* ── Content ─────────────────────────────────────── */}
      <DialogContent sx={{ p: 0 }}>{children}</DialogContent>
    </Dialog>
  );
};

// ── Compound export ─────────────────────────────────────────────────────────

export const PickerDialog = Object.assign(PickerDialogRoot, {
  Search,
  Tabs,
  Body,
});

export type { PickerDialogProps, SearchProps, BodyProps };
