import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import HealingIcon from '@mui/icons-material/Healing';
import ShieldIcon from '@mui/icons-material/Shield';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import StarIcon from '@mui/icons-material/Star';
import { Box, Typography, useTheme, IconButton, Dialog, DialogContent } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import React from 'react';

import { useRoleColors } from '../hooks/useRoleColors';
import { type PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import { ArmorType, WeaponType, type PlayerGear } from '../types/playerDetails';
import {
  TRAIT_NAMES,
  ENCHANTMENT_NAMES,
  QUALITY_COLORS,
  getTraitColor,
  getEnchantmentColor,
} from '../utils/gearMappings';

import { DataGrid } from './DataGrid';
import { GearIcon } from './GearIcon';

interface GearDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  currentPlayerId: string | number;
  players: PlayerDetailsWithRole[];
  onPlayerChange: (playerId: string | number) => void;
}

// Helper function to get slot name from slot number
const getSlotName = (slot: number): string => {
  const slotNames: Record<number, string> = {
    0: 'Head',
    1: 'Chest',
    2: 'Shoulders',
    3: 'Waist',
    4: 'Hands',
    5: 'Legs',
    6: 'Feet',
    7: 'Neck',
    8: 'Ring 1',
    9: 'Ring 2',
    10: 'Main Hand',
    11: 'Off Hand',
    12: 'Backup Main',
    13: 'Backup Off',
  };
  return slotNames[slot] || `Slot ${slot}`;
};

// Helper function to get slot icon
const getSlotIcon = (slot: number): string => {
  const weaponSlots = [10, 11, 12, 13];
  const armorSlots = [0, 1, 2, 3, 4, 5, 6];
  const jewelrySlots = [7, 8, 9];

  if (weaponSlots.includes(slot)) return '⚔️';
  if (armorSlots.includes(slot)) return '🛡️';
  if (jewelrySlots.includes(slot)) return '💍';
  return '❓';
};

export const GearDetailsPanel: React.FC<GearDetailsPanelProps> = ({
  open,
  onClose,
  currentPlayerId,
  players,
  onPlayerChange,
}) => {
  const theme = useTheme();
  const roleColors = useRoleColors();

  // Animation state
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [transitionDirection, setTransitionDirection] = React.useState<'left' | 'right'>('right');
  const [displayedPlayerId, setDisplayedPlayerId] = React.useState(currentPlayerId);
  const [fadeStage, setFadeStage] = React.useState<'in' | 'out' | 'none'>('none');

  // Find current player data for display
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const displayedPlayer = players.find((p) => p.id === displayedPlayerId) || currentPlayer;

  // Get sorted players list for navigation
  const sortedPlayers = React.useMemo(() => {
    return [...players].sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  // Find current player index
  const currentPlayerIndex = React.useMemo(() => {
    return sortedPlayers.findIndex((p) => p.id === currentPlayerId);
  }, [sortedPlayers, currentPlayerId]);

  // Player navigation functions with fancy fade transition
  const goToPreviousPlayer = React.useCallback(() => {
    if (sortedPlayers.length <= 1) return;
    const prevIndex = currentPlayerIndex > 0 ? currentPlayerIndex - 1 : sortedPlayers.length - 1;
    setTransitionDirection('right');
    setFadeStage('out');
    setIsTransitioning(true);

    setTimeout(() => {
      setDisplayedPlayerId(sortedPlayers[prevIndex].id);
      setFadeStage('in');

      setTimeout(() => {
        onPlayerChange(sortedPlayers[prevIndex].id);
        setFadeStage('none');
        setIsTransitioning(false);
      }, 300);
    }, 300);
  }, [sortedPlayers, currentPlayerIndex, onPlayerChange]);

  const goToNextPlayer = React.useCallback(() => {
    if (sortedPlayers.length <= 1) return;
    const nextIndex = currentPlayerIndex < sortedPlayers.length - 1 ? currentPlayerIndex + 1 : 0;
    setTransitionDirection('left');
    setFadeStage('out');
    setIsTransitioning(true);

    setTimeout(() => {
      setDisplayedPlayerId(sortedPlayers[nextIndex].id);
      setFadeStage('in');

      setTimeout(() => {
        onPlayerChange(sortedPlayers[nextIndex].id);
        setFadeStage('none');
        setIsTransitioning(false);
      }, 300);
    }, 300);
  }, [sortedPlayers, currentPlayerIndex, onPlayerChange]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!open || sortedPlayers.length <= 1) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft') {
        goToPreviousPlayer();
      } else if (event.key === 'ArrowRight') {
        goToNextPlayer();
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, sortedPlayers.length, goToPreviousPlayer, goToNextPlayer, onClose]);

  // Sort rows by logical slot order similar to the screenshot
  const slotOrderNums = React.useMemo(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], []);

  // DataGrid columns inspired by the reference screenshot (with Name+Set combined)
  const columns = React.useMemo<ColumnDef<Record<string, unknown>>[]>(
    () => [
      {
        id: 'cp',
        header: 'CP',
        accessorKey: 'championPoints',
        size: 55,
        cell: (info: any) => {
          const cp = info.getValue() as number;
          const color = cp >= 160 ? '#4caf50' : cp >= 150 ? '#ff9800' : '#f44336';
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.2,
                px: 0.1,
                py: 0.5,
                minWidth: 'auto',
                maxWidth: 'none',
              }}
            >
              <StarIcon
                sx={{
                  fontSize: '0.7rem',
                  color: roleColors.isDarkMode ? 'rgb(175 149 76)' : 'rgb(253 245 212)',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {cp || '-'}
              </Typography>
            </Box>
          );
        },
      },
      {
        id: 'type',
        header: 'Type',
        accessorFn: (row: Record<string, unknown>) => {
          const getTypeLabel = (t: number): string => {
            switch (t) {
              case ArmorType.LIGHT:
                return 'Light';
              case ArmorType.MEDIUM:
                return 'Medium';
              case ArmorType.HEAVY:
                return 'Heavy';
              case ArmorType.JEWELRY:
                return 'Jewelry';
              case WeaponType.AXE:
                return 'Axe';
              case WeaponType.MACE:
                return 'Mace';
              case WeaponType.SWORD:
                return 'Sword';
              case WeaponType.TWO_HANDED_SWORD:
                return '2H Sword';
              case WeaponType.TWO_HANDED_AXE:
                return '2H Axe';
              case WeaponType.MAUL:
                return 'Maul';
              case WeaponType.DAGGER:
                return 'Dagger';
              case WeaponType.INFERNO_STAFF:
                return 'Inferno Staff';
              case WeaponType.FROST_STAFF:
                return 'Frost Staff';
              case WeaponType.LIGHTNING_STAFF:
                return 'Lightning Staff';
              case WeaponType.RESO_STAFF:
                return 'Resto Staff';
              case WeaponType.SHIELD:
                return 'Shield';
              default:
                return '—';
            }
          };
          return getTypeLabel((row as unknown as PlayerGear).type);
        },
        size: 80,
        cell: (info: any) => (
          <Typography
            variant="caption"
            sx={{
              color: 'text.primary',
              fontWeight: roleColors.isDarkMode ? 200 : 300,
              fontSize: '0.7rem',
              px: 0.1,
              py: 0.5,
              minWidth: 'auto',
              maxWidth: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {info.getValue() as string}
          </Typography>
        ),
      },
      {
        id: 'slot',
        header: 'Slot',
        accessorFn: (row: Record<string, unknown>) =>
          getSlotName((row as unknown as PlayerGear).slot),
        size: 100,
        cell: (info: any) => {
          const piece = info.row.original as PlayerGear;
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.1,
                py: 0.5,
                minWidth: 'auto',
                maxWidth: 'none',
              }}
            >
              <span style={{ fontSize: '0.8rem' }}>{getSlotIcon(piece.slot)}</span>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap',
                  fontWeight: roleColors.isDarkMode ? 300 : 300,
                }}
              >
                {info.getValue() as string}
              </Typography>
            </Box>
          );
        },
      },
      {
        id: 'item',
        header: 'Item',
        accessorFn: (row: Record<string, unknown>) => (row as unknown as PlayerGear).name || '',
        size: 200,
        cell: (info: any) => {
          const piece = info.row.original as PlayerGear;
          const getQualityKey = (
            q: number,
          ): 'normal' | 'fine' | 'superior' | 'epic' | 'legendary' | 'mythic' => {
            switch (q) {
              case 6:
                return 'mythic';
              case 5:
                return 'legendary';
              case 4:
                return 'epic';
              case 3:
                return 'superior';
              case 2:
                return 'fine';
              default:
                return 'normal';
            }
          };

          const getQualityClass = (quality: number): string => {
            switch (quality) {
              case 0:
                return 'gear-quality-trait';
              case 1:
                return 'gear-quality-normal';
              case 2:
                return 'gear-quality-fine';
              case 3:
                return 'gear-quality-superior';
              case 4:
                return 'gear-quality-epic';
              case 5:
                return 'gear-quality-legendary';
              case 6:
                return 'gear-quality-mythic';
              default:
                return 'gear-quality-normal';
            }
          };

          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 'auto',
                maxWidth: 'none',
                px: 0.1,
                py: 0.5,
              }}
            >
              <Box className={getQualityClass(piece.quality)}>
                <GearIcon
                  gear={piece}
                  size={18}
                  quality={getQualityKey(piece.quality)}
                  rounded
                  useDesaturatedColors
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: QUALITY_COLORS[piece.quality],
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {piece.name || 'Unknown'}
                </Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        id: 'enchant',
        header: 'Enchant',
        accessorFn: (row: Record<string, unknown>) =>
          ENCHANTMENT_NAMES[(row as unknown as PlayerGear).enchantType] || '',
        size: 130,
        cell: (info: any) => (
          <Typography
            variant="caption"
            sx={{
              fontWeight: roleColors.isDarkMode ? 100 : 300,
              color: getEnchantmentColor(
                (info.row.original as PlayerGear).enchantType,
                (info.row.original as PlayerGear).enchantQuality,
              ),
              fontSize: '0.7rem',
              px: 0.2,
              py: 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            {(info.getValue() as string) || '—'}
          </Typography>
        ),
      },
      {
        id: 'trait',
        header: 'Trait',
        accessorFn: (row: Record<string, unknown>) =>
          TRAIT_NAMES[(row as unknown as PlayerGear).trait] || '',
        size: 90,
        cell: (info: any) => (
          <Typography
            variant="caption"
            sx={{
              fontWeight: roleColors.isDarkMode ? 100 : 300,
              color: getTraitColor((info.row.original as PlayerGear).trait),
              fontSize: '0.7rem',
              px: 0.2,
              py: 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            {(info.getValue() as string) || '—'}
          </Typography>
        ),
      },
    ],
    [roleColors.isDarkMode],
  );

  if (!currentPlayer) {
    return null;
  }

  const gearPieces = displayedPlayer?.combatantInfo?.gear || [];
  const playerName = displayedPlayer?.name || currentPlayer?.name || 'Unknown Player';

  // Filter out empty slots (id: 0) and group by slot
  const validGearPieces = gearPieces.filter((piece) => piece.id !== 0);

  const rows = [...validGearPieces].sort(
    (a, b) => slotOrderNums.indexOf(a.slot) - slotOrderNums.indexOf(b.slot),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth={false}
      scroll="body"
      className={`gear-details-table ${roleColors.isDarkMode ? 'dark-mode' : ''}`}
      sx={{
        '& .MuiPaper-root': {
          backgroundColor: 'transparent !important',
          backgroundImage: 'none !important',
          background: roleColors.isDarkMode
            ? 'linear-gradient(135deg, rgb(23 8 86 / 45%) 0%, rgb(27 18 58 / 20%) 50%, rgb(52 23 107 / 9%) 100%) !important'
            : 'linear-gradient(135deg, rgb(202 231 255 / 30%) 0%, rgb(211 217 255 / 38%) 50%, rgb(208 245 255 / 28%) 100%) !important',
          borderRadius: '24px',
          overflow: 'hidden',
          maxHeight: { xs: '90vh', sm: '85vh' },
          width: { xs: 'calc(100vw - 16px)', sm: 'min(900px, calc(100vw - 32px))' },
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow:
            '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            transition: 'left 0.5s ease',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
            borderRadius: '24px',
            pointerEvents: 'none',
          },
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow:
              '0 12px 40px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)',
          },
          '&:hover::before': {
            left: '100%',
          },
        },
      }}
    >
      <DialogContent sx={{ px: 0, py: 0, overflow: 'visible' }}>
        {/* Gear Pieces List with symmetric padding and no internal scrolling */}
        <Box sx={{ px: 0, py: 0.5, minHeight: '300px', position: 'relative' }}>
          {/* Header with player swapper and close button */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: { xs: 'center', sm: 'space-between' },
              alignItems: 'center',
              mb: { xs: 1, sm: 1.5 },
              mx: { xs: 0.5, sm: 1.5 },
              pt: { xs: 0.5, sm: 1 },
              position: 'relative',
            }}
          >
            {/* Player swapper */}
            {sortedPlayers.length > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.5, sm: 1 },
                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.04) 100%)',
                  borderRadius: { xs: '16px', sm: '20px' },
                  padding: { xs: '3px 6px', sm: '4px 8px' },
                  border:
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(255,255,255,0.15)'
                      : '1px solid rgba(0,0,0,0.1)',
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                      : '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: 'translateY(0) scale(1)',
                  '&:hover': {
                    transform: 'translateY(-1px) scale(1.01)',
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                        : '0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9)',
                  },
                  '&:active': {
                    transform: 'translateY(0px) scale(0.99)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  },
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {},
                }}
              >
                {/* Previous button */}
                <IconButton
                  onClick={goToPreviousPlayer}
                  disabled={sortedPlayers.length <= 1 || isTransitioning}
                  sx={{
                    p: { xs: 0.5, sm: 0.4 },
                    backgroundColor: 'transparent',
                    color: 'text.primary',
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    minWidth: { xs: '32px', sm: 'auto' },
                    minHeight: { xs: '32px', sm: 'auto' },
                    transform: isTransitioning
                      ? 'scale(0.85) rotate(-10deg)'
                      : 'scale(1) rotate(0deg)',
                    opacity: isTransitioning ? 0.4 : 1,
                    '&:hover': {
                      backgroundColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'rgba(0, 0, 0, 0.1)',
                      transform: isTransitioning
                        ? 'scale(0.85) rotate(-10deg)'
                        : 'scale(1.1) rotate(5deg)',
                    },
                    '&:active': {
                      backgroundColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.25)'
                          : 'rgba(0, 0, 0, 0.15)',
                      transform: 'scale(0.92) rotate(-2deg)',
                    },
                    '&:disabled': {
                      opacity: 0.3,
                      color: 'text.disabled',
                      cursor: 'not-allowed',
                      transform: 'scale(0.9) rotate(0deg)',
                    },
                  }}
                >
                  <ChevronLeftIcon sx={{ fontSize: '1.2rem' }} />
                </IconButton>

                {/* Player info */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 0.6, sm: 0.8 },
                    minWidth: 0,
                    px: { xs: 0.3, sm: 0.5 },
                  }}
                >
                  {/* Role icon */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: { xs: '20px', sm: '24px' },
                      height: { xs: '20px', sm: '24px' },
                      borderRadius: '50%',
                      background:
                        currentPlayer.role === 'tank'
                          ? theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #4fc3f7, #29b6f6)'
                            : 'linear-gradient(135deg, #1976d2, #1565c0)'
                          : currentPlayer.role === 'healer'
                            ? theme.palette.mode === 'dark'
                              ? 'linear-gradient(135deg, #81c784, #66bb6a)'
                              : 'linear-gradient(135deg, #388e3c, #2e7d32)'
                            : theme.palette.mode === 'dark'
                              ? 'linear-gradient(135deg, #ff8a65, #ff7043)'
                              : 'linear-gradient(135deg, #d84315, #bf360c)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.05)' },
                        '100%': { transform: 'scale(1)' },
                      },
                    }}
                  >
                    {currentPlayer.role === 'tank' && (
                      <ShieldIcon sx={{ fontSize: { xs: '12px', sm: '14px' }, color: 'white' }} />
                    )}
                    {currentPlayer.role === 'healer' && (
                      <HealingIcon sx={{ fontSize: { xs: '12px', sm: '14px' }, color: 'white' }} />
                    )}
                    {currentPlayer.role === 'dps' && (
                      <SportsMmaIcon
                        sx={{ fontSize: { xs: '12px', sm: '14px' }, color: 'white' }}
                      />
                    )}
                  </Box>

                  {/* Player name and counter - single line on desktop */}
                  <Box
                    sx={{
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: { xs: 0, sm: 0.5 },
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        fontSize: { xs: '0.75rem', sm: '0.85rem' },
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                        textShadow:
                          theme.palette.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                      }}
                    >
                      {playerName}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                        fontWeight: 400,
                        opacity: 0.8,
                        lineHeight: 1,
                        display: { xs: 'block', sm: 'inline' },
                      }}
                    >
                      ({currentPlayerIndex + 1}/{sortedPlayers.length})
                    </Typography>
                  </Box>
                </Box>

                {/* Next button */}
                <IconButton
                  onClick={goToNextPlayer}
                  disabled={sortedPlayers.length <= 1 || isTransitioning}
                  sx={{
                    p: { xs: 0.5, sm: 0.4 },
                    backgroundColor: 'transparent',
                    color: 'text.primary',
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    minWidth: { xs: '32px', sm: 'auto' },
                    minHeight: { xs: '32px', sm: 'auto' },
                    transform: isTransitioning
                      ? 'scale(0.85) rotate(10deg)'
                      : 'scale(1) rotate(0deg)',
                    opacity: isTransitioning ? 0.4 : 1,
                    '&:hover': {
                      backgroundColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'rgba(0, 0, 0, 0.1)',
                      transform: isTransitioning
                        ? 'scale(0.85) rotate(10deg)'
                        : 'scale(1.1) rotate(-5deg)',
                    },
                    '&:active': {
                      backgroundColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.25)'
                          : 'rgba(0, 0, 0, 0.15)',
                      transform: 'scale(0.92) rotate(2deg)',
                    },
                    '&:disabled': {
                      opacity: 0.3,
                      color: 'text.disabled',
                      cursor: 'not-allowed',
                      transform: 'scale(0.9) rotate(0deg)',
                    },
                  }}
                >
                  <ChevronRightIcon sx={{ fontSize: '1.2rem' }} />
                </IconButton>
              </Box>
            )}

            {/* Enhanced close button */}
            <IconButton
              onClick={onClose}
              sx={{
                p: { xs: 0.7, sm: 0.6 },
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(158, 158, 158, 0.2)'
                    : 'rgba(66, 66, 66, 0.1)',
                color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#424242',
                border:
                  theme.palette.mode === 'dark'
                    ? '1px solid rgba(224, 224, 224, 0.3)'
                    : '1px solid rgba(66, 66, 66, 0.2)',
                transition: 'all 0.2s ease',
                minWidth: { xs: '32px', sm: 'auto' },
                minHeight: { xs: '32px', sm: 'auto' },
                position: { xs: 'absolute', sm: 'relative' },
                top: { xs: '8px', sm: 'auto' },
                right: { xs: '8px', sm: 'auto' },
                borderRadius: '12px',
                '&:hover': {
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(244, 67, 54, 0.25)'
                      : 'rgba(244, 67, 54, 0.15)',
                  color: theme.palette.mode === 'dark' ? '#ff8a80' : '#d32f2f',
                  border:
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(244, 67, 54, 0.4)'
                      : '1px solid rgba(244, 67, 54, 0.3)',
                  transform: 'scale(1.05)',
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 2px 8px rgba(244, 67, 54, 0.3)'
                      : '0 2px 8px rgba(244, 67, 54, 0.2)',
                },
                '&:active': {
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(244, 67, 54, 0.35)'
                      : 'rgba(244, 67, 54, 0.25)',
                  color: theme.palette.mode === 'dark' ? '#ffab91' : '#b71c1c',
                  transform: 'scale(0.95)',
                },
              }}
            >
              <CloseIcon sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />
            </IconButton>
          </Box>
          {rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
              <Typography variant="h6">No gear pieces found</Typography>
              <Typography variant="body2">
                No detailed gear information available for this set.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ position: 'relative' }}>
              {/* Enhanced mobile scroll indicator */}
              <Box
                sx={{
                  display: { xs: 'flex', sm: 'none' },
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 1,
                  px: { xs: 2, sm: 1.5 },
                  mb: 1.5,
                  mx: 'auto',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: theme.palette.mode === 'dark' ? '#a5b4fc' : '#6366f1',
                    textAlign: 'center',
                    letterSpacing: '0.3px',
                  }}
                >
                  Swipe to see all columns
                </Typography>
              </Box>
              <Box
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2,
                  minHeight: '400px',
                }}
              >
                {/* Fancy fade transition overlay */}
                {isTransitioning && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                      zIndex: 10,
                      borderRadius: 2,
                      willChange: 'opacity',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'translateZ(0)',
                      opacity: fadeStage === 'out' ? 0 : 1,
                      transition:
                        'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease, border 0.4s ease, box-shadow 0.4s ease',
                    }}
                  >
                    {/* Elegant fade transition indicator */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    ></Box>
                  </Box>
                )}
                <Box
                  sx={{
                    transform: 'translateX(0) translateZ(0) scale(1)',
                    opacity: fadeStage === 'out' ? 0 : 1,
                    transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: fadeStage !== 'none' ? 'opacity' : 'auto',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    filter: 'blur(0px)',
                    WebkitFilter: 'blur(0px)',
                  }}
                >
                  <DataGrid
                    key={`gear-grid-${currentPlayerId}`}
                    data={rows as unknown as Record<string, unknown>[]}
                    columns={columns}
                    title={undefined}
                    autoHeight={true}
                    paperSx={{
                      borderRadius: 2,
                      '& .MuiTableContainer-root': {
                        overflowX: { xs: 'auto', sm: 'hidden' },
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'pan-x pinch-zoom',
                        width: '100%',
                        '&::-webkit-scrollbar': {
                          height: { xs: '6px', sm: '6px' },
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: { xs: 'rgba(0,0,0,0.3)', sm: 'rgba(0,0,0,0.3)' },
                          borderRadius: '3px',
                          minHeight: '20px',
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: { xs: 'rgba(0,0,0,0.1)', sm: 'rgba(0,0,0,0.1)' },
                        },
                      },
                      '& .MuiTable-root': {
                        tableLayout: { xs: 'auto', sm: 'fixed' },
                        minWidth: { xs: '750px', sm: '100%' },
                        width: { xs: '750px', sm: '100%' },
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                      },
                      '& .MuiTableCell-root': {
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        overflow: { xs: 'visible', sm: 'visible' },
                        textOverflow: { xs: 'clip', sm: 'ellipsis' },
                        padding: {
                          xs: theme.spacing(0.6, 0.3),
                          sm: theme.spacing(0.4, 0.6),
                        },
                        fontSize: { xs: '0.6rem', sm: '0.7rem' },
                        lineHeight: { xs: 1.2, sm: 1.4 },
                        borderBottom: {
                          xs: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                          sm: undefined,
                        },
                      },
                      '& .MuiTableHead-root .MuiTableCell-root': {
                        fontSize: { xs: '0.65rem', sm: '0.875rem' },
                        fontWeight: { xs: 600, sm: 600 },
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        textTransform: 'uppercase',
                        letterSpacing: { xs: '0.5px', sm: '0.8px' },
                      },
                      '& .MuiTableRow-root:hover': {
                        '@media (hover: hover)': {
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.03)'
                              : 'rgba(0,0,0,0.02)',
                        },
                      },
                      '& .MuiTableRow-root:active': {
                        '@media (hover: hover)': {
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.04)',
                        },
                      },
                    }}
                    initialPageSize={rows.length}
                    pageSizeOptions={[12]}
                    enableSorting
                    enableFiltering={false}
                    enablePagination={false}
                    showPageSizeSelector={false}
                    emptyMessage="No gear"
                  />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
