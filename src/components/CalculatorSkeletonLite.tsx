import { Box, Skeleton, Tooltip, useTheme } from '@mui/material';
import React from 'react';

interface CalculatorSkeletonLiteProps {
  /** Test ID for testing */
  'data-testid'?: string;
}

export const CalculatorSkeletonLite: React.FC<CalculatorSkeletonLiteProps> = ({
  'data-testid': dataTestId,
}) => {
  const theme = useTheme();

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
        padding: theme.spacing(2),
      }}
    >
      {/* Lite Calculator Card - simplified design */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: { xs: '16px', sm: '24px' },
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
              : 'linear-gradient(180deg, rgb(40 145 200 / 6%) 0%, rgba(248, 250, 252, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 1,
          border:
            theme.palette.mode === 'dark'
              ? '1px solid rgba(128, 211, 255, 0.2)'
              : '1px solid rgba(203, 213, 225, 0.3)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'auto',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
        }}
      >
        {/* Controls Section - Simplified for Lite Mode */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: { xs: 2, sm: 3, md: 4 },
            flexWrap: 'wrap',
            gap: { xs: 1, sm: 2, md: 3 },
            p: { xs: 2, sm: 3, md: 4 },
            borderBottom: `1px solid ${
              theme.palette.mode === 'dark' ? 'rgba(128, 211, 255, 20%)' : 'rgba(40, 145, 200, 15%)'
            }`,
            background:
              theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
            borderRadius: '1px 1px 0 0',
          }}
        >
          {/* Lite Mode Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="text" width={80} height={24} />
            <Skeleton variant="rectangular" width={50} height={32} sx={{ borderRadius: 16 }} />
          </Box>

          {/* Export Button */}
          <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
        </Box>

        {/* Mode Selector - Simplified for Lite */}
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>

        {/* Calculator Content - Lite Mode Single Column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Lite Mode - Direct Items (No Accordions) */}
          {Array.from({ length: 3 }).map((_, categoryIndex) => (
            <Box key={categoryIndex}>
              {/* Category Title (Simple, non-interactive) */}
              <Box sx={{ mb: 2 }}>
                <Skeleton
                  variant="text"
                  width={150 + Math.random() * 100}
                  height={20}
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              {/* Items in category - simplified layout */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  pl: 2,
                }}
              >
                {Array.from({ length: 3 + Math.floor(Math.random() * 2) }).map((_, itemIndex) => (
                  <Box
                    key={itemIndex}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: 36,
                      py: 0.5,
                      pl: 0.5,
                      borderRadius: 1,
                      '&:hover': {
                        background:
                          theme.palette.mode === 'dark'
                            ? 'rgba(56, 189, 248, 0.05)'
                            : 'rgba(40, 145, 200, 0.03)',
                      },
                    }}
                  >
                    {/* Checkbox - smaller in lite mode */}
                    <Box sx={{ minWidth: 'auto', mr: 0.125 }}>
                      <Skeleton variant="circular" width={16} height={16} />
                    </Box>

                    {/* Quantity Input - more compact */}
                    <Tooltip title={itemIndex === 0 ? 'Adjustable quantity' : ''}>
                      <Box sx={{ mr: 0.5 }}>
                        <Skeleton
                          variant="rectangular"
                          width={40}
                          height={28}
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                    </Tooltip>

                    {/* Item Text - compact layout */}
                    <Box sx={{ ml: 1.5, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                        <Skeleton variant="text" width={120 + Math.random() * 80} height={14} />
                        {/* Help Icon - smaller */}
                        {itemIndex % 3 === 0 && (
                          <Skeleton variant="circular" width={12} height={12} />
                        )}
                      </Box>
                      {/* Subtitle - smaller */}
                      <Skeleton
                        variant="text"
                        width={50 + Math.random() * 30}
                        height={10}
                        sx={{
                          mt: 0.5,
                          fontSize: '0.65rem',
                          color:
                            theme.palette.mode === 'dark'
                              ? 'rgba(148, 163, 184, 0.8)'
                              : 'rgba(100, 116, 139, 0.8)',
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Results Section - Simplified for Lite */}
        <Box sx={{ mt: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Penetration Result - Compact */}
          <Box
            sx={{
              flex: 1,
              minWidth: '200px',
              background:
                theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.8)'
                  : 'rgba(255, 255, 255, 0.9)',
              borderRadius: 1,
              border: `1px solid ${
                theme.palette.mode === 'dark'
                  ? 'rgba(128, 211, 255, 20%)'
                  : 'rgba(40, 145, 200, 15%)'
              }`,
              p: 2,
            }}
          >
            <Skeleton
              variant="text"
              width={100}
              height={14}
              sx={{
                fontWeight: 700,
                mb: 1,
                color: theme.palette.mode === 'dark' ? '#93c5fd' : theme.palette.primary.main,
                fontSize: '0.8rem',
              }}
            />
            <Skeleton
              variant="text"
              width={40}
              height={24}
              sx={{
                fontWeight: 700,
                fontSize: '1.4rem',
                color: theme.palette.mode === 'dark' ? '#f1f5f9' : '#0f172a',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </Box>

          {/* Critical Result - Compact */}
          <Box
            sx={{
              flex: 1,
              minWidth: '200px',
              background:
                theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.8)'
                  : 'rgba(255, 255, 255, 0.9)',
              borderRadius: 1,
              border: `1px solid ${
                theme.palette.mode === 'dark'
                  ? 'rgba(128, 211, 255, 20%)'
                  : 'rgba(40, 145, 200, 15%)'
              }`,
              p: 2,
            }}
          >
            <Skeleton
              variant="text"
              width={120}
              height={14}
              sx={{
                fontWeight: 700,
                mb: 1,
                color: theme.palette.mode === 'dark' ? '#93c5fd' : theme.palette.primary.main,
                fontSize: '0.8rem',
              }}
            />
            <Skeleton
              variant="text"
              width={35}
              height={24}
              sx={{
                fontWeight: 700,
                fontSize: '1.4rem',
                color: theme.palette.mode === 'dark' ? '#f1f5f9' : '#0f172a',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </Box>
        </Box>

        {/* Status Indicators - Simplified */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={12} height={12} sx={{ borderRadius: '50%' }} />
            <Skeleton variant="text" width={80} height={12} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={12} height={12} sx={{ borderRadius: '50%' }} />
            <Skeleton variant="text" width={60} height={12} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={12} height={12} sx={{ borderRadius: '50%' }} />
            <Skeleton variant="text" width={50} height={12} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
