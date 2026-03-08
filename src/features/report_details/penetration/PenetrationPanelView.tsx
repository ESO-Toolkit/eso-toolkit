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
          <Typography component="div" variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
            ESO TK and Combat Metrics (CMX) use different methodologies to calculate penetration, so
            small differences are expected. Here are the key differences:
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Time-weighted vs. damage-weighted averaging
          </Typography>
          <Typography variant="body2" paragraph>
            ESO TK calculates penetration in 1-second time windows (voxels) and averages them
            equally across the fight duration. CMX weights each penetration sample by the damage
            dealt in that window, so high-damage moments contribute more to the final average. This
            is the primary source of small differences.
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Arena weapon set penetration
          </Typography>
          <Typography variant="body2" paragraph>
            ESO TK tracks arena weapon set penetration (e.g. Perfected Merciless Charge, Perfected
            Crushing Wall) per weapon bar, applying it only during the timestamps when that bar is
            active. CMX does not track arena weapon pen by bar — it applies a single fixed value for
            the whole fight. This means our MAX may be higher than CMX&apos;s when you spend time on
            the arena weapon bar, but our ACTIVE average will be lower (and more accurate).
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Base penetration snapshots
          </Typography>
          <Typography variant="body2" paragraph>
            CMX reads your penetration stat in real time and sees changes on weapon bar swaps. ESO
            TK uses a single snapshot from the combat log&apos;s combatant info, which may not
            reflect bar-swap variations in other stats.
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Force of Nature CP detection
          </Typography>
          <Typography variant="body2" paragraph>
            Force of Nature (CP 276) grants 660 penetration per unique active status effect on the
            target. ESO TK detects whether you have Force of Nature slotted by checking your
            combatant-info aura data — the same mechanism used for other slottable CP passives. If
            the aura is absent, status-effect penetration is not counted. CMX reads your CP loadout
            directly from the combat log. Both tools should agree on this source; if they
            don&apos;t, it may reflect a difference in which status effects are being tracked.
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            What is tracked the same
          </Typography>
          <Typography variant="body2" paragraph>
            Both tools track the same debuff sources — Major &amp; Minor Breach, Crusher
            enchantment, Crimson Oath&apos;s Rive, Night Mother&apos;s Gaze, Alkosh, and CP passive
            penetration (Piercing). Differences from these sources are typically negligible.
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Typical variance
          </Typography>
          <Typography variant="body2">
            In practice, the averaging-method difference causes less than 0.1% variance. When Force
            of Nature is slotted, additional variance can appear if the tracked status effects
            differ between tools (up to several thousand penetration when three or more are
            simultaneously active).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCmxDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
