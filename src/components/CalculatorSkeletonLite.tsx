import { Box, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import React from 'react';

const MOBILE_ITEM_WIDTHS = [140, 160, 150, 170, 145];
const ARMOR_VARIANT_WIDTHS = [100, 120, 110, 130];

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
      {/* Tab navigation container */}
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
  );

  const renderMobileSection = (title: string, itemCount: number = 2): React.JSX.Element => (
    <Box sx={{ mb: 2 }}>
      {/* Section Title */}
      <Box sx={{ mb: 1.5, pl: 1 }}>
        <Skeleton
          variant="text"
          width={title.length * 6 + 25}
          height={16}
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Mobile Items - Compact Layout */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: itemCount }).map((_, itemIndex) => (
          <Box
            key={itemIndex}
            sx={{
              display: 'flex',
              alignItems: 'center',
              minHeight: 32,
              py: 0.75,
              px: 1,
              borderRadius: 1,
              pl: 1.5,
              '&:hover': {
                background:
                  theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.05)'
                    : 'rgba(40, 145, 200, 0.03)',
              },
            }}
          >
            {/* Compact Checkbox */}
            <Box sx={{ minWidth: 'auto', mr: 1 }}>
              <Skeleton variant="circular" width={14} height={14} />
            </Box>

            {/* Compact Quantity Input */}
            <Box sx={{ mr: 1 }}>
              <Skeleton variant="rectangular" width={28} height={22} sx={{ borderRadius: 1 }} />
            </Box>

            {/* Item Text */}
            <Box sx={{ flex: 1, mr: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                <Skeleton
                  variant="text"
                  width={MOBILE_ITEM_WIDTHS[itemIndex % MOBILE_ITEM_WIDTHS.length]}
                  height={14}
                />
                {/* Help Icon */}
                {itemIndex % 4 === 0 && <Skeleton variant="circular" width={10} height={10} />}
              </Box>
              {/* Subtitle */}
              <Skeleton
                variant="text"
                width={30 + Math.random() * 25}
                height={10}
                sx={{
                  fontSize: '0.6rem',
                  opacity: 0.7,
                }}
              />
            </Box>

            {/* Value Display */}
            <Skeleton variant="text" width={25} height={12} />
          </Box>
        ))}
      </Box>
    </Box>
  );

  const renderMobileArmorSection = (title: string, itemCount: number = 2): React.JSX.Element => (
    <Box sx={{ mb: 2 }}>
      {/* Section Title */}
      <Box sx={{ mb: 1.5, pl: 1 }}>
        <Skeleton
          variant="text"
          width={title.length * 6 + 25}
          height={16}
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Armor Items with variant/quality controls */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: itemCount }).map((_, itemIndex) => (
          <Box
            key={itemIndex}
            sx={{
              display: 'flex',
              alignItems: 'center',
              minHeight: 40,
              py: 1,
              px: 1,
              borderRadius: 1,
              pl: 1.5,
              '&:hover': {
                background:
                  theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.05)'
                    : 'rgba(40, 145, 200, 0.03)',
              },
            }}
          >
            {/* Checkbox */}
            <Box sx={{ minWidth: 'auto', mr: 1 }}>
              <Skeleton variant="circular" width={14} height={14} />
            </Box>

            {/* Quantity Input */}
            <Box sx={{ mr: 1 }}>
              <Skeleton variant="rectangular" width={28} height={22} sx={{ borderRadius: 1 }} />
            </Box>

            {/* Item Details with variant/quality */}
            <Box sx={{ flex: 1, mr: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Skeleton
                  variant="text"
                  width={ARMOR_VARIANT_WIDTHS[itemIndex % ARMOR_VARIANT_WIDTHS.length]}
                  height={14}
                />
              </Box>
              {/* Armor variant and quality indicators - compact */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Skeleton variant="rectangular" width={30} height={10} sx={{ borderRadius: 1 }} />
                <Skeleton variant="circular" width={6} height={6} />
                <Skeleton variant="rectangular" width={20} height={10} sx={{ borderRadius: 1 }} />
              </Box>
            </Box>

            {/* Armor Value */}
            <Skeleton variant="text" width={20} height={12} sx={{ mr: 1 }} />

            {/* Armor Control Button */}
            <Skeleton variant="rectangular" width={20} height={18} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
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
      {/* Summary Title */}
      <Skeleton variant="text" width={120} height={18} sx={{ mb: 2, fontWeight: 600 }} />

      {/* Mobile Summary Grid - 2x2 layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
          mb: 2,
        }}
      >
        {/* Main Value */}
        <Box sx={{ textAlign: 'center' }}>
          <Skeleton variant="text" width={50} height={24} sx={{ mx: 'auto', mb: 0.5 }} />
          <Skeleton variant="text" width={70} height={14} sx={{ mx: 'auto', opacity: 0.8 }} />
        </Box>

        {/* Status */}
        <Box sx={{ textAlign: 'center' }}>
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
      </Box>

      {/* Target Range Info */}
      <Box
        sx={{
          p: 1.5,
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 1,
          border: `1px solid ${sectionBorderColor}`,
        }}
      >
        <Skeleton variant="text" width={80} height={14} sx={{ mb: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Skeleton variant="text" width={40} height={12} />
          <Skeleton variant="text" width={45} height={12} />
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
          {/* Penetration Items - Mobile */}
          <Box sx={{ mb: 3 }}>
            {renderMobileSection('Group Buffs', 2)}
            {renderMobileSection('Gear & Enchantments', 3)}
            {renderMobileSection('Passives & Skills', 2)}
            {renderMobileSection('Champion Points', 3)}
          </Box>

          {/* Critical Items - Mobile */}
          <Box sx={{ mb: 3 }}>
            {renderMobileSection('Group Buffs', 2)}
            {renderMobileSection('Gear & Enchantments', 3)}
            {renderMobileSection('Passives & Skills', 2)}
            {renderMobileSection('Champion Points', 3)}
          </Box>

          {/* Armor Resistance Items - Mobile with Enhanced Controls */}
          <Box sx={{ mb: 3 }}>
            {renderMobileArmorSection('Light Armor', 2)}
            {renderMobileArmorSection('Medium Armor', 2)}
            {renderMobileArmorSection('Heavy Armor', 2)}
            {renderMobileArmorSection('Jewelry', 2)}
            {renderMobileArmorSection('Weapons', 2)}
            {renderMobileArmorSection('Armor Sets', 3)}
            {renderMobileArmorSection('Group Buffs', 2)}
            {renderMobileArmorSection('Passives & Skills', 3)}
            {renderMobileArmorSection('Champion Points', 2)}
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
