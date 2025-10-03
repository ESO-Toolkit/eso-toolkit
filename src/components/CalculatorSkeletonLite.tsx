import { Box, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import React from 'react';

const MOBILE_TAB_WIDTHS = [85, 75, 110];
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

  const renderMobileTabNavigation = (): React.JSX.Element => (
    <Box sx={{ mb: 3 }}>
      <Skeleton variant="text" width={120} height={20} sx={{ mb: 2, fontWeight: 600 }} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap' }}>
        {['Penetration', 'Critical', 'Armor'].map((label, index) => (
          <Skeleton
            key={label}
            variant="rectangular"
            width={MOBILE_TAB_WIDTHS[index]}
            height={36}
            sx={{
              borderRadius: 2,
              flex: 1,
              minWidth: '70px',
            }}
          />
        ))}
      </Box>
    </Box>
  );

  const renderMobileItems = (categoryName: string, itemCount: number = 3): React.JSX.Element => (
    <Box sx={{ mb: 2 }}>
      {/* Category Title - simplified for mobile */}
      <Box sx={{ mb: 1.5, pl: 1 }}>
        <Skeleton
          variant="text"
          width={80 + Math.random() * 60}
          height={16}
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Mobile Items - compact layout */}
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
              <Skeleton
                variant="rectangular"
                width={32}
                height={24}
                sx={{ borderRadius: 1 }}
              />
            </Box>

            {/* Item Name and Details */}
            <Box sx={{ flex: 1, mr: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                <Skeleton
                  variant="text"
                  width={MOBILE_ITEM_WIDTHS[itemIndex % MOBILE_ITEM_WIDTHS.length]}
                  height={14}
                />
                {/* Help Icon - smaller on mobile */}
                {itemIndex % 4 === 0 && (
                  <Skeleton variant="circular" width={10} height={10} />
                )}
              </Box>
              {/* Subtitle - very compact */}
              <Skeleton
                variant="text"
                width={40 + Math.random() * 30}
                height={10}
                sx={{
                  fontSize: '0.6rem',
                  opacity: 0.7,
                }}
              />
            </Box>

            {/* Value Display */}
            <Skeleton variant="text" width={30} height={12} />
          </Box>
        ))}
      </Box>
    </Box>
  );

  const renderArmorResistanceItems = (): React.JSX.Element => (
    <Box sx={{ mb: 2 }}>
      {/* Armor Resistance Category Header */}
      <Box sx={{ mb: 1.5, pl: 1 }}>
        <Skeleton
          variant="text"
          width={100 + Math.random() * 50}
          height={16}
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Armor Items with variant/quality controls */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: 2 + Math.floor(Math.random() * 2) }).map((_, itemIndex) => (
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
              <Skeleton
                variant="rectangular"
                width={32}
                height={24}
                sx={{ borderRadius: 1 }}
              />
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
                <Skeleton variant="rectangular" width={35} height={12} sx={{ borderRadius: 1 }} />
                <Skeleton variant="circular" width={8} height={8} />
                <Skeleton variant="rectangular" width={25} height={12} sx={{ borderRadius: 1 }} />
              </Box>
            </Box>

            {/* Armor Value */}
            <Skeleton variant="text" width={25} height={12} sx={{ mr: 1 }} />

            {/* Armor Control Button */}
            <Skeleton
              variant="rectangular"
              width={24}
              height={20}
              sx={{ borderRadius: 1 }}
            />
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
      <Skeleton variant="text" width={140} height={18} sx={{ mb: 2, fontWeight: 600 }} />

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
          <Skeleton variant="text" width={60} height={24} sx={{ mx: 'auto', mb: 0.5 }} />
          <Skeleton variant="text" width={80} height={14} sx={{ mx: 'auto', opacity: 0.8 }} />
        </Box>

        {/* Status */}
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
            <Skeleton variant="circular" width={12} height={12} />
            <Skeleton variant="text" width={50} height={16} />
          </Box>
          <Skeleton variant="text" width={70} height={12} sx={{ mx: 'auto', opacity: 0.8 }} />
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
        <Skeleton variant="text" width={90} height={14} sx={{ mb: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Skeleton variant="text" width={45} height={12} />
          <Skeleton variant="text" width={50} height={12} />
        </Box>
      </Box>
    </Box>
  );

  const renderMobileBulkActions = (): React.JSX.Element => (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        mb: 2,
        p: 1.5,
        background: sectionBackground,
        borderRadius: 2,
        border: `1px solid ${sectionBorderColor}`,
      }}
    >
      <Skeleton
        variant="rectangular"
        width={isExtraSmall ? 70 : 80}
        height={32}
        sx={{ borderRadius: 2, flex: 1 }}
      />
      <Skeleton
        variant="rectangular"
        width={isExtraSmall ? 70 : 80}
        height={32}
        sx={{ borderRadius: 2, flex: 1 }}
      />
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
            gap: 1,
            p: 2,
            borderBottom: `1px solid ${sectionBorderColor}`,
            background: sectionBackground,
            borderRadius: '4px 4px 0 0',
          }}
        >
          {/* Lite Mode Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="text" width={60} height={20} />
            <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 12 }} />
          </Box>

          {/* Export & Mode Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="rectangular" width={80} height={28} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={50} height={28} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>

        {/* Game Mode Selector */}
        <Box sx={{ mb: 3, px: 1 }}>
          <Skeleton variant="text" width={100} height={16} sx={{ mb: 1, opacity: 0.8 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['PvE', 'PvP', 'Both'].map((label) => (
              <Skeleton
                key={label}
                variant="rectangular"
                width={isExtraSmall ? 45 : 50}
                height={30}
                sx={{ borderRadius: 1, flex: 1 }}
              />
            ))}
          </Box>
        </Box>

        {/* Mobile Tab Navigation */}
        {renderMobileTabNavigation()}

        {/* Mobile Bulk Actions */}
        {renderMobileBulkActions()}

        {/* Mobile Calculator Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Penetration Items - Mobile */}
          <Box sx={{ mb: 3 }}>
            {['Buffs', 'Debuffs', 'Gear'].map((category) => (
              <Box key={category}>
                {renderMobileItems(category, 2 + Math.floor(Math.random() * 2))}
              </Box>
            ))}
          </Box>

          {/* Critical Items - Mobile */}
          <Box sx={{ mb: 3 }}>
            {['Buffs', 'Gear', 'Passives'].map((category) => (
              <Box key={category}>
                {renderMobileItems(category, 2 + Math.floor(Math.random() * 2))}
              </Box>
            ))}
          </Box>

          {/* Armor Resistance Items - Mobile with Enhanced Controls */}
          <Box sx={{ mb: 3 }}>
            {/* Armor Resistance Special Header */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                background: sectionBackground,
                borderRadius: 1,
                border: `1px solid ${sectionBorderColor}`,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Skeleton variant="text" width={120} height={18} sx={{ fontWeight: 600 }} />
                <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
              </Box>
              {/* Armor Controls */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Skeleton variant="rectangular" width={50} height={20} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={40} height={20} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={30} height={20} sx={{ borderRadius: 1 }} />
              </Box>
            </Box>

            {/* Armor Categories */}
            {['Light', 'Medium', 'Heavy', 'Jewelry'].map((category) => (
              <Box key={category}>
                {renderArmorResistanceItems()}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Mobile Summary Section */}
        {renderMobileSummary()}

        {/* Status Indicators - Mobile */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', px: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Skeleton variant="circular" width={8} height={8} />
            <Skeleton variant="text" width={60} height={10} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Skeleton variant="circular" width={8} height={8} />
            <Skeleton variant="text" width={45} height={10} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Skeleton variant="circular" width={8} height={8} />
            <Skeleton variant="text" width={40} height={10} />
          </Box>
        </Box>
      </Box>

      {/* Mobile Modal Skeleton for Armor Variant Selection */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: cardBackground,
          borderTop: `1px solid ${cardBorderColor}`,
          borderRadius: '16px 16px 0 0',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 -8px 32px rgba(0, 0, 0, 0.4)'
            : '0 -8px 32px rgba(0, 0, 0, 0.1)',
          p: 3,
          transform: 'translateY(0)',
          zIndex: 9999,
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {/* Mobile Modal Header */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Skeleton variant="text" width={150} height={20} sx={{ mx: 'auto', mb: 1 }} />
          <Skeleton variant="text" width={120} height={14} sx={{ mx: 'auto', opacity: 0.8 }} />
        </Box>

        {/* Mobile Modal Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                background: sectionBackground,
                borderRadius: 1,
                border: `1px solid ${sectionBorderColor}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={16} height={16} />
                <Skeleton variant="text" width={100 + index * 15} height={14} />
              </Box>
              <Skeleton variant="rectangular" width={50} height={20} sx={{ borderRadius: 1 }} />
            </Box>
          ))}
        </Box>

        {/* Mobile Modal Actions */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton
            variant="rectangular"
            width={100}
            height={40}
            sx={{ borderRadius: 2, flex: 1 }}
          />
          <Skeleton
            variant="rectangular"
            width={120}
            height={40}
            sx={{ borderRadius: 2, flex: 1 }}
          />
        </Box>
      </Box>
    </Box>
  );
};