import { Box, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import React from 'react';

const MOBILE_ITEM_WIDTHS = [140, 160, 150, 170, 145];

interface CalculatorSkeletonLiteProps {
  /** Test ID for testing */
  'data-testid'?: string;
}

export const CalculatorSkeletonLite: React.FC<CalculatorSkeletonLiteProps> = ({
  'data-testid': dataTestId,
}) => {
  const theme = useTheme();
  const isExtraSmall = useMediaQuery('(max-width:380px)');

  const cardBackground =
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
      : 'linear-gradient(180deg, rgb(40 145 200 / 6%) 0%, rgba(248, 250, 252, 0.9) 100%)';
  const cardBorderColor =
    theme.palette.mode === 'dark' ? 'rgba(128, 211, 255, 0.2)' : 'rgba(203, 213, 225, 0.3)';
  const sectionBackground =
    theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.94)';
  const sectionBorderColor =
    theme.palette.mode === 'dark' ? 'rgb(128 211 255 / 20%)' : 'rgb(40 145 200 / 15%)';

  const renderHeaderControls = (): React.JSX.Element => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
        p: 2,
        borderRadius: '10px',
        borderColor: sectionBorderColor,
        background:
          theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.98)',
        position: 'relative',
        flexDirection: 'column',
        '@media (max-width: 380px)': {
          alignItems: 'stretch',
          gap: 1.5,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 16,
          right: 16,
          height: '1px',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(90deg, rgb(128 211 255 / 60%) 0%, rgb(56 189 248 / 60%) 50%, rgb(40 145 200 / 60%) 100%)'
              : 'linear-gradient(90deg, rgb(40 145 200 / 60%) 0%, rgb(56 189 248 / 60%) 50%, rgb(128 211 255 / 60%) 100%)',
          opacity: 0.7,
        },
      }}
    >
      {/* Lite Mode Switch */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton variant="rectangular" width={40} height={20} sx={{ borderRadius: 10 }} />
          <Skeleton
            variant="text"
            width={isExtraSmall ? 55 : 70}
            height={14}
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {/* Mobile Action Buttons - Always show on mobile lite */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rectangular" width={65} height={20} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={35} height={20} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>

      {/* Game Mode Selector */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          mb: 2, // Add margin on mobile to create space before separator line
        }}
      >
        {/* ButtonGroup skeleton */}
        <Box
          sx={{
            display: 'flex',
            width: '100%',
          }}
        >
          {['PvE', 'PvP', 'Both'].map((label) => (
            <Skeleton
              key={label}
              variant="rectangular"
              width={isExtraSmall ? 45 : 50}
              height={isExtraSmall ? 24 : 28}
              sx={{
                borderRadius: 0,
                '&:first-of-type': { borderRadius: '4px 0 0 4px' },
                '&:last-of-type': { borderRadius: '0 4px 4px 0' },
                flex: 1,
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );

  const renderTabNavigation = (): React.JSX.Element => (
    <Box sx={{ mb: 3 }}>
      {/* Tab navigation container - Mobile Tabs */}
      <Box
        sx={{
          mb: 3,
          px: 2,
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            p: 0.5,
            backgroundColor:
              theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(248, 250, 252, 0.8)',
            borderRadius: '10px',
            border: '1px solid rgba(148, 163, 184, 0.2)',
          }}
        >
          {['Penetration', 'Critical', 'Armor'].map((label) => (
            <Skeleton
              key={label}
              variant="rectangular"
              width={isExtraSmall ? 60 : 70}
              height={32}
              sx={{
                borderRadius: '8px',
                flex: 1,
                minWidth: '60px',
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );

  const renderMobileItems = (itemCount: number = 2): React.JSX.Element => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Array.from({ length: itemCount }).map((_, itemIndex) => (
        <Box
          key={itemIndex}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'auto minmax(50px, max-content) 1fr auto',
            alignItems: 'center',
            gap: 0.625,
            minHeight: 52,
            p: 0.125,
            background:
              theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
            border:
              theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.12)'
                : '1px solid rgba(203, 213, 225, 0.3)',
            borderRadius: '8px !important',
            mb: 0.625,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            '&:hover': {
              transform: 'translateY(-1px)',
              border:
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(56, 189, 248, 0.2)'
                  : '1px solid rgb(40 145 200 / 30%)',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 4px 12px rgba(56, 189, 248, 0.3)'
                  : '0 4px 12px rgb(40 145 200 / 25%)',
            },
          }}
        >
          {/* Mobile Checkbox - ListItemIcon structure */}
          <Box sx={{ minWidth: 'auto' }}>
            <Skeleton variant="circular" width={20} height={20} />
          </Box>

          {/* Mobile Quantity Input */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Skeleton variant="rectangular" width={56} height={38} sx={{ borderRadius: 1 }} />
          </Box>

          {/* Mobile Item Details - ListItemText structure */}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flex: 1,
                }}
              >
                <Skeleton
                  variant="text"
                  width={MOBILE_ITEM_WIDTHS[itemIndex % MOBILE_ITEM_WIDTHS.length]}
                  height={16}
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    lineHeight: 1.43,
                  }}
                />
                {/* Mobile Help Icon */}
                {itemIndex % 3 === 0 && <Skeleton variant="circular" width={14} height={14} />}
              </Box>
              {/* Mobile Locked Chip */}
              {itemIndex % 5 === 0 && (
                <Skeleton variant="rectangular" width={18} height={14} sx={{ borderRadius: 1 }} />
              )}
            </Box>
          </Box>

          {/* Mobile Value Display - Typography variant */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            {/* Main value - body2 variant */}
            <Skeleton
              variant="text"
              width={35}
              height={14}
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );

  const renderMobileSummary = (): React.JSX.Element => (
    <Box
      sx={{
        mt: 3,
        p: 2,
        background: sectionBackground,
        borderRadius: 2,
        border: `1px solid ${sectionBorderColor}`,
      }}
    >
      {/* Summary Title - Typography variant h6 */}
      <Skeleton
        variant="text"
        width={120}
        height={22}
        sx={{
          mb: 2,
          fontWeight: 600,
          fontSize: '1.05rem',
          letterSpacing: '0.0075em',
        }}
      />

      {/* Mobile Summary Grid - Matches actual renderSummaryFooter structure */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateAreas: '"value status" "underpen targets"',
          gap: 2,
          mb: 2,
        }}
      >
        {/* Main Value - Area "value" */}
        <Box sx={{ textAlign: 'center', gridArea: 'value' }}>
          <Skeleton variant="text" width={50} height={24} sx={{ mx: 'auto', mb: 0.5 }} />
          <Skeleton variant="text" width={70} height={14} sx={{ mx: 'auto', opacity: 0.8 }} />
        </Box>

        {/* Status - Area "status" */}
        <Box sx={{ textAlign: 'center', gridArea: 'status' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              mb: 0.5,
            }}
          >
            <Skeleton variant="circular" width={12} height={12} />
            <Skeleton variant="text" width={45} height={16} />
          </Box>
          <Skeleton variant="text" width={60} height={12} sx={{ mx: 'auto', opacity: 0.8 }} />
        </Box>

        {/* Underpen/Overpen Info - Area "underpen" */}
        <Box sx={{ gridArea: 'underpen' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Skeleton variant="circular" width={10} height={10} />
            <Skeleton variant="text" width={40} height={12} />
          </Box>
          <Skeleton variant="text" width={55} height={10} sx={{ ml: 2, opacity: 0.8 }} />
        </Box>

        {/* Target Range Info - Area "targets" */}
        <Box sx={{ gridArea: 'targets' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Skeleton variant="circular" width={10} height={10} />
            <Skeleton variant="text" width={45} height={12} />
          </Box>
          <Skeleton variant="text" width={50} height={10} sx={{ ml: 2, opacity: 0.8 }} />
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 1 }} />
      </Box>

      {/* Additional Stats - Mobile optimized */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Skeleton variant="text" width={30} height={16} sx={{ mx: 'auto', mb: 0.5 }} />
          <Skeleton variant="text" width={25} height={12} sx={{ mx: 'auto', opacity: 0.8 }} />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Skeleton variant="text" width={30} height={16} sx={{ mx: 'auto', mb: 0.5 }} />
          <Skeleton variant="text" width={25} height={12} sx={{ mx: 'auto', opacity: 0.8 }} />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Skeleton variant="text" width={30} height={16} sx={{ mx: 'auto', mb: 0.5 }} />
          <Skeleton variant="text" width={25} height={12} sx={{ mx: 'auto', opacity: 0.8 }} />
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
        padding: theme.spacing(1),
      }}
    >
      {/* Mobile Calculator Card */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: { xs: '12px', sm: '16px' },
          background: cardBackground,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 1,
          border: `1px solid ${cardBorderColor}`,
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Mobile Header Controls */}
        {renderHeaderControls()}

        {/* Mobile Tab Navigation */}
        {renderTabNavigation()}

        {/* Mobile Calculator Content - Lite Mode (Flattened List) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Penetration Items - Mobile (Default Tab) - Flattened list like actual lite mode */}
          <Box sx={{ mb: 3 }}>
            {renderMobileItems(2)} {/* Group Buffs */}
            {renderMobileItems(3)} {/* Gear & Enchantments */}
            {renderMobileItems(2)} {/* Passives & Skills */}
            {renderMobileItems(3)} {/* Champion Points */}
          </Box>
        </Box>

        {/* Mobile Summary Section */}
        {renderMobileSummary()}

        {/* Status Indicators - Mobile */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', px: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Skeleton variant="circular" width={8} height={8} />
            <Skeleton variant="text" width={55} height={10} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Skeleton variant="circular" width={8} height={8} />
            <Skeleton variant="text" width={40} height={10} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Skeleton variant="circular" width={8} height={8} />
            <Skeleton variant="text" width={35} height={10} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
