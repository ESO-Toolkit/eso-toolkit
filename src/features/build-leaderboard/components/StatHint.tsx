import { InfoOutlined } from '@mui/icons-material';
import { Box, ButtonBase, ClickAwayListener, Tooltip, useMediaQuery } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

export interface StatHintProps {
  /** The line as it reads on the card, e.g. "Half of parses 118k–129k". */
  text: string;
  /** Plain-language explanation of what the number actually means. */
  explanation: string;
  /**
   * Overrides the accessible name. Defaults to "<text>. <explanation>", which
   * conveys the whole thing without the reader having to open anything; set it
   * where a shorter, action-shaped name reads better.
   */
  ariaLabel?: string;
  'data-testid'?: string;
}

/**
 * A statistic that explains itself on tap as well as on hover.
 *
 * A bare MUI Tooltip is a desktop-only affordance: touch users get nothing
 * unless they happen to long-press, and nothing on the card suggests they
 * should. Quartile lines ("middle half", "% of the boss's top log") are exactly
 * the numbers that need the explanation most, so this renders them as a real
 * button — visible dotted underline and info glyph — that toggles the tooltip
 * on click and shows it on hover/focus where those exist.
 *
 * Nothing here opens on FOCUS, deliberately. Every pointer tap delivers focus
 * before click (touchend -> mousedown -> focus -> mouseup -> click), so a
 * focus-opens rule plus a toggling click cancel out and a tap opens nothing —
 * which was the original "no tooltip on mobile" bug, reintroduced by the first
 * attempt at fixing it. Routing keyboard users through the click handler
 * instead costs them one Enter press and makes the behaviour deterministic
 * rather than dependent on `:focus-visible` heuristics.
 *
 * Hover is likewise attached only under `(hover: hover)`: touch browsers
 * synthesise `mouseenter` before `click`, which would re-create the same race.
 */
export const StatHint: React.FC<StatHintProps> = ({
  text,
  explanation,
  ariaLabel,
  'data-testid': testId,
}) => {
  const canHover = useMediaQuery('(hover: hover)', { noSsr: true });
  const [open, setOpen] = React.useState(false);
  const keyboardActivationRef = React.useRef(false);
  const pointerTypeRef = React.useRef<string | null>(null);

  const hoverProps = canHover
    ? { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) }
    : {};

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      {/* Controlled: MUI's own listeners are disabled so touch and pointer
          devices go through the same open/close state. */}
      <Tooltip
        arrow
        open={open}
        title={explanation}
        disableFocusListener
        disableHoverListener
        disableTouchListener
        placement="top"
        slotProps={{
          tooltip: {
            sx: { maxWidth: 268, fontSize: '0.72rem', fontWeight: 500, lineHeight: 1.5 },
          },
        }}
      >
        <ButtonBase
          data-testid={testId}
          aria-label={ariaLabel ?? `${text}. ${explanation}`}
          aria-expanded={open}
          onPointerDown={(event) => {
            pointerTypeRef.current = event.pointerType;
          }}
          // Where hovering already opened it, a click must not toggle it shut —
          // the pointer is still inside, so it would stay shut until the user
          // left and came back.
          onClick={() => {
            const activatedByKeyboard = keyboardActivationRef.current;
            const pointerType = pointerTypeRef.current;
            keyboardActivationRef.current = false;
            pointerTypeRef.current = null;
            setOpen((wasOpen) =>
              activatedByKeyboard || (pointerType !== null && pointerType !== 'mouse')
                ? !wasOpen
                : canHover || !wasOpen,
            );
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              keyboardActivationRef.current = false;
              setOpen(false);
              return;
            }
            keyboardActivationRef.current = event.key === 'Enter' || event.key === ' ';
          }}
          onBlur={() => {
            keyboardActivationRef.current = false;
            pointerTypeRef.current = null;
            setOpen(false);
          }}
          {...hoverProps}
          className="u-tabular"
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.4,
            mt: -0.15,
            // Touch target reaches the 24px minimum without pushing the
            // surrounding numbers apart.
            py: 0.35,
            borderRadius: 0.75,
            color: 'text.secondary',
            fontSize: '0.67rem',
            fontWeight: 500,
            lineHeight: 1.35,
            textAlign: 'left',
            textDecoration: 'underline dotted',
            textDecorationColor: alpha(theme.palette.text.secondary, 0.5),
            textUnderlineOffset: '3px',
            '&:hover': { color: 'text.primary' },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          })}
        >
          <Box component="span" sx={{ minWidth: 0 }}>
            {text}
          </Box>
          <InfoOutlined aria-hidden="true" sx={{ flex: '0 0 auto', fontSize: 12, opacity: 0.75 }} />
        </ButtonBase>
      </Tooltip>
    </ClickAwayListener>
  );
};
