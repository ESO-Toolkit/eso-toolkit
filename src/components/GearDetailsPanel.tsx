import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import {
  Box,
  Chip,
  Typography,
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  alpha,
  Tooltip,
} from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import React from 'react';

import { useRoleColors } from '../hooks/useRoleColors';
import { ArmorType, WeaponType, type PlayerGear } from '../types/playerDetails';
import {
  TRAIT_NAMES,
  ENCHANTMENT_NAMES,
  QUALITY_NAMES,
  QUALITY_COLORS,
  getTraitColor,
  getEnchantmentColor,
} from '../utils/gearMappings';

import { DataGrid } from './DataGrid';
import { GearIcon } from './GearIcon';

interface GearDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  playerName: string;
  playerClass: string;
  gearPieces: PlayerGear[];
  championPoints?: number;
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
  playerName,
  playerClass,
  gearPieces,
  championPoints,
}) => {
  const theme = useTheme();
  const roleColors = useRoleColors();

  // Filter out empty slots (id: 0) and group by slot
  const validGearPieces = gearPieces.filter((piece) => piece.id !== 0);

  // Calculate average gear stats
  const avgCP =
    validGearPieces.length > 0
      ? Math.round(
          validGearPieces.reduce((sum, piece) => sum + (piece.championPoints || 0), 0) /
            validGearPieces.length,
        )
      : championPoints || 0;

  const qualityDistribution = validGearPieces.reduce(
    (acc, piece) => {
      const quality = piece.quality;
      acc[quality] = (acc[quality] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  // Helpers for the table view
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

  // Helper function to get quality CSS class
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

  // Sort rows by logical slot order similar to the screenshot
  const slotOrderNums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const rows = React.useMemo(
    () =>
      [...validGearPieces].sort(
        (a, b) => slotOrderNums.indexOf(a.slot) - slotOrderNums.indexOf(b.slot),
      ),
    [validGearPieces],
  );

  // DataGrid columns inspired by the reference screenshot (with Name+Set combined)
  const columns = React.useMemo<ColumnDef<Record<string, unknown>>[]>(
    () => [
      {
        id: 'cp',
        header: 'CP',
        accessorKey: 'championPoints',
        size: 60,
        cell: (info: any) => {
          const cp = info.getValue() as number;
          const color = cp >= 160 ? '#4caf50' : cp >= 150 ? '#ff9800' : '#f44336';
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.2,
                px: 0.2,
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
        accessorFn: (row: Record<string, unknown>) =>
          getTypeLabel((row as unknown as PlayerGear).type),
        size: 85,
        cell: (info: any) => (
          <Typography
            variant="caption"
            sx={{
              color: 'text.primary',
              fontWeight: roleColors.isDarkMode ? 200 : 300,
              fontSize: '0.7rem',
              px: 0.2,
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
        size: 110,
        cell: (info: any) => {
          const piece = info.row.original as PlayerGear;
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.2,
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
        size: 230,
        cell: (info: any) => {
          const piece = info.row.original as PlayerGear;
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 'auto',
                maxWidth: 'none',
                px: 0.2,
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
        id: 'trait',
        header: 'Trait',
        accessorFn: (row: Record<string, unknown>) =>
          TRAIT_NAMES[(row as unknown as PlayerGear).trait] || '',
        size: 80,
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
      {
        id: 'enchant',
        header: 'Enchant',
        accessorFn: (row: Record<string, unknown>) =>
          ENCHANTMENT_NAMES[(row as unknown as PlayerGear).enchantType] || '',
        size: 170,
        cell: (info: any) => {
          const piece = info.row.original as PlayerGear;
          const label = ENCHANTMENT_NAMES[piece.enchantType] || '—';
          const color = getEnchantmentColor(piece.enchantType, piece.enchantQuality || 1);
          return (
            <Typography
              variant="caption"
              sx={{
                color,
                fontWeight: 300,
                fontSize: '0.7rem',
                lineHeight: 1.1,
                px: 0.2,
                py: 0.5,
                whiteSpace: 'normal',
                display: 'block',
                maxWidth: '100%',
              }}
            >
              {label}
            </Typography>
          );
        },
      },
    ],
    [theme],
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
          maxHeight: '85vh',
          width: { xs: 'calc(100vw - 8px)', sm: 'min(900px, calc(100vw - 8px))' },
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
        <Box sx={{ px: 0, py: 0.5, minHeight: '300px' }}>
          {/* Close button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, mr: 1 }}>
            <IconButton
              onClick={onClose}
              sx={{
                p: 0.5,
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.08)',
                '&:hover': {
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.2)'
                      : 'rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              <CloseIcon fontSize="small" />
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
            <Box>
              <DataGrid
                key={`gear-grid-${Date.now()}`}
                data={rows as unknown as Record<string, unknown>[]}
                columns={columns}
                title={undefined}
                autoHeight={true}
                paperSx={{
                  borderRadius: 2,
                  '& .MuiTableContainer-root': {
                    overflowX: { xs: 'auto', sm: 'hidden' },
                  },
                  '& .MuiTable-root': {
                    tableLayout: { xs: 'auto', sm: 'fixed' },
                    minWidth: { xs: 'max-content', sm: '100%' },
                  },
                  '& .MuiTableCell-root': {
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    padding: { xs: theme.spacing(0.8, 0.4), sm: theme.spacing(0.4, 0.6) },
                    fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  },
                  '& .MuiTableHead-root .MuiTableCell-root': {
                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                    fontWeight: { xs: 500, sm: 600 },
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
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
