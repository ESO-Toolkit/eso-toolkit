import { useMemo } from 'react';
import { useMediaQuery } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { alpha, useTheme } from '@mui/material/styles';

export interface ReportPageLayoutResult {
  isDesktop: boolean;
  cardSx: SxProps<Theme>;
  cardContentSx: SxProps<Theme>;
  headerStackSx: SxProps<Theme>;
  actionGroupSx: SxProps<Theme>;
}

export const useReportPageLayout = (): ReportPageLayoutResult => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const cardSx = useMemo<SxProps<Theme>>(
    () => ({
      borderRadius: 2,
      border: `1px solid ${theme.palette.divider}`,
      background: isDesktop
        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(
            theme.palette.secondary.main,
            0.12,
          )} 100%)`
        : theme.palette.background.paper,
      boxShadow: isDesktop ? theme.shadows[6] : theme.shadows[1],
      transition: 'background 0.3s ease, box-shadow 0.3s ease',
      overflow: 'hidden',
    }),
    [isDesktop, theme],
  );

  const cardContentSx = useMemo<SxProps<Theme>>(
    () => ({
      p: isDesktop ? 4 : 2,
    }),
    [isDesktop],
  );

  const headerStackSx = useMemo<SxProps<Theme>>(
    () => ({
      display: 'flex',
      flexDirection: isDesktop ? 'row' : 'column',
      alignItems: isDesktop ? 'center' : 'flex-start',
      justifyContent: 'space-between',
      gap: isDesktop ? 2 : 1.5,
    }),
    [isDesktop],
  );

  const actionGroupSx = useMemo<SxProps<Theme>>(
    () => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: isDesktop ? 'flex-end' : 'flex-start',
      gap: isDesktop ? 2 : 1,
      width: isDesktop ? 'auto' : '100%',
    }),
    [isDesktop],
  );

  return {
    isDesktop,
    cardSx,
    cardContentSx,
    headerStackSx,
    actionGroupSx,
  };
};
