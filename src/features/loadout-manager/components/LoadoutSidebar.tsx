/**
 * Loadout Sidebar Component
 * Left sidebar (30% width) with loadout slots list
 * Features header with "SETUPS" title and count, metallic border effect
 */

import { Box, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import type { LoadoutSetup } from '../types/loadout.types';
import { getSetupTags } from '../utils/setupDisplay';

import { LoadoutSlot } from './LoadoutSlot';
import { metallicSidebarEnhanced } from './styles/textureStyles';

interface LoadoutSidebarProps {
  setups: LoadoutSetup[];
  selectedIndex: number | null;
  filterText: string;
  onSelectSetup: (index: number) => void;
  onCopySetup: (index: number) => void;
  onDuplicateSetup: (index: number) => void;
  onDeleteSetup: (index: number) => void;
}

export const LoadoutSidebar: React.FC<LoadoutSidebarProps> = ({
  setups,
  selectedIndex,
  filterText,
  onSelectSetup,
  onCopySetup,
  onDuplicateSetup,
  onDeleteSetup,
}) => {
  // Filter setups based on search text
  const filteredSetups = useMemo(() => {
    const normalizedFilter = filterText.trim().toLowerCase();
    if (!normalizedFilter) return setups;

    return setups.filter((setup) => {
      const tags = getSetupTags(setup)
        .map((tag) => tag.label.toLowerCase())
        .join(' ');
      const haystack = `${setup.name.toLowerCase()} ${tags}`;
      return haystack.includes(normalizedFilter);
    });
  }, [setups, filterText]);

  return (
    <Box
      sx={{
        ...metallicSidebarEnhanced,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.875rem',
            letterSpacing: 1.5,
            color: '#00d9ff',
            textTransform: 'uppercase',
          }}
        >
          Setups
        </Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#7a8599',
            fontWeight: 500,
          }}
        >
          {filteredSetups.length}/{setups.length}
        </Typography>
      </Box>

      {/* Loadout slots list */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 217, 255, 0.25)',
            borderRadius: '3px',
            '&:hover': {
              background: 'rgba(0, 217, 255, 0.4)',
            },
          },
        }}
      >
        {filteredSetups.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              px: 2,
              color: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
              No matching setups
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>
              Adjust filters or create a new loadout
            </Typography>
          </Box>
        ) : (
          filteredSetups.map((setup) => {
            // Find original index for callbacks
            const originalIndex = setups.indexOf(setup);
            return (
              <LoadoutSlot
                key={`${setup.name}-${originalIndex}`}
                setup={setup}
                index={originalIndex}
                selected={selectedIndex === originalIndex}
                onSelect={onSelectSetup}
                onCopy={onCopySetup}
                onDuplicate={onDuplicateSetup}
                onDelete={onDeleteSetup}
              />
            );
          })
        )}
      </Box>
    </Box>
  );
};
