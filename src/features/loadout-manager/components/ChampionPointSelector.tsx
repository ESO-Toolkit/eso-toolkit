/**
 * Champion Points Selector Component
 * Allows selection and management of champion points for setups
 */

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Typography,
  Stack,
  Chip,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
} from '@mui/material';
import Autocomplete, { AutocompleteInputChangeReason } from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useMemo, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { useLogger } from '@/hooks/useLogger';
import {
  CHAMPION_POINT_ABILITIES,
  ChampionPointAbilityId,
  ChampionPointTree,
  type ChampionPointAbilityMetadata,
} from '@/types/champion-points';

import {
  getChampionPointById,
  searchChampionPointsByTree,
  getChampionPointStats,
  type ChampionPointData,
} from '../data/championPointData';
import { updateChampionPoints } from '../store/loadoutSlice';
import { ChampionPointsConfig } from '../types/loadout.types';

interface ChampionPointSelectorProps {
  championPoints: ChampionPointsConfig;
  trialId: string;
  pageIndex: number;
  setupIndex: number;
}

// CP slot indices (1-12)
const CP_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Minimum characters required to trigger search
const MIN_SEARCH_LENGTH = 2;
// Maximum number of search results to display
const MAX_SEARCH_RESULTS = 100;

// Human-friendly CP tree names
const CP_TREES = {
  craft: 'Craft',
  warfare: 'Warfare',
  fitness: 'Fitness',
};

type TreeKey = keyof typeof CP_TREES;

interface TreeVisualStyle {
  cardBorder: string;
  cardBackground: string;
  slotBackgroundFilled: string;
  slotBorderFilled: string;
  slotBackgroundEmpty: string;
  slotBorderEmpty: string;
  chipColor: 'success' | 'info' | 'error';
  titleColor: string;
}

export const ChampionPointSelector: React.FC<ChampionPointSelectorProps> = ({
  championPoints,
  trialId,
  pageIndex,
  setupIndex,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const logger = useLogger('ChampionPointSelector');

  // Log CP statistics on mount (dev mode only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const stats = getChampionPointStats();
      logger.debug('Champion Points data loaded', stats);
    }
  }, [logger]);

  const handleCPChange = (slotIndex: number, cpId: number): void => {
    const updatedCP = {
      ...championPoints,
      [slotIndex]: cpId,
    };
    dispatch(updateChampionPoints({ trialId, pageIndex, setupIndex, cp: updatedCP }));
  };

  const handleCPRemove = (slotIndex: number): void => {
    const updatedCP = { ...championPoints };
    delete updatedCP[slotIndex];
    dispatch(updateChampionPoints({ trialId, pageIndex, setupIndex, cp: updatedCP }));
  };

  const slotsByTree = useMemo(
    () => ({
      craft: CP_SLOTS.slice(0, 4),
      warfare: CP_SLOTS.slice(4, 8),
      fitness: CP_SLOTS.slice(8, 12),
    }),
    [],
  );

  const treeVisuals = useMemo<Record<TreeKey, TreeVisualStyle>>(
    () => ({
      craft: {
        cardBorder: alpha(theme.palette.success.main, 0.35),
        cardBackground: alpha(theme.palette.success.main, 0.07),
        slotBackgroundFilled: alpha(theme.palette.success.main, 0.18),
        slotBorderFilled: alpha(theme.palette.success.main, 0.55),
        slotBackgroundEmpty: alpha(theme.palette.success.main, 0.08),
        slotBorderEmpty: alpha(theme.palette.success.main, 0.25),
        chipColor: 'success',
        titleColor: theme.palette.success.light,
      },
      warfare: {
        cardBorder: alpha(theme.palette.info.main, 0.35),
        cardBackground: alpha(theme.palette.info.main, 0.07),
        slotBackgroundFilled: alpha(theme.palette.info.main, 0.18),
        slotBorderFilled: alpha(theme.palette.info.main, 0.55),
        slotBackgroundEmpty: alpha(theme.palette.info.main, 0.08),
        slotBorderEmpty: alpha(theme.palette.info.main, 0.25),
        chipColor: 'info',
        titleColor: theme.palette.info.light,
      },
      fitness: {
        cardBorder: alpha(theme.palette.error.main, 0.35),
        cardBackground: alpha(theme.palette.error.main, 0.07),
        slotBackgroundFilled: alpha(theme.palette.error.main, 0.18),
        slotBorderFilled: alpha(theme.palette.error.main, 0.55),
        slotBackgroundEmpty: alpha(theme.palette.error.main, 0.08),
        slotBorderEmpty: alpha(theme.palette.error.main, 0.25),
        chipColor: 'error',
        titleColor: theme.palette.error.light,
      },
    }),
    [theme],
  );

  const resolveChampionPoint = (cpId?: number): ChampionPointAbilityMetadata | undefined => {
    if (!cpId) {
      return undefined;
    }

    const metadata = CHAMPION_POINT_ABILITIES[cpId as ChampionPointAbilityId];
    if (metadata) {
      return metadata;
    }

    return undefined;
  };

  const getSlotStatus = (slotIndex: number): 'empty' | 'filled' => {
    return championPoints[slotIndex] ? 'filled' : 'empty';
  };

  const getFilledCount = (): number => {
    return Object.values(championPoints).filter(Boolean).length;
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          Champion Points
        </Typography>
        <Chip
          label={`${getFilledCount()} / ${CP_SLOTS.length}`}
          size="small"
          color={getFilledCount() === CP_SLOTS.length ? 'success' : 'default'}
          sx={{ height: 20, fontSize: '0.7rem' }}
        />
      </Stack>

      <Stack spacing={1.5}>
        {Object.entries(slotsByTree).map(([treeKey, slots]) => {
          const typedKey = treeKey as TreeKey;
          // Map tree key to ChampionPointTree enum
          const treeEnum =
            treeKey === 'craft'
              ? ChampionPointTree.Craft
              : treeKey === 'warfare'
                ? ChampionPointTree.Warfare
                : ChampionPointTree.Fitness;

          return (
            <CPTree
              key={treeKey}
              treeName={CP_TREES[typedKey]}
              tree={treeEnum}
              slots={slots}
              championPoints={championPoints}
              getSlotStatus={getSlotStatus}
              resolveChampionPoint={resolveChampionPoint}
              visuals={treeVisuals[typedKey]}
              onCPChange={handleCPChange}
              onCPRemove={handleCPRemove}
            />
          );
        })}
      </Stack>
    </Stack>
  );
};

interface CPTreeProps {
  treeName: string;
  tree: ChampionPointTree;
  slots: number[];
  championPoints: ChampionPointsConfig;
  getSlotStatus: (slotIndex: number) => 'empty' | 'filled';
  resolveChampionPoint: (cpId?: number) => ChampionPointAbilityMetadata | undefined;
  visuals: TreeVisualStyle;
  onCPChange: (slotIndex: number, cpId: number) => void;
  onCPRemove: (slotIndex: number) => void;
}

const CPTree: React.FC<CPTreeProps> = ({
  treeName,
  tree,
  slots,
  championPoints,
  getSlotStatus,
  resolveChampionPoint,
  visuals,
  onCPChange,
  onCPRemove,
}) => {
  return (
    <Box
      sx={{
        borderLeft: `3px solid ${visuals.cardBorder}`,
        pl: 1.5,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: visuals.titleColor,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {treeName}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
        {slots.map((slotIndex) => {
          const status = getSlotStatus(slotIndex);
          const cpId = championPoints[slotIndex];
          const cpMetadata = resolveChampionPoint(cpId);
          const hasChampionPoint = Boolean(cpId);
          const isFilled = status === 'filled';

          return (
            <CPSlot
              key={slotIndex}
              slotIndex={slotIndex}
              treeName={treeName}
              tree={tree}
              cpId={cpId}
              cpMetadata={cpMetadata}
              hasChampionPoint={hasChampionPoint}
              _isFilled={isFilled}
              visuals={visuals}
              onCPChange={onCPChange}
              onCPRemove={onCPRemove}
            />
          );
        })}
      </Box>
    </Box>
  );
};

interface CPSlotProps {
  slotIndex: number;
  treeName: string;
  tree: ChampionPointTree;
  cpId?: number;
  cpMetadata?: ChampionPointAbilityMetadata;
  hasChampionPoint: boolean;
  _isFilled: boolean;
  visuals: TreeVisualStyle;
  onCPChange: (slotIndex: number, cpId: number) => void;
  onCPRemove: (slotIndex: number) => void;
}

const CPSlot: React.FC<CPSlotProps> = ({
  slotIndex,
  treeName,
  tree,
  cpId,
  cpMetadata,
  hasChampionPoint,
  _isFilled,
  visuals,
  onCPChange,
  onCPRemove,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<ChampionPointData[]>([]);

  // Find current CP info
  const currentCP = cpId !== undefined ? getChampionPointById(cpId) : undefined;

  // Handle CP selection
  const handleSelect = useCallback(
    (cp: ChampionPointData | null) => {
      if (!cp) {
        onCPRemove(slotIndex);
      } else {
        onCPChange(slotIndex, cp.id);
      }
      setIsSelecting(false);
      setInputValue('');
      setSearchResults([]);
    },
    [slotIndex, onCPChange, onCPRemove],
  );

  // Handle input change with search
  const handleInputChange = useCallback(
    (_event: React.SyntheticEvent, value: string, reason: AutocompleteInputChangeReason) => {
      setInputValue(value);

      if (reason === 'reset' || reason === 'clear') {
        setSearchResults([]);
        return;
      }

      // Only search if we have enough characters
      if (value.trim().length >= MIN_SEARCH_LENGTH) {
        const results = searchChampionPointsByTree(value, tree, MAX_SEARCH_RESULTS);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    },
    [tree],
  );

  const noOptionsText = useMemo(() => {
    if (inputValue.trim().length < MIN_SEARCH_LENGTH) {
      return `Enter at least ${MIN_SEARCH_LENGTH} characters to search`;
    }
    return `No ${treeName} champion points match your search`;
  }, [inputValue, treeName]);

  return (
    <Box>
      {cpMetadata ? (
        <Chip
          label={cpMetadata.name}
          size="small"
          color={visuals.chipColor}
          variant="outlined"
          onClick={() => setIsSelecting(true)}
          onDelete={(e: React.SyntheticEvent) => {
            e.stopPropagation();
            onCPRemove(slotIndex);
          }}
          deleteIcon={<CloseIcon sx={{ fontSize: 14 }} />}
          sx={{ height: 24, fontSize: '0.75rem' }}
        />
      ) : hasChampionPoint ? (
        <Tooltip title="Champion point ID not yet mapped in metadata">
          <Chip
            label={`Unknown CP ${cpId}`}
            size="small"
            color={visuals.chipColor}
            onClick={() => setIsSelecting(true)}
            sx={{ height: 24, fontSize: '0.75rem' }}
          />
        </Tooltip>
      ) : (
        <Chip
          label="+"
          size="small"
          variant="outlined"
          onClick={() => setIsSelecting(true)}
          sx={{
            height: 24,
            fontSize: '0.75rem',
            borderStyle: 'dashed',
            borderColor: visuals.slotBorderEmpty,
            color: 'text.disabled',
            '&:hover': { borderColor: visuals.slotBorderFilled, color: 'text.secondary' },
          }}
        />
      )}

      {/* Selection Dialog */}
      <Dialog
        open={isSelecting}
        onClose={() => {
          setIsSelecting(false);
          setInputValue('');
          setSearchResults([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Slot {slotIndex} - {treeName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Autocomplete
              options={searchResults}
              value={currentCP || null}
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onChange={(_event, cp) => handleSelect(cp)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={noOptionsText}
              autoHighlight
              clearOnBlur={false}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`Search ${treeName} champion points`}
                  placeholder={`Type at least ${MIN_SEARCH_LENGTH} characters...`}
                  autoFocus
                  fullWidth
                />
              )}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <Box component="li" key={key} {...optionProps}>
                    <Stack spacing={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.tree} • ID {option.id}
                        {!option.verified && ' • Unverified'}
                      </Typography>
                    </Stack>
                  </Box>
                );
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
