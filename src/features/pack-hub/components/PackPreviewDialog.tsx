import {
  Close,
  ContentCopy,
  Extension,
  OpenInNew,
  Search,
  Shield,
  VerifiedUser,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  IconButton,
  InputAdornment,
  Slide,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { AnimatePresence, motion } from 'framer-motion';
import { useSnackbar } from 'notistack';
import React from 'react';

import { formatRelativeDate } from '../../../utils/formatRelativeDate';
import {
  KALPA_DOWNLOAD_URL,
  getAddonManagerDeepLink,
  tryLaunchDeepLink,
} from '../../build-hub/api/packs-api';
import { VoteButton } from '../../roster-hub/components/VoteButton';
import type { HubPack, PackAddonEntry } from '../types/pack-hub.types';
import { PACK_TAG_COLORS, PACK_TYPE_ACCENT, PACK_TYPE_LABELS } from '../types/pack-hub.types';

interface PackPreviewDialogProps {
  pack: HubPack | null;
  open: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onVote: (packId: string) => void;
}

const SlideUpTransition = React.forwardRef(function SlideUpTransition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const getEsouiUrl = (esouiId: number): string =>
  `https://www.esoui.com/downloads/info${esouiId}.html`;

export const PackPreviewDialog: React.FC<PackPreviewDialogProps> = ({
  pack,
  open,
  isLoggedIn,
  onClose,
  onVote,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();
  const [query, setQuery] = React.useState('');
  const [requiredOnly, setRequiredOnly] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const cancelDeepLinkRef = React.useRef<(() => void) | undefined>(undefined);

  React.useEffect(() => () => cancelDeepLinkRef.current?.(), []);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setRequiredOnly(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const filteredAddons = React.useMemo(() => {
    if (!pack) return [];
    const q = query.trim().toLowerCase();
    return pack.addons.filter((addon) => {
      if (requiredOnly && !addon.required) return false;
      if (!q) return true;
      return (
        addon.name.toLowerCase().includes(q) ||
        (addon.note?.toLowerCase().includes(q) ?? false) ||
        String(addon.esouiId).includes(q)
      );
    });
  }, [pack, query, requiredOnly]);

  if (!pack) return null;

  const tagAccent = pack.tags.map((t) => PACK_TAG_COLORS[t]).find((c): c is string => c != null);
  const accentColor = tagAccent ?? PACK_TYPE_ACCENT[pack.pack_type] ?? '#c4a44a';
  const typeLabel = PACK_TYPE_LABELS[pack.pack_type] ?? pack.pack_type;
  const displayName = pack.is_anonymous ? 'Anonymous' : pack.author_name || '?';

  const requiredCount = pack.addons.filter((a) => a.required).length;
  const optionalCount = pack.addons.length - requiredCount;

  const handleCopyLink = (): void => {
    const deepLink = getAddonManagerDeepLink(pack.id);
    void navigator.clipboard.writeText(deepLink).then(
      () => enqueueSnackbar('Deep link copied to clipboard!', { variant: 'success' }),
      () => enqueueSnackbar('Failed to copy link', { variant: 'error' }),
    );
  };

  const handleInstall = (): void => {
    const deepLink = getAddonManagerDeepLink(pack.id);
    cancelDeepLinkRef.current?.();
    cancelDeepLinkRef.current = tryLaunchDeepLink(deepLink, () => {
      void navigator.clipboard.writeText(deepLink).catch(() => {});
      enqueueSnackbar("Kalpa didn't open — launch it manually or download it", {
        variant: 'info',
        autoHideDuration: 8000,
        action: () => (
          <>
            <Button
              size="small"
              component="a"
              href={deepLink}
              sx={{ color: '#fff', fontWeight: 700, textTransform: 'none' }}
            >
              Launch
            </Button>
            <Button
              size="small"
              href={KALPA_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#fff', fontWeight: 700, textTransform: 'none' }}
            >
              Download
            </Button>
          </>
        ),
      });
    });
  };

  const renderStat = (label: string, value: number | string, color?: string): React.ReactNode => (
    <Box
      sx={{
        px: 1.5,
        py: 0.85,
        borderRadius: '10px',
        minWidth: { xs: 'auto', sm: 72 },
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <Typography
        sx={{
          fontSize: '1.15rem',
          fontWeight: 800,
          lineHeight: 1.1,
          color: color ?? (isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)'),
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          opacity: 0.6,
          lineHeight: 1.2,
          mt: 0.25,
        }}
      >
        {label}
      </Typography>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      slots={{ transition: SlideUpTransition }}
      slotProps={{
        paper: {
          sx: {
            overflow: 'hidden',
            borderRadius: fullScreen ? 0 : 4,
            background: isDark
              ? `linear-gradient(165deg, ${accentColor}18 0%, rgba(152,131,227,0.06) 35%, rgba(11,18,32,0.92) 75%)`
              : `linear-gradient(165deg, ${accentColor}14 0%, rgba(152,131,227,0.05) 35%, rgba(255,255,255,0.97) 75%)`,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: isDark
              ? `0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}25, 0 0 60px ${accentColor}20`
              : `0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px ${accentColor}20`,
          },
        },
        backdrop: {
          sx: {
            backgroundColor: isDark ? 'rgba(5,10,20,0.72)' : 'rgba(15,23,42,0.38)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          },
        },
      }}
    >
      {/* Animated accent bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}80 20%, ${accentColor} 50%, ${accentColor}80 80%, transparent 100%)`,
          boxShadow: `0 0 14px ${accentColor}90, 0 0 32px ${accentColor}50`,
          zIndex: 3,
        }}
        aria-hidden="true"
      />

      {/* Ambient accent glow */}
      <Box
        sx={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}55 0%, transparent 65%)`,
          filter: 'blur(40px)',
          opacity: isDark ? 0.9 : 0.55,
          pointerEvents: 'none',
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* Close button (absolute) */}
      <IconButton
        onClick={onClose}
        aria-label="Close preview"
        size="small"
        sx={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 4,
          width: 34,
          height: 34,
          background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)',
          '&:hover': {
            background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.9)',
            color: accentColor,
          },
        }}
      >
        <Close sx={{ fontSize: 18 }} />
      </IconButton>

      {/* Header */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 1.5, sm: 4 },
          pt: { xs: 3.5, sm: 4 },
          pb: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1.75, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: '7px',
              background: isDark ? `${accentColor}24` : `${accentColor}1a`,
              border: `1px solid ${accentColor}55`,
              boxShadow: `0 0 10px ${accentColor}30`,
            }}
          >
            <Extension sx={{ fontSize: 12, color: accentColor }} />
            <Typography
              sx={{
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: accentColor,
                lineHeight: 1,
                textTransform: 'uppercase',
              }}
            >
              {typeLabel}
            </Typography>
          </Box>
          {pack.tags.map((tag) => {
            const tagColor = PACK_TAG_COLORS[tag] ?? '#94a3b8';
            return (
              <Box
                key={tag}
                component="span"
                sx={{
                  display: 'inline-flex',
                  px: 0.85,
                  py: 0.4,
                  borderRadius: '6px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  background: isDark ? `${tagColor}22` : `${tagColor}16`,
                  border: `1px solid ${tagColor}48`,
                  color: tagColor,
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                }}
              >
                {tag}
              </Box>
            );
          })}
        </Box>

        <Typography
          component="h2"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.45rem', sm: '1.75rem' },
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            pr: { xs: 2, sm: 5 },
            background: isDark
              ? `linear-gradient(135deg, #f8fafc 0%, ${accentColor} 130%)`
              : `linear-gradient(135deg, #0f172a 0%, ${accentColor} 130%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {pack.title}
        </Typography>

        <Typography
          sx={{
            mt: 1,
            fontSize: '0.8rem',
            opacity: 0.65,
            fontWeight: 500,
          }}
        >
          By <strong>{displayName}</strong> · Updated {formatRelativeDate(pack.updated_at)}
        </Typography>

        {pack.description && (
          <Typography
            sx={{
              mt: 2,
              fontSize: '0.92rem',
              lineHeight: 1.65,
              opacity: 0.85,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {pack.description}
          </Typography>
        )}

        {/* Stats row */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2.5, flexWrap: 'wrap', '& > *': { minWidth: { xs: 'auto', sm: 72 } } }}>
          {renderStat('Addons', pack.addons.length, accentColor)}
          {renderStat('Required', requiredCount, '#c4a44a')}
          {renderStat('Optional', optionalCount, '#94a3b8')}
          {renderStat('Votes', pack.vote_count)}
        </Box>
      </Box>

      {/* Search / filter bar (sticky) */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          px: { xs: 2.5, sm: 4 },
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          background: isDark ? 'rgba(11,18,32,0.75)' : 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <TextField
          inputRef={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter addons…"
          size="small"
          fullWidth
          variant="outlined"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 17, opacity: 0.5 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Box
                    component="kbd"
                    sx={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '4px',
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      border: isDark
                        ? '1px solid rgba(255,255,255,0.1)'
                        : '1px solid rgba(0,0,0,0.08)',
                      opacity: 0.6,
                      display: { xs: 'none', sm: 'inline-block' },
                    }}
                  >
                    /
                  </Box>
                </InputAdornment>
              ),
              sx: {
                borderRadius: '10px',
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
                '&:hover fieldset': {
                  borderColor: `${accentColor}55 !important`,
                },
                '&.Mui-focused fieldset': {
                  borderColor: `${accentColor} !important`,
                },
              },
            },
          }}
        />
        <Tooltip title={requiredOnly ? 'Showing required only' : 'Show required only'}>
          <Chip
            label="Required"
            icon={<VerifiedUser sx={{ fontSize: 13, ml: '4px !important' }} />}
            size="small"
            onClick={() => setRequiredOnly((v) => !v)}
            sx={{
              height: 32,
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: '10px',
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: requiredOnly
                ? alpha('#c4a44a', isDark ? 0.22 : 0.16)
                : isDark
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(0,0,0,0.02)',
              color: requiredOnly ? '#c4a44a' : 'text.secondary',
              border: `1px solid ${requiredOnly ? alpha('#c4a44a', 0.45) : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: requiredOnly ? `0 0 10px ${alpha('#c4a44a', 0.25)}` : 'none',
              '& .MuiChip-icon': {
                color: requiredOnly ? '#c4a44a' : 'text.disabled',
              },
              '&:hover': {
                background: requiredOnly
                  ? alpha('#c4a44a', 0.3)
                  : isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)',
              },
            }}
          />
        </Tooltip>
      </Box>

      {/* Addon list */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 1.5, sm: 3 },
          py: 1.5,
          flex: 1,
          overflowY: 'auto',
          minHeight: 180,
          maxHeight: fullScreen ? 'none' : '45vh',
        }}
      >
        {filteredAddons.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 5,
              opacity: 0.55,
            }}
          >
            <Search sx={{ fontSize: 36, opacity: 0.45, mb: 1 }} />
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>No addons match</Typography>
            <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>
              Try a different search or turn off the required filter.
            </Typography>
          </Box>
        ) : (
          <AnimatePresence initial={false}>
            {filteredAddons.map((addon, idx) => (
              <AddonRow
                key={addon.esouiId}
                addon={addon}
                index={idx}
                accentColor={accentColor}
                isDark={isDark}
              />
            ))}
          </AnimatePresence>
        )}
      </Box>

      {/* Sticky footer / actions */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          px: { xs: 2.5, sm: 4 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          flexWrap: 'wrap',
          borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)',
          background: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <VoteButton
          voteCount={pack.vote_count}
          voted={pack.user_voted ?? false}
          disabled={!isLoggedIn}
          onVote={() => onVote(pack.id)}
        />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Copy deep link">
          <IconButton
            size="small"
            onClick={handleCopyLink}
            aria-label="Copy deep link"
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              color: 'text.secondary',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              '&:hover': {
                color: accentColor,
                borderColor: `${accentColor}55`,
                background: `${accentColor}10`,
              },
            }}
          >
            <ContentCopy sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Button
          startIcon={<Extension />}
          variant="contained"
          size="medium"
          onClick={handleInstall}
          sx={{
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}d0 100%)`,
            color: isDark ? '#0b1220' : '#0b1220',
            border: 'none',
            fontWeight: 800,
            letterSpacing: '0.01em',
            borderRadius: '10px',
            px: 2.5,
            py: 1,
            textTransform: 'none',
            fontSize: '0.88rem',
            boxShadow: `0 0 18px ${accentColor}55, 0 4px 14px rgba(0,0,0,0.35)`,
            textShadow: '0 1px 3px rgba(0,0,0,0.08)',
            '&:hover': {
              background: `linear-gradient(135deg, ${accentColor}f0 0%, ${accentColor} 100%)`,
              boxShadow: `0 0 26px ${accentColor}75, 0 6px 20px rgba(0,0,0,0.4)`,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.22s ease',
          }}
        >
          Install pack
        </Button>
      </Box>
    </Dialog>
  );
};

interface AddonRowProps {
  addon: PackAddonEntry;
  index: number;
  accentColor: string;
  isDark: boolean;
}

const AddonRow: React.FC<AddonRowProps> = ({ addon, index, accentColor, isDark }) => {
  const statusColor = addon.required ? '#c4a44a' : '#94a3b8';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, overflow: 'hidden' }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.01, 0.15) }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          py: 1,
          mb: 0.5,
          borderRadius: '10px',
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.04)',
          transition: 'all 0.18s ease',
          '&:hover': {
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)',
            borderColor: `${accentColor}40`,
            transform: 'translateX(2px)',
            '& .addon-row-link': { opacity: 1 },
          },
        }}
      >
        {/* Position index */}
        <Typography
          sx={{
            flexShrink: 0,
            width: 22,
            textAlign: 'right',
            fontSize: '0.68rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            opacity: 0.35,
          }}
        >
          {index + 1}
        </Typography>

        {/* Status dot */}
        <Tooltip title={addon.required ? 'Required addon' : 'Optional addon'}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              bgcolor: statusColor,
              boxShadow: addon.required ? `0 0 8px ${alpha(statusColor, 0.6)}` : 'none',
            }}
          />
        </Tooltip>

        {/* Name + note */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '0.88rem',
              fontWeight: 700,
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {addon.name}
          </Typography>
          {addon.note && (
            <Typography
              sx={{
                fontSize: '0.74rem',
                mt: 0.25,
                opacity: 0.65,
                lineHeight: 1.4,
                wordBreak: 'break-word',
              }}
            >
              {addon.note}
            </Typography>
          )}
        </Box>

        {/* Required/optional chip */}
        <Chip
          label={addon.required ? 'Required' : 'Optional'}
          icon={
            addon.required ? (
              <VerifiedUser sx={{ fontSize: 11, ml: '4px !important' }} />
            ) : (
              <Shield sx={{ fontSize: 11, ml: '4px !important' }} />
            )
          }
          size="small"
          sx={{
            height: 22,
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            borderRadius: '6px',
            flexShrink: 0,
            display: { xs: 'none', sm: 'inline-flex' },
            bgcolor: addon.required
              ? alpha('#c4a44a', isDark ? 0.18 : 0.12)
              : isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.04)',
            color: addon.required ? '#c4a44a' : 'text.disabled',
            border: `1px solid ${addon.required ? alpha('#c4a44a', 0.35) : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            '& .MuiChip-icon': {
              color: addon.required ? '#c4a44a' : 'text.disabled',
            },
          }}
        />

        {/* ESOUI external link */}
        <Tooltip title="View on ESOUI">
          <IconButton
            component="a"
            href={getEsouiUrl(addon.esouiId)}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            aria-label={`View ${addon.name} on ESOUI`}
            className="addon-row-link"
            sx={{
              flexShrink: 0,
              width: 28,
              height: 28,
              opacity: 0.5,
              color: 'text.disabled',
              transition: 'all 0.18s ease',
              '&:hover': {
                color: accentColor,
                background: `${accentColor}14`,
              },
            }}
          >
            <OpenInNew sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </motion.div>
  );
};

PackPreviewDialog.displayName = 'PackPreviewDialog';
