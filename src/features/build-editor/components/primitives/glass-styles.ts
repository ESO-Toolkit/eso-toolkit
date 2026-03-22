/**
 * Shared glass-morphism style helpers for picker components.
 * Used by FoodPicker, PotionPicker, and any future consumable-style pickers.
 */

export const glassAddBtnSx = (isDark: boolean): Record<string, unknown> => ({
  alignSelf: 'flex-start' as const,
  fontSize: 11,
  fontFamily: 'Space Grotesk, Inter, system-ui',
  fontWeight: 600,
  borderRadius: '99px',
  textTransform: 'none' as const,
  borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
  color: 'var(--be-accent, #38bdf8)',
  backdropFilter: 'blur(6px)',
  '&:hover': {
    borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.40)',
    background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
  },
  '&.Mui-disabled': {
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    color: 'text.disabled',
  },
});

export const glassEmptySx = (isDark: boolean): Record<string, unknown> => ({
  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  border: `1px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
  borderRadius: 3,
  p: 3,
  textAlign: 'center' as const,
  boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.02)' : 'none',
});
