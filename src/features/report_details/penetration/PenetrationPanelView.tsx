import {
  Box,
  Typography,
  Alert,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import React, { useState } from 'react';

import { FightFragment as Fight } from '../../../graphql/gql/graphql';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { PlayerDetailsWithRole as Player } from '../../../store/player_data/playerDataSlice';
import { PlayerPenetrationData } from '../../../workers/calculations/CalculatePenetration';

import { PlayerPenetrationDetails } from './PlayerPenetrationDetails';

export interface PenetrationPanelViewProps {
  readonly penetrationData: Record<string, PlayerPenetrationData> | null;
  readonly players: Player[];
  readonly selectedTargetIds: Set<number>;
  readonly isLoading: boolean;
  readonly fight: Fight;
  readonly expandedPlayers: Record<number, boolean>;
  readonly onPlayerExpandChange: (
    playerId: string,
  ) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
  readonly phaseTransitionInfo?: PhaseTransitionInfo;
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
  phaseTransitionInfo,
}) => {
  const [cmxDialogOpen, setCmxDialogOpen] = useState(false);

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
              '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.2)',
          }}
        >
          ✒️ Penetration Analysis
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
            '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.2)',
        }}
      >
        ✒️ Penetration Analysis
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
            . Click to expand details.{' '}
            <Link
              component="button"
              variant="body2"
              onClick={() => setCmxDialogOpen(true)}
              sx={{ verticalAlign: 'baseline' }}
            >
              Why is my value different from CMX?
            </Link>
          </Typography>

          {players.map((player) => {
            const playerPenetrationData = penetrationData?.[player.id.toString()] || null;

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
                phaseTransitionInfo={phaseTransitionInfo}
              />
            );
          })}
        </Box>
      )}

      <Dialog open={cmxDialogOpen} onClose={() => setCmxDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Why is my value different from CMX?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph>
            ESO Logs and Combat Metrics (CMX) use different methodologies to calculate penetration,
            so small differences are expected. Here are the key differences:
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Time-weighted vs. damage-weighted averaging
          </Typography>
          <Typography variant="body2" paragraph>
            ESO Logs calculates penetration in 1-second time windows (voxels) and averages them
            equally across the fight duration. CMX weights each penetration sample by the damage
            dealt in that window, so high-damage moments contribute more to the final average. This
            is the primary source of small differences.
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Base penetration snapshots
          </Typography>
          <Typography variant="body2" paragraph>
            CMX reads your penetration stat in real time and sees changes on weapon bar swaps. ESO
            Logs uses a single snapshot from the combat log&apos;s combatant info, which may not
            reflect bar-swap variations.
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            What is tracked the same
          </Typography>
          <Typography variant="body2" paragraph>
            Both tools track the same debuff and buff sources — Major &amp; Minor Breach, Crusher
            enchantment, Crimson Oath&apos;s Rive, Night Mother&apos;s Gaze, Alkosh, and CP passive
            penetration (Piercing, Force of Nature via status effects). Differences from these
            sources are typically negligible.
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Typical variance
          </Typography>
          <Typography variant="body2">
            In practice, the difference between ESO Logs and CMX is usually less than 0.1% — well
            within the margin caused by the averaging method difference.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCmxDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
