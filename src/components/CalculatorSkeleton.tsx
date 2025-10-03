import { Box, Container, Skeleton, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';

const CATEGORY_WIDTHS = [188, 224, 204, 236];
const ITEM_NAME_WIDTHS = [228, 256, 212, 242, 218];
const PER_WIDTHS = [26, 30, 34];
const ARMOR_VARIANT_WIDTHS = [120, 140, 130, 150];
const ARMOR_QUALITY_WIDTHS = [80, 90, 85, 95];

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
  
  const renderTabButtons = (): React.JSX.Element => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'space-between' : 'flex-start',
        gap: isExtraSmall ? 0.5 : isMobile ? 1 : 2,
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        flexDirection: isMobile ? 'row' : 'column',
        width: isMobile ? '100%' : 'auto',
      }}
    >
      {['Penetration', 'Critical', 'Armor Resistance'].map((label) => (
        <Skeleton
          key={label}
          variant="rectangular"
          width={isExtraSmall ? 80 : isMobile ? 95 : isTablet ? 110 : 128}
          height={isExtraSmall ? 36 : isMobile ? 40 : isTablet ? 42 : 44}
          sx={{
            borderRadius: 2,
            flex: isMobile ? 1 : 'none',
            minWidth: isMobile ? 'auto' : '80px',
          }}
        />
      ))}
    </Box>
  );

  const renderArmorResistanceControls = (): React.JSX.Element => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Variant Selector Skeleton */}
      <Skeleton
        variant="rectangular"
        width={isExtraSmall ? 60 : isMobile ? 80 : 120}
        height={isExtraSmall ? 28 : isMobile ? 32 : 36}
        sx={{ borderRadius: 1 }}
      />
      {/* Quality Selector Skeleton */}
      <Skeleton
        variant="rectangular"
        width={isExtraSmall ? 50 : isMobile ? 60 : 80}
        height={isExtraSmall ? 28 : isMobile ? 32 : 36}
        sx={{ borderRadius: 1 }}
      />
      {/* Quantity Input Skeleton */}
      <Skeleton
        variant="rectangular"
        width={isExtraSmall ? 40 : isMobile ? 45 : 60}
        height={isExtraSmall ? 28 : isMobile ? 32 : 36}
        sx={{ borderRadius: 1 }}
      />
    </Box>
  );

  const renderPenetrationItems = (): React.JSX.Element => (
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
            {Array.from({ length: 3 + Math.floor(Math.random() * 2) }).map((_, itemIndex) => (
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
                  width={PER_WIDTHS[(itemIndex + categoryIndex) % PER_WIDTHS.length]}
                  height={14}
                />
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );

  const renderArmorResistanceItems = (): React.JSX.Element => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Armor Resistance has more complex categories */}
      {['Light Armor', 'Medium Armor', 'Heavy Armor', 'Jewelry', 'Weapons', 'Sets', 'Buffs', 'Passives'].map((category, categoryIndex) => (
        <Box
          key={category}
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
              width={ARMOR_VARIANT_WIDTHS[categoryIndex % ARMOR_VARIANT_WIDTHS.length]}
              height={24}
            />
            <Skeleton variant="circular" width={20} height={20} />
          </Box>
          <Box sx={{ pb: 2.5, pt: 1, px: isMobile ? 1 : 2 }}>
            {Array.from({ length: 2 + Math.floor(Math.random() * 3) }).map((_, itemIndex) => (
              <Box
                key={itemIndex}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 60px 1fr auto auto auto',
                  alignItems: 'center',
                  gap: isMobile ? 1 : 2,
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
                      ARMOR_QUALITY_WIDTHS[
                        (itemIndex + categoryIndex) % ARMOR_QUALITY_WIDTHS.length
                      ]
                    }
                    height={16}
                  />
                  {/* Armor items have variant/quality indicators */}
                  {categoryIndex < 6 && (
                    <>
                      <Skeleton variant="rectangular" width={40} height={16} sx={{ borderRadius: 1 }} />
                      <Skeleton variant="circular" width={12} height={12} />
                    </>
                  )}
                </Box>
                <Skeleton variant="text" width={44} height={16} />
                <Skeleton variant="text" width={35} height={14} />
                {/* Armor Resistance has additional controls */}
                {categoryIndex < 6 && (
                  <Skeleton variant="rectangular" width={30} height={24} sx={{ borderRadius: 1 }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );

  const renderSummaryGrid = (): React.JSX.Element => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 2,
        mb: 3,
      }}
    >
      {/* Top Left: Main Value */}
      <Box
        sx={{
          gridArea: { xs: 'auto', sm: '1 / 1 / 2 / 2' },
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 2,
          p: 2,
          border: `1px solid ${sectionBorderColor}`,
        }}
      >
        <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={80} height={32} />
        <Skeleton variant="text" width={140} height={16} sx={{ mt: 1, opacity: 0.8 }} />
      </Box>

      {/* Top Right: Status */}
      <Box
        sx={{
          gridArea: { xs: 'auto', sm: '1 / 2 / 2 / 3' },
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 2,
          p: 2,
          border: `1px solid ${sectionBorderColor}`,
        }}
      >
        <Skeleton variant="text" width={100} height={20} sx={{ mb: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton variant="text" width={60} height={16} />
        </Box>
        <Skeleton variant="text" width={90} height={14} sx={{ mt: 1, opacity: 0.8 }} />
      </Box>

      {/* Bottom: Target Info (spans 2 columns) */}
      <Box
        sx={{
          gridArea: { xs: 'auto', sm: '2 / 1 / 3 / 3' },
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 2,
          p: 2,
          border: `1px solid ${sectionBorderColor}`,
        }}
      >
        <Skeleton variant="text" width={110} height={18} sx={{ mb: 1.5 }} />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={12} height={12} />
            <Skeleton variant="text" width={80} height={14} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={12} height={12} />
            <Skeleton variant="text" width={65} height={14} />
          </Box>
        </Box>
      </Box>
    </Box>
  );

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
          {/* Header Controls */}
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

          {/* Tab Navigation */}
          <Box
            sx={{
              display: 'flex',
              alignItems: isMobile ? 'stretch' : 'flex-start',
              justifyContent: 'space-between',
              mb: 4,
              px: 4,
              borderBottom: '1px solid',
              borderColor: controlsBorderColor,
              background: controlsBackground,
              borderRadius: '8px 8px 0 0',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 2 : 0,
            }}
          >
            {renderTabButtons()}

            {/* Bulk Actions */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                p: 2,
                alignItems: 'center',
                backgroundColor: actionBarBackground,
                borderBottom: '1px solid',
                borderColor: controlsBorderColor,
                borderRadius: 2,
              }}
            >
              <Skeleton variant="rectangular" width={108} height={36} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rectangular" width={124} height={36} sx={{ borderRadius: 2 }} />
            </Box>
          </Box>

          {/* Tab Content */}
          <Box sx={{ px: isMobile ? 1 : 3, pb: 3 }}>
            {/* Penetration Tab */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {renderPenetrationItems()}
              </Box>
            </Box>

            {/* Critical Tab - similar to penetration */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {renderPenetrationItems()}
              </Box>
            </Box>

            {/* Armor Resistance Tab with enhanced controls */}
            <Box sx={{ mb: 4 }}>
              {/* Armor Resistance has special header controls */}
              <Box sx={{ mb: 3, p: 2, background: sectionBackground, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Skeleton variant="text" width={180} height={24} />
                  <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 2 }} />
                </Box>
                {renderArmorResistanceControls()}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {renderArmorResistanceItems()}
              </Box>
            </Box>
          </Box>

          {/* Summary Footer - 2x2 Grid Layout */}
          <Box sx={{ mt: 4, px: 3, pb: 4 }}>
            <Skeleton variant="text" width={240} height={24} sx={{ mb: 2 }} />
            {renderSummaryGrid()}
          </Box>
        </Box>
      </Container>

      {/* Modal Skeleton for Armor Variant Selection */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        <Box
          sx={{
            background: cardBackground,
            borderRadius: 2,
            border: `1px solid ${cardBorderColor}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)',
            maxWidth: { xs: '90vw', sm: '500px' },
            width: '100%',
            maxHeight: { xs: '80vh', sm: '70vh' },
            overflow: 'hidden',
          }}
        >
          {/* Modal Header */}
          <Box sx={{ p: 3, borderBottom: `1px solid ${sectionBorderColor}` }}>
            <Skeleton variant="text" width={200} height={24} />
            <Skeleton variant="text" width={160} height={16} sx={{ mt: 1, opacity: 0.8 }} />
          </Box>

          {/* Modal Content */}
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    border: `1px solid ${sectionBorderColor}`,
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="circular" width={20} height={20} />
                    <Skeleton variant="text" width={120 + index * 20} height={16} />
                  </Box>
                  <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Modal Actions */}
          <Box sx={{ p: 3, borderTop: `1px solid ${sectionBorderColor}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 2 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};