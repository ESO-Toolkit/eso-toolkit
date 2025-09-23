import { Box, Container, Skeleton, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';

const CATEGORY_WIDTHS = [188, 224, 204, 236];
const ITEM_NAME_WIDTHS = [228, 256, 212, 242, 218];
const PER_WIDTHS = [26, 30, 34];

interface CalculatorSkeletonProps {
  /** Test ID for testing */
  'data-testid'?: string;
}

export const CalculatorSkeleton: React.FC<CalculatorSkeletonProps> = ({
  'data-testid': dataTestId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isExtraSmall = useMediaQuery('(max-width:380px)');

  const cardBorderColor =
    theme.palette.mode === 'dark' ? 'rgba(128, 211, 255, 0.2)' : 'rgba(203, 213, 225, 0.3)';
  const cardBackground =
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
      : 'linear-gradient(180deg, rgb(40 145 200 / 6%) 0%, rgba(248, 250, 252, 0.9) 100%)';
  const controlsBackground =
    theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.98)';
  const controlsBorderColor =
    theme.palette.mode === 'dark' ? 'rgb(128 211 255 / 20%)' : 'rgb(40 145 200 / 15%)';
  const sectionBorderColor =
    theme.palette.mode === 'dark' ? 'rgb(128 211 255 / 20%)' : 'rgb(40 145 200 / 15%)';
  const sectionBackground =
    theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.94)';
  const actionBarBackground =
    theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.5)';
  const stickyBackground =
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)';
  const stickyBorderColor =
    theme.palette.mode === 'dark' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)';

  return (
    <Box
      data-testid={dataTestId}
      sx={{
        minHeight: '100vh',
        background:
          theme.palette.mode === 'dark' ? theme.palette.background.default : 'transparent',
        position: 'relative',
        width: '100%',
        maxWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowX: 'hidden',
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          py: isMobile ? 1.5 : 2,
          px: isExtraSmall ? 0.5 : isMobile ? 1 : 2,
          overflowX: 'hidden',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: isMobile ? 0 : '24px',
            background: cardBackground,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 2,
            border: `1px solid ${cardBorderColor}`,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                : '0 8px 32px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: isMobile ? 3 : 4,
              flexWrap: 'wrap',
              gap: isMobile ? 2 : 3,
              p: isExtraSmall ? 1.5 : isMobile ? 2 : 4,
              borderBottom: '1px solid',
              borderColor: controlsBorderColor,
              background: controlsBackground,
              borderRadius: '16px 16px 0 0',
              position: 'relative',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              '@media (max-width: 380px)': {
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 1.5,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Skeleton variant="text" width={isExtraSmall ? 72 : 96} height={24} />
              <Skeleton variant="rectangular" width={56} height={32} sx={{ borderRadius: 16 }} />
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: isExtraSmall ? 1 : 1.5,
                flexWrap: 'wrap',
                justifyContent: { xs: 'stretch', sm: 'flex-end' },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              {['PvE', 'PvP', 'Both'].map((label) => (
                <Skeleton
                  key={label}
                  variant="rectangular"
                  width={isExtraSmall ? 76 : isMobile ? 88 : 104}
                  height={isExtraSmall ? 38 : isMobile ? 42 : 44}
                  sx={{ borderRadius: 2 }}
                />
              ))}
            </Box>
          </Box>

          {!isMobile ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 4,
                px: 4,
                borderBottom: '1px solid',
                borderColor:
                  theme.palette.mode === 'dark'
                    ? 'rgb(128 211 255 / 18%)'
                    : 'rgb(40 145 200 / 15%)',
                background:
                  theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.7)'
                    : 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px 8px 0 0',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                <Skeleton
                  variant="rectangular"
                  width={isTablet ? 112 : 128}
                  height={48}
                  sx={{ borderRadius: '8px 8px 0 0' }}
                />
                <Skeleton
                  variant="rectangular"
                  width={isTablet ? 108 : 120}
                  height={48}
                  sx={{ borderRadius: '8px 8px 0 0' }}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  alignItems: 'center',
                  backgroundColor: actionBarBackground,
                  borderBottom: '1px solid',
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgb(128 211 255 / 15%)'
                      : 'rgb(40 145 200 / 12%)',
                  borderRadius: 2,
                }}
              >
                <Skeleton variant="rectangular" width={108} height={36} sx={{ borderRadius: 2 }} />
                <Skeleton variant="rectangular" width={124} height={36} sx={{ borderRadius: 2 }} />
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 3, px: 2 }}>
              <Skeleton variant="rectangular" height={46} sx={{ borderRadius: '8px 8px 0 0' }} />
            </Box>
          )}

          <Box sx={{ px: isMobile ? 1 : 3, pb: 3 }}>
            {[0, 1].map((panelIndex) => (
              <Box key={panelIndex} sx={{ mb: panelIndex === 0 ? 4 : 0 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {[0, 1, 2, 3].map((categoryIndex) => (
                    <Box
                      key={categoryIndex}
                      sx={{
                        border: `1px solid ${sectionBorderColor}`,
                        borderRadius: 2,
                        background: sectionBackground,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 2,
                          borderBottom: `1px solid ${sectionBorderColor}`,
                        }}
                      >
                        <Skeleton
                          variant="text"
                          width={CATEGORY_WIDTHS[categoryIndex % CATEGORY_WIDTHS.length]}
                          height={24}
                        />
                        <Skeleton variant="circular" width={20} height={20} />
                      </Box>
                      <Box sx={{ pb: 2.5, pt: 1, px: isMobile ? 1 : 2 }}>
                        {Array.from({ length: 4 }).map((_, itemIndex) => (
                          <Box
                            key={itemIndex}
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'auto 60px 1fr auto auto',
                              alignItems: 'center',
                              gap: 2,
                              minHeight: 48,
                              py: 1,
                              px: 1,
                              borderRadius: 1,
                              '&:hover': {
                                background:
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(56, 189, 248, 0.05)'
                                    : 'rgba(40, 145, 200, 0.03)',
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'center', width: 24 }}>
                              <Skeleton variant="circular" width={18} height={18} />
                            </Box>
                            <Skeleton
                              variant="rectangular"
                              width={52}
                              height={34}
                              sx={{ borderRadius: 1 }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Skeleton
                                variant="text"
                                width={
                                  ITEM_NAME_WIDTHS[
                                    (itemIndex + categoryIndex) % ITEM_NAME_WIDTHS.length
                                  ]
                                }
                                height={16}
                              />
                              {(itemIndex + categoryIndex) % 3 === 0 && (
                                <Skeleton variant="circular" width={16} height={16} />
                              )}
                            </Box>
                            <Skeleton variant="text" width={44} height={16} />
                            <Skeleton
                              variant="text"
                              width={PER_WIDTHS[(itemIndex + panelIndex) % PER_WIDTHS.length]}
                              height={14}
                            />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Box
                  sx={{
                    mt: 3,
                    position: 'relative',
                    p: isMobile ? 2 : 3,
                    borderRadius: 2,
                    background: stickyBackground,
                    border: `1px solid ${stickyBorderColor}`,
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                        : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  {!isMobile && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 12,
                        right: 12,
                        height: 3,
                        borderRadius: '2px 2px 0 0',
                        background:
                          'linear-gradient(90deg, rgb(128 211 255 / 80%) 0%, rgb(56 189 248 / 80%) 50%, rgb(40 145 200 / 80%) 100%)',
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'row', sm: 'row' },
                      alignItems: { xs: 'center', sm: 'center' },
                      justifyContent: 'space-between',
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      gap: { xs: 1, sm: 3 },
                    }}
                  >
                    <Box sx={{ textAlign: 'left', flex: 1, minWidth: 180 }}>
                      <Skeleton variant="text" width={140} height={16} sx={{ mb: 0.75 }} />
                      <Skeleton variant="text" width={120} height={32} />
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 1,
                        minWidth: 200,
                      }}
                    >
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                        <Skeleton variant="circular" width={18} height={18} />
                        <Skeleton variant="text" width={76} height={16} />
                      </Box>
                      <Skeleton
                        variant="text"
                        width={panelIndex === 0 ? 200 : 164}
                        height={14}
                        sx={{ opacity: 0.8 }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 4, px: 3, pb: 4 }}>
            <Skeleton variant="text" width={240} height={24} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {[128, 112, 156].map((width, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="circular" width={12} height={12} />
                  <Skeleton variant="text" width={width} height={16} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

