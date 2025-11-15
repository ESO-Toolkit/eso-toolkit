/**
 * Character Selector Component (compact pill layout)
 * Displays and selects characters imported from the addon
 */

import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { setCurrentCharacter } from '../store/loadoutSlice';
import type { ClassSkillLine } from '../types/loadout.types';

const getRoleChipColor = (role?: string): 'default' | 'primary' | 'secondary' | 'success' | 'info' => {
  switch (role) {
    case 'Tank':
      return 'primary';
    case 'Healer':
      return 'success';
    case 'Support':
      return 'info';
    default:
      return 'secondary';
  }
};

export const CharacterSelector: React.FC = (): React.ReactElement => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const currentCharacter = useSelector((state: RootState) => state.loadout.currentCharacter);
  const characters = useSelector((state: RootState) => state.loadout.characters);

  const scrollRef = useRef<HTMLDivElement>(null);

  const hasCharacters = characters.length > 0;
  const selectedCharacter = characters.find((char) => char.id === currentCharacter) ?? null;

  const scrollBy = (direction: number): void => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction * 160, behavior: 'smooth' });
  };

  const formatSkillLines = (skillLines?: ClassSkillLine[]): string => {
    if (!skillLines || skillLines.length === 0) return 'No skill lines';
    return skillLines.map((line) => line.split('_')[1]).join(', ');
  };

  const emptyPlaceholder = useMemo(
    () => (
      <Stack spacing={0.5} alignItems="flex-start">
        <Typography variant="body2" color="text.secondary">
          Import your Wizard&apos;s Wardrobe data to see characters here.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Use the import wizard to pull characters from the addon save data.
        </Typography>
      </Stack>
    ),
    [],
  );

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Tooltip title="Scroll left" placement="top" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => scrollBy(-1)}
              disabled={!hasCharacters}
              sx={{ visibility: hasCharacters ? 'visible' : 'hidden' }}
            >
              <ChevronLeft fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Box
          ref={scrollRef}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            overflowX: 'auto',
            px: 0.5,
            py: 0.5,
            flex: 1,
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.4 : 0.6),
          }}
        >
          {hasCharacters ? (
            characters.map((char) => {
              const isSelected = char.id === currentCharacter;
              return (
                <Chip
                  key={char.id}
                  label={char.name}
                  color={isSelected ? 'primary' : getRoleChipColor(char.role)}
                  variant={isSelected ? 'filled' : 'outlined'}
                  onClick={() => dispatch(setCurrentCharacter(char.id))}
                  sx={{
                    flexShrink: 0,
                    fontWeight: 600,
                    letterSpacing: 0.25,
                    px: 1,
                    py: 0.25,
                  }}
                />
              );
            })
          ) : (
            emptyPlaceholder
          )}
        </Box>

        <Tooltip title="Scroll right" placement="top" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => scrollBy(1)}
              disabled={!hasCharacters}
              sx={{ visibility: hasCharacters ? 'visible' : 'hidden' }}
            >
              <ChevronRight fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {selectedCharacter && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.75, display: 'block' }}
        >
          {(selectedCharacter.role ?? 'Unknown role')} · {formatSkillLines(selectedCharacter.skillLines)}
        </Typography>
      )}
    </Box>
  );
};
