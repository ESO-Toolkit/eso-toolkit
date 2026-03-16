/**
 * Shared glass-morphism input style for roster card components.
 * Applies consistent bordered, semi-transparent styling to MUI outlined inputs.
 */
export const makeGlassSx = (isDark: boolean) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    '& fieldset': {
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
    },
    '&:hover fieldset': {
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
    },
  },
});
