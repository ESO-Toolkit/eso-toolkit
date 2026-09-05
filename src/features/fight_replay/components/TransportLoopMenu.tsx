/**
 * TransportLoopMenu
 *
 * The transport's A–B loop control: ONE icon button that opens a small popover with the
 * set-A / set-B / clear actions and the live span readout.
 *
 * Before this, the loop occupied up to three slots in the transport's right cluster — a pill-shaped
 * `LoopChip` (span + a × to clear), plus two outlined text buttons literally labelled "A" and "B".
 * Those were the only `variant="outlined"` text buttons in a row that is otherwise entirely icon
 * buttons, so they read as a foreign control grammar wedged into the bar, and they were rendered
 * unconditionally — permanently spending two slots on a power-user feature most viewers never touch.
 *
 * Collapsing them into one icon button follows the same "one trigger, one popover" shape the row's
 * other secondary controls already use ({@link ChaptersPopoverButton},
 * {@link ReplayDisplaySettingsMenu}), and the button tints to `secondary.main` while a loop is
 * active so the state stays glanceable without spending a slot on the chip. The scrub rail still
 * paints the loop region itself, which is the real at-a-glance affordance.
 *
 * @module features/fight_replay/components/TransportLoopMenu
 */

import RepeatIcon from '@mui/icons-material/Repeat';
import { Box, Button, Divider, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import React from 'react';

interface TransportLoopMenuProps {
  /** A–B loop in-point (ms into the fight), or null when unset. */
  loopStart: number | null;
  /** A–B loop out-point (ms), or null when unset. */
  loopEnd: number | null;
  /** Set the in-point to the live playhead (the I key's pointer equivalent). */
  onSetLoopIn?: () => void;
  /** Set the out-point to the live playhead (the O key's pointer equivalent). */
  onSetLoopOut?: () => void;
  /** Clear both points (the U key's pointer equivalent). */
  onClearLoop?: () => void;
  /** Formats a ms offset as a timecode — the same formatter the transport's readout uses. */
  formatTime: (ms: number) => string;
  /** Portal target so the popover survives native fullscreen (mirrors the other popovers). */
  portalContainer?: () => HTMLElement | null;
}

const TransportLoopMenuComponent: React.FC<TransportLoopMenuProps> = ({
  loopStart,
  loopEnd,
  onSetLoopIn,
  onSetLoopOut,
  onClearLoop,
  formatTime,
  portalContainer,
}) => {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  const active = loopStart != null || loopEnd != null;

  // The trigger's tooltip carries the span so the loop stays readable without opening the popover
  // (the chip this replaced showed it inline).
  const spanLabel =
    loopStart != null && loopEnd != null
      ? `${formatTime(Math.min(loopStart, loopEnd))}–${formatTime(Math.max(loopStart, loopEnd))}`
      : loopStart != null
        ? `A ${formatTime(loopStart)}`
        : loopEnd != null
          ? `B ${formatTime(loopEnd)}`
          : null;

  const close = React.useCallback(() => setAnchor(null), []);

  return (
    <>
      <Tooltip title={spanLabel ? `A–B loop · ${spanLabel}` : 'A–B loop'}>
        <IconButton
          aria-label={spanLabel ? `A–B loop, ${spanLabel}` : 'A–B loop'}
          aria-haspopup="menu"
          aria-expanded={open}
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            color: active ? 'secondary.main' : 'text.secondary',
            '&:hover': { color: active ? 'secondary.main' : 'text.primary' },
          }}
        >
          <RepeatIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={close}
        container={portalContainer ? (portalContainer() ?? undefined) : undefined}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 232, maxWidth: 'calc(100vw - 32px)', p: 1.5 } } }}
      >
        {/* Body mounted only while open — keeps it off the per-frame playback path, as the
            chapters and settings popovers do. */}
        {open && (
          <>
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}
            >
              A–B loop
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 0.25,
                mb: 1.25,
                color: active ? 'secondary.main' : 'text.secondary',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {spanLabel ?? 'No loop set'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {onSetLoopIn && (
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  onClick={onSetLoopIn}
                  aria-label="Set loop start at the playhead"
                  sx={{ fontWeight: 700 }}
                >
                  Set A
                </Button>
              )}
              {onSetLoopOut && (
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  onClick={onSetLoopOut}
                  aria-label="Set loop end at the playhead"
                  sx={{ fontWeight: 700 }}
                >
                  Set B
                </Button>
              )}
            </Box>

            {onClearLoop && (
              <>
                <Divider sx={{ my: 1.25 }} />
                <Button
                  fullWidth
                  size="small"
                  color="inherit"
                  disabled={!active}
                  // Clearing removes the only reason the popover is interesting; close with it so
                  // the user isn't left staring at a dead "No loop set" panel.
                  onClick={() => {
                    onClearLoop();
                    close();
                  }}
                  aria-label="Clear A-B loop"
                  sx={{ color: 'text.secondary' }}
                >
                  Clear loop
                </Button>
              </>
            )}

            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1, color: 'text.secondary', textAlign: 'center' }}
            >
              Shortcuts: I · O · U
            </Typography>
          </>
        )}
      </Popover>
    </>
  );
};

/**
 * Memoized for the same reason every other transport child is: the bar re-renders on coarse state
 * changes and must not drag a popover subtree along with it.
 */
export const TransportLoopMenu = React.memo(TransportLoopMenuComponent);
