import { Box, Typography, Alert } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { PenetrationSourceWithActiveState } from '../../../utils/PenetrationUtils';

import { PlayerPenetrationDetails } from './PlayerPenetrationDetails';

interface PenetrationDataPoint {
  timestamp: number;
  penetration: number;
  relativeTime: number; // Time since fight start in seconds
}

interface PlayerPenetrationData {
  playerId: string;
  playerName: string;
  dataPoints: PenetrationDataPoint[];
  max: number;
  effective: number;
  timeAtCapPercentage: number;
  penetrationSources: PenetrationSourceWithActiveState[];
  playerBasePenetration: number;
}

interface PenetrationPanelViewProps {
  players: PlayerDetailsWithRole[];
  selectedTargetIds: Set<number>;
  fight: FightFragment;
  expandedPlayers: Record<string, boolean>;
  onPlayerExpandChange: (
    playerId: string
  ) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
  penetrationData: Map<string, PlayerPenetrationData>;
  isLoading: boolean;
}

/**
 * Dumb component that only handles rendering the penetration panel UI
 */
export const PenetrationPanelView: React.FC<PenetrationPanelViewProps> = ({
  players,
  selectedTargetIds,
  fight,
  expandedPlayers,
  onPlayerExpandChange,
  penetrationData,
  isLoading,
}) => {
  // Show info when no targets are available
  if (selectedTargetIds.size === 0) {
    return (
      <Box sx={{ px: { xs: 0, sm: 2 }, py: 2 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            fontFamily: 'Space Grotesk, sans-serif',
            textShadow:
              '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
          }}
        >
          Penetration Analysis
        </Typography>

        <Alert severity="info" sx={{ mt: 2 }}>
          No targets are available for penetration analysis. This may occur if the fight has no boss
          enemies or if the report data is still loading.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 0, sm: 2 }, py: 2 }}>
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontFamily: 'Space Grotesk, sans-serif',
          textShadow:
            '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
        }}
      >
        Penetration Analysis
      </Typography>

      {/* Show message if no players available */}
      {players.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            backgroundColor: 'grey.50',
            borderRadius: 1,
            border: '1px dashed',
            borderColor: 'grey.300',
          }}
        >
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No Players Available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No players found for penetration analysis.
          </Typography>
        </Box>
      ) : (
        /* Render all players in accordion format */
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Penetration analysis for all players against{' '}
            {selectedTargetIds.size === 1
              ? 'the selected target'
              : `${selectedTargetIds.size} available targets`}
            . Click to expand details.
          </Typography>

          {players.map((player) => {
            const playerPenetrationData = penetrationData.get(player.id.toString());

            return (
              <PlayerPenetrationDetails
                key={player.id}
                id={player.id.toString()}
                player={player}
                name={player.name}
                fight={fight}
                expanded={expandedPlayers[player.id] || false}
                onExpandChange={onPlayerExpandChange(player.id.toString())}
                penetrationData={playerPenetrationData || null}
                isLoading={isLoading}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
};
