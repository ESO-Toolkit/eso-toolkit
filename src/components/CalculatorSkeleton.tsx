import { Box, Container, Skeleton, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';

const ITEM_NAME_WIDTHS = [228, 256, 212, 242, 218];
const ARMOR_ITEM_WIDTHS = [180, 200, 190, 210];
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
  const sectionBorderColor =
    theme.palette.mode === 'dark' ? 'rgb(128 211 255 / 20%)' : 'rgb(40 145 200 / 15%)';
  const sectionBackground =
    theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.94)';

  const renderHeaderControls = (): React.JSX.Element => (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        mb: 4,
        flexWrap: 'wrap',
        gap: { xs: 2, sm: 3 },
        p: isExtraSmall ? 1.5 : isMobile ? 2 : 4,
        borderRadius: '10px',
        borderColor: sectionBorderColor,
        background:
          theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.98)',
        position: 'relative',
        flexDirection: { xs: 'column', sm: 'row' },
        '@media (max-width: 380px)': {
          flexDirection: 'column',
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
          flexWrap: 'wrap',
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'space-between', sm: 'flex-start' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton variant="rectangular" width={44} height={24} sx={{ borderRadius: 12 }} />
          <Skeleton
            variant="text"
            width={isExtraSmall ? 60 : 80}
            height={16}
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {/* Mobile Action Buttons - Only show on mobile */}
        {isMobile && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 1 }} />
          </Box>
        )}
      </Box>

      {/* Game Mode Selector */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'center', sm: 'flex-end' },
          width: { xs: '100%', sm: 'auto' },
          mb: { xs: 2, sm: 0 }, // Add margin on mobile to create space before separator line
        }}
      >
        <Box
          sx={{
            width: { xs: '100%', sm: 'auto' },
            display: 'flex',
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
                width={isExtraSmall ? 50 : isMobile ? 60 : 70}
                height={isExtraSmall ? 28 : isMobile ? 32 : 36}
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
    </Box>
  );

  const renderTabNavigation = (): React.JSX.Element => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 4,
        px: 4,
        borderBottom: '1px solid',
        borderColor: sectionBorderColor,
        background:
          theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px 8px 0 0',
        position: 'relative',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0,
      }}
    >
      {/* Tab Buttons Container */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          p: 0.5,
          backgroundColor:
            theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(248, 250, 252, 0.8)',
          borderRadius: '10px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          flex: 1,
          maxWidth: { xs: '100%', sm: '400px' },
        }}
      >
        {['Penetration', 'Critical', 'Armor Resistance'].map((label) => (
          <Skeleton
            key={label}
            variant="rectangular"
            width={isExtraSmall ? 70 : isMobile ? 85 : isTablet ? 95 : 110}
            height={isExtraSmall ? 32 : isMobile ? 36 : isTablet ? 38 : 40}
            sx={{
              borderRadius: '8px',
              flex: 1,
            }}
          />
        ))}
      </Box>

      {/* Desktop Bulk Actions - Only show on desktop */}
      {!isMobile && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: '10px',
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(21, 34, 50, 0.55)'
                : 'rgba(235, 244, 252, 0.85)',
            border: `1px solid ${
              theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(40, 145, 200, 0.18)'
            }`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            px: 2,
            py: 1,
            minWidth: '200px',
          }}
        >
          <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 2, mr: 1 }} />
          <Skeleton variant="rectangular" width={50} height={32} sx={{ borderRadius: 2 }} />
        </Box>
      )}
    </Box>
  );

  const renderAccordionSection = (title: string, itemCount: number = 3): React.JSX.Element => (
    <Box
      sx={{
        mb: 3,
        '&:last-child': {
          mb: 2,
        },
        '&.Mui-expanded': {
          mb: 4,
          '&:last-child': {
            mb: 3,
          },
        },
      }}
    >
      {/* Accordion Summary */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          minHeight: 48,
          cursor: 'pointer',
          border: `1px solid ${sectionBorderColor}`,
          borderRadius: 2,
          background: sectionBackground,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(56, 189, 248, 0.05)'
                : 'rgba(40, 145, 200, 0.03)',
          },
          '&:active': {
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(56, 189, 248, 0.08)'
                : 'rgba(40, 145, 200, 0.05)',
          },
        }}
      >
        <Skeleton
          variant="text"
          width={title.length * 8 + 40}
          height={24}
          sx={{ fontWeight: 600 }}
        />

        {/* Expand/Collapse Icon - chevron-like shape */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease-in-out',
          }}
        >
          <Skeleton
            variant="rectangular"
            width={24}
            height={24}
            sx={{
              borderRadius: 1,
              transform: 'rotate(0deg)',
            }}
          />
        </Box>
      </Box>

      {/* Accordion Details */}
      <Box
        sx={{
          pb: 2.5,
          pt: 1,
          px: isMobile ? 1 : 2,
        }}
      >
        {Array.from({ length: itemCount }).map((_, itemIndex) => (
          <Box
            key={itemIndex}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              minHeight: 48,
              py: 1,
              px: 1,
              borderRadius: 1,
              transition: 'background 0.2s ease',
              '&:hover': {
                background:
                  theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.05)'
                    : 'rgba(40, 145, 200, 0.03)',
              },
            }}
          >
            {/* Checkbox */}
            <Box sx={{ display: 'flex', justifyContent: 'center', width: 24 }}>
              <Skeleton variant="circular" width={18} height={18} />
            </Box>

            {/* Quantity Input */}
            <Skeleton variant="rectangular" width={52} height={34} sx={{ borderRadius: 1 }} />

            {/* Item Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
              <Skeleton
                variant="text"
                width={ITEM_NAME_WIDTHS[itemIndex % ITEM_NAME_WIDTHS.length]}
                height={16}
              />
              {itemIndex % 3 === 0 && <Skeleton variant="circular" width={16} height={16} />}
            </Box>

            {/* Value */}
            <Skeleton variant="text" width={44} height={16} />

            {/* Per/Quantity */}
            <Skeleton
              variant="text"
              width={PER_WIDTHS[itemIndex % PER_WIDTHS.length]}
              height={14}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );

  const renderArmorResistanceSection = (
    title: string,
    itemCount: number = 2,
  ): React.JSX.Element => (
    <Box
      sx={{
        mb: 3,
        border: `1px solid ${sectionBorderColor}`,
        borderRadius: 2,
        background: sectionBackground,
        overflow: 'hidden',
        '&:last-child': {
          mb: 2,
        },
      }}
    >
      {/* Accordion Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: `1px solid ${sectionBorderColor}`,
          cursor: 'pointer',
          '&:hover': {
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(56, 189, 248, 0.05)'
                : 'rgba(40, 145, 200, 0.03)',
          },
        }}
      >
        <Skeleton
          variant="text"
          width={title.length * 8 + 40}
          height={24}
          sx={{ fontWeight: 600 }}
        />
        <Skeleton variant="circular" width={24} height={24} />
      </Box>

      {/* Accordion Content */}
      <Box sx={{ pb: 2.5, pt: 1, px: isMobile ? 1 : 2 }}>
        {Array.from({ length: itemCount }).map((_, itemIndex) => (
          <Box
            key={itemIndex}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              minHeight: 48,
              py: 1,
              px: 1,
              borderRadius: 1,
              transition: 'background 0.2s ease',
              '&:hover': {
                background:
                  theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.05)'
                    : 'rgba(40, 145, 200, 0.03)',
              },
            }}
          >
            {/* Checkbox */}
            <Box sx={{ display: 'flex', justifyContent: 'center', width: 24 }}>
              <Skeleton variant="circular" width={18} height={18} />
            </Box>

            {/* Quantity Input */}
            <Skeleton variant="rectangular" width={52} height={34} sx={{ borderRadius: 1 }} />

            {/* Item Name with variant/quality */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
              <Skeleton
                variant="text"
                width={ARMOR_ITEM_WIDTHS[itemIndex % ARMOR_ITEM_WIDTHS.length]}
                height={16}
              />
              {/* Armor variant/quality indicators */}
              <Skeleton variant="rectangular" width={40} height={16} sx={{ borderRadius: 1 }} />
              <Skeleton variant="circular" width={12} height={12} />
            </Box>

            {/* Armor Value */}
            <Skeleton variant="text" width={35} height={16} />

            {/* Armor Control Button */}
            <Skeleton variant="rectangular" width={30} height={24} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
    </Box>
  );

  const renderSummaryGrid = (): React.JSX.Element => (
    <Box
      sx={{
        mt: 4,
        p: 3,
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
        borderRadius: 2,
        border: `1px solid ${sectionBorderColor}`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* 2x2 Grid Layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        {/* Top Left: Main Value */}
        <Box>
          <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={80} height={32} />
          <Skeleton variant="text" width={140} height={16} sx={{ mt: 1, opacity: 0.8 }} />
        </Box>

        {/* Top Right: Status */}
        <Box>
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
            gridColumn: { xs: '1', sm: '1 / -1' },
            p: 1.5,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 1,
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
          {renderHeaderControls()}

          {/* Tab Navigation */}
          {renderTabNavigation()}

          {/* Tab Content */}
          <Box sx={{ px: { xs: 1.5, sm: 3.75 }, pb: 3 }}>
            {/* Penetration Tab Content */}
            <Box>
              {renderAccordionSection('Group Buffs', 2)}
              {renderAccordionSection('Gear & Enchantments', 3)}
              {renderAccordionSection('Passives & Skills', 2)}
              {renderAccordionSection('Champion Points', 3)}
            </Box>

            {/* Critical Tab Content (similar structure) */}
            <Box>
              {renderAccordionSection('Group Buffs', 2)}
              {renderAccordionSection('Gear & Enchantments', 3)}
              {renderAccordionSection('Passives & Skills', 2)}
              {renderAccordionSection('Champion Points', 3)}
            </Box>

            {/* Armor Resistance Tab Content */}
            <Box>
              {renderArmorResistanceSection('Light Armor', 2)}
              {renderArmorResistanceSection('Medium Armor', 2)}
              {renderArmorResistanceSection('Heavy Armor', 2)}
              {renderArmorResistanceSection('Jewelry', 2)}
              {renderArmorResistanceSection('Weapons', 2)}
              {renderArmorResistanceSection('Armor Sets', 3)}
              {renderArmorResistanceSection('Group Buffs', 2)}
              {renderArmorResistanceSection('Passives & Skills', 3)}
              {renderArmorResistanceSection('Champion Points', 2)}
            </Box>
          </Box>

          {/* Summary Footer */}
          {renderSummaryGrid()}
        </Box>
      </Container>
    </Box>
  );
};