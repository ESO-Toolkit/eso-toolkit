/**
 * Shared glass input styling for MUI TextFields.
 * Gives inputs a subtle recessed "well" appearance so they're visually
 * distinct from the glass panel background, even at rest.
 */

import { BE_TOKENS } from '../../theme/buildEditorTokens';

export const glassInputSx = (isDark: boolean, isMobile?: boolean): Record<string, unknown> => {
  const t = isDark ? BE_TOKENS.input.dark : BE_TOKENS.input.light;

  return {
    '& .MuiOutlinedInput-root': {
      fontFamily: 'Space Grotesk, Inter, system-ui',
      fontSize: isMobile ? 16 : 13,
      background: t.bg,
      borderRadius: '10px',
      transition: 'background 0.2s ease',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: t.border,
        transition: 'border-color 0.2s ease',
      },
      '&:hover': {
        background: isDark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.06)',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: t.hoverBorder,
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--be-accent, #38bdf8)',
        borderWidth: '1px',
      },
    },
    '& .MuiOutlinedInput-input::placeholder': {
      color: t.placeholder,
      opacity: 1,
    },
  };
};
