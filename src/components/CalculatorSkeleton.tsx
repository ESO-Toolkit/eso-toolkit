import { Box, Container, Skeleton, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';

const ITEM_NAME_WIDTHS = [228, 256, 212, 242, 218];
const ARMOR_ITEM_WIDTHS = [180, 200, 190, 210];
const _PER_WIDTHS = [26, 30, 34];

interface CalculatorSkeletonProps {
  /** Test ID for testing */
  'data-testid'?: string;
}

export const CalculatorSkeleton: React.FC<CalculatorSkeletonProps> = ({
  'data-testid': dataTestId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const _isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isExtraSmall = useMediaQuery('(max-width:380px)');
  const liteMode = false; // Regular skeleton is not lite mode

  const cardBorderColor =
    theme.palette.mode === 'dark' ? 'rgba(128, 211, 255, 0.2)' : 'rgba(203, 213, 225, 0.3)';
  const cardBackground =
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
      : 'linear-gradient(180deg, rgb(40 145 200 / 6%) 0%, rgba(248, 250, 252, 0.9) 100%)';
  const sectionBorderColor =
    theme.palette.mode === 'dark' ? 'rgb(128 211 255 / 20%)' : 'rgb(40 145 200 / 15%)';
  const _sectionBackground =
    theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.94)';

  const renderHeaderControls = (): React.JSX.Element => (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        mb: isMobile ? 3 : 4,
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
        borderColor:
          theme.palette.mode === 'dark' ? 'rgb(128 211 255 / 18%)' : 'rgb(40 145 200 / 15%)',
        background: liteMode
          ? theme.palette.mode === 'dark'
            ? 'rgba(15, 23, 42, 0.0)'
            : 'rgba(255, 255, 255, 0.0)'
          : theme.palette.mode === 'dark'
            ? 'rgba(15, 23, 42, 0.7)'
            : 'rgba(255, 255, 255, 0.95)',
        position: 'relative',
        borderRadius: '8px 8px 0 0',
      }}
    >
      {/* Left side - Tab Navigation Container */}
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
            width={liteMode ? 80 : 100}
            height={32}
            sx={{
              borderRadius: '8px',
              flex: 1,
            }}
          />
        ))}
      </Box>

      {/* Right side - Action Buttons Container */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          p: 2,
          alignItems: 'center',
          borderRadius: '10px',
          backgroundColor: liteMode
            ? theme.palette.mode === 'dark'
              ? 'rgba(15, 23, 42, 0.0)'
              : 'rgba(255, 255, 255, 0.0)'
            : theme.palette.mode === 'dark'
              ? 'rgba(15, 23, 42, 0.3)'
              : 'rgba(255, 255, 255, 0.5)',
          borderColor:
            theme.palette.mode === 'dark' ? 'rgb(128 211 255 / 15%)' : 'rgb(40 145 200 / 12%)',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        {/* Select All and Clear All ButtonGroup Skeleton */}
        <Box
          sx={{
            display: 'flex',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Skeleton
            variant="rectangular"
            width={70}
            height={24}
            sx={{
              borderRadius: 0,
              '&:first-of-type': { borderRadius: '10px 0 0 10px' },
            }}
          />
          <Skeleton
            variant="rectangular"
            width={55}
            height={24}
            sx={{
              borderRadius: 0,
              '&:last-of-type': { borderRadius: '0 10px 10px 0' },
            }}
          />
        </Box>
      </Box>
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
        // Match MUI Accordion default styles
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
        border: `1px solid ${sectionBorderColor}`,
        borderRadius: 1,
        position: 'relative',
        '&::before': {
          display: 'block',
          height: 1,
          backgroundColor: sectionBorderColor,
          content: '""',
          transition: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
          opacity: 0.1,
          position: 'absolute',
          left: 0,
          right: 0,
          top: -1,
        },
      }}
    >
      {/* Accordion Summary */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
          px: 2,
          py: 0,
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(56, 189, 248, 0.05)'
                : 'rgba(40, 145, 200, 0.03)',
          },
          '&.Mui-expanded': {
            minHeight: 64,
          },
        }}
      >
        <Skeleton
          variant="text"
          width={title.length * 8 + 40}
          height={22}
          sx={{
            fontWeight: 600,
            fontSize: '1.25rem',
            letterSpacing: '0.0075em',
          }}
        />

        {/* Expand Icon - matches MUI ExpandMoreIcon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            color: theme.palette.mode === 'dark' ? 'rgb(156 163 175)' : 'rgb(107 114 128)',
            transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Box
            sx={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${theme.palette.mode === 'dark' ? 'rgb(156 163 175)' : 'rgb(107 114 128)'}`,
              transform: 'rotate(0deg)',
              transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </Box>
      </Box>

      {/* Accordion Details */}
      <Box
        sx={{
          pb: 2.5,
          pt: 1,
          px: liteMode ? 2 : isMobile ? 1 : 2,
        }}
      >
        {/* List wrapper - matches actual calculator structure */}
        <Box sx={{ p: 0 }}>
          {Array.from({ length: itemCount }).map((_, itemIndex) => (
            <Box
              key={itemIndex}
              sx={{
                display: 'grid',
                gridTemplateColumns: liteMode
                  ? 'auto minmax(36px, max-content) 1fr auto'
                  : isMobile
                    ? 'auto minmax(50px, max-content) 1fr auto'
                    : 'auto minmax(60px, max-content) 1fr auto auto',
                alignItems: 'center',
                gap: liteMode ? 0.625 : 2,
                minHeight: liteMode ? 36 : isMobile ? 52 : 48,
                p: liteMode ? 0.125 : 1.5,
                background:
                  theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.6)'
                    : 'rgba(241, 245, 249, 0.8)',
                border:
                  theme.palette.mode === 'dark'
                    ? '1px solid rgba(255, 255, 255, 0.12)'
                    : '1px solid rgba(203, 213, 225, 0.3)',
                borderRadius: '8px !important',
                mb: liteMode ? 0.625 : 1,
                transition: liteMode ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                '&:hover': {
                  transform: liteMode ? 'none' : 'translateY(-1px)',
                  border:
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(56, 189, 248, 0.2)'
                      : '1px solid rgb(40 145 200 / 30%)',
                  boxShadow: liteMode
                    ? 'none'
                    : theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(56, 189, 248, 0.3)'
                      : '0 4px 12px rgb(40 145 200 / 25%)',
                },
              }}
            >
              {/* Checkbox - Matches ListItemIcon structure */}
              <Box sx={{ minWidth: 'auto' }}>
                <Skeleton
                  variant="circular"
                  width={isMobile ? 20 : 16}
                  height={isMobile ? 20 : 16}
                />
              </Box>

              {/* Quantity Input - Matches control slot width */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Skeleton
                  variant="rectangular"
                  width={isMobile ? 56 : 48}
                  height={isMobile ? 38 : 32}
                  sx={{ borderRadius: 1 }}
                />
              </Box>

              {/* Item Name and Info - Matches ListItemText structure */}
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: liteMode ? 1.5 : 0.75,
                      flex: 1,
                    }}
                  >
                    <Skeleton
                      variant="text"
                      width={ITEM_NAME_WIDTHS[itemIndex % ITEM_NAME_WIDTHS.length]}
                      height={14}
                    />
                    {/* Help icon skeleton - matches InfoIcon */}
                    {itemIndex % 3 === 0 && <Skeleton variant="circular" width={14} height={14} />}
                  </Box>
                  {/* Locked chip skeleton */}
                  {itemIndex % 5 === 0 && (
                    <Skeleton
                      variant="rectangular"
                      width={16}
                      height={12}
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                </Box>
              </Box>

              {/* Value Display - Matches the Box with flexDirection: column and alignItems: flex-end */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                }}
              >
                {/* Per display (caption text above main value) */}
                {!liteMode && itemIndex % 2 === 0 && (
                  <Skeleton variant="text" width={30} height={12} sx={{ mb: 0.25 }} />
                )}

                {/* Main value */}
                <Skeleton variant="text" width={45} height={16} />
              </Box>
            </Box>
          ))}
        </Box>{' '}
        {/* Close List wrapper */}
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
        '&:last-child': {
          mb: 2,
        },
        '&.Mui-expanded': {
          mb: 4,
          '&:last-child': {
            mb: 3,
          },
        },
        // Match MUI Accordion default styles
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
        border: `1px solid ${sectionBorderColor}`,
        borderRadius: 1,
        position: 'relative',
        '&::before': {
          display: 'block',
          height: 1,
          backgroundColor: sectionBorderColor,
          content: '""',
          transition: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
          opacity: 0.1,
          position: 'absolute',
          left: 0,
          right: 0,
          top: -1,
        },
      }}
    >
      {/* Accordion Summary */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
          px: 2,
          py: 0,
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(56, 189, 248, 0.05)'
                : 'rgba(40, 145, 200, 0.03)',
          },
          '&.Mui-expanded': {
            minHeight: 64,
          },
        }}
      >
        <Skeleton
          variant="text"
          width={title.length * 8 + 40}
          height={22}
          sx={{
            fontWeight: 600,
            fontSize: '1.25rem',
            letterSpacing: '0.0075em',
          }}
        />

        {/* Expand Icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            color: theme.palette.mode === 'dark' ? 'rgb(156 163 175)' : 'rgb(107 114 128)',
            transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Skeleton variant="circular" width={20} height={20} />
        </Box>
      </Box>

      {/* Accordion Details */}
      <Box sx={{ pb: 2.5, pt: 1, px: liteMode ? 2 : isMobile ? 1 : 2 }}>
        {/* List wrapper */}
        <Box sx={{ p: 0 }}>
          {Array.from({ length: itemCount }).map((_, itemIndex) => (
            <Box
              key={itemIndex}
              sx={{
                display: 'grid',
                gridTemplateColumns: liteMode
                  ? 'auto minmax(36px, max-content) 1fr auto auto'
                  : isMobile
                    ? 'auto minmax(50px, max-content) 1fr auto auto'
                    : 'auto minmax(60px, max-content) 1fr auto auto',
                alignItems: 'center',
                gap: liteMode ? 0.625 : 2,
                minHeight: liteMode ? 36 : isMobile ? 52 : 48,
                p: liteMode ? 0.125 : 1.5,
                background:
                  theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.6)'
                    : 'rgba(241, 245, 249, 0.8)',
                border:
                  theme.palette.mode === 'dark'
                    ? '1px solid rgba(255, 255, 255, 0.12)'
                    : '1px solid rgba(203, 213, 225, 0.3)',
                borderRadius: '8px !important',
                mb: liteMode ? 0.625 : 1,
                transition: liteMode ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                '&:hover': {
                  transform: liteMode ? 'none' : 'translateY(-1px)',
                  border:
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(56, 189, 248, 0.2)'
                      : '1px solid rgb(40 145 200 / 30%)',
                  boxShadow: liteMode
                    ? 'none'
                    : theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(56, 189, 248, 0.3)'
                      : '0 4px 12px rgb(40 145 200 / 25%)',
                },
              }}
            >
              {/* Checkbox */}
              <Box sx={{ minWidth: 'auto' }}>
                <Skeleton variant="circular" width={18} height={18} />
              </Box>

              {/* Quantity Input */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Skeleton variant="rectangular" width={52} height={34} sx={{ borderRadius: 1 }} />
              </Box>

              {/* Item Name with variant/quality */}
              <Box sx={{ minWidth: 0 }}>
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
              </Box>

              {/* Armor Value */}
              <Skeleton variant="text" width={35} height={16} />

              {/* Armor Control Button */}
              <Skeleton variant="rectangular" width={30} height={24} sx={{ borderRadius: 1 }} />
            </Box>
          ))}
        </Box>{' '}
        {/* Close List wrapper */}
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
      {/* Matches renderSummaryFooter structure */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateAreas: '"value status" "underpen targets"',
          gap: 2,
          padding: {
            xs: '22px 26px',
            sm: '24px 32px',
          },
          maxWidth: { xs: 460, sm: '100%' },
          margin: '0 auto',
        }}
      >
        {/* Value (gridArea: 'value') */}
        <Box sx={{ gridArea: 'value' }}>
          <Skeleton
            variant="text"
            width={80}
            height={12}
            sx={{
              display: 'block',
              letterSpacing: '0.07em',
              fontSize: '0.75rem',
              mb: 1,
            }}
          />
          <Skeleton
            variant="text"
            width={100}
            height={28}
            sx={{
              fontWeight: 400,
              mb: 0.5,
              letterSpacing: '0.0075em',
            }}
          />
        </Box>

        {/* Status (gridArea: 'status') */}
        <Box sx={{ gridArea: 'status' }}>
          <Skeleton
            variant="text"
            width={60}
            height={12}
            sx={{
              display: 'block',
              letterSpacing: '0.07em',
              fontSize: '0.75rem',
              mb: 1,
              ml: 'auto',
              textAlign: 'right',
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1,
              mb: 0.5,
            }}
          >
            {/* Status Icon - CheckCircleIcon skeleton */}
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '2px solid rgba(34, 197, 94, 0.2)',
              }}
            />
            <Skeleton
              variant="text"
              width={80}
              height={28}
              sx={{
                fontWeight: 600,
                letterSpacing: '0.0075em',
              }}
            />
          </Box>
        </Box>

        {/* Underpenetration Info (gridArea: 'underpen') */}
        <Box sx={{ gridArea: 'underpen' }}>
          <Skeleton
            variant="text"
            width={180}
            height={16}
            sx={{
              opacity: 0.8,
              letterSpacing: '0.025em',
            }}
          />
        </Box>

        {/* Target Ranges (gridArea: 'targets') */}
        <Box sx={{ gridArea: 'targets' }}>
          <Skeleton
            variant="text"
            width={140}
            height={16}
            sx={{
              opacity: 0.8,
              letterSpacing: '0.025em',
              ml: 'auto',
              textAlign: 'right',
            }}
          />
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
              {renderAccordionSection('Group Buffs', 5)}
              {renderAccordionSection('Gear & Enchantments', 3)}
              {renderAccordionSection('Passives & Skills', 2)}
              {renderAccordionSection('Champion Points', 3)}
            </Box>

            {/* Critical Tab Content (similar structure) */}
            <Box>
              {renderAccordionSection('Group Buffs', 5)}
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
