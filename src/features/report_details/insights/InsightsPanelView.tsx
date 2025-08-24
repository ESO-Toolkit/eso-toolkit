import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import React from 'react';

import { FightFragment } from '../../../graphql/generated';

import BuffUptimesPanel from './BuffUptimesPanel';
import DamageBreakdownPanel from './DamageBreakdownPanel';
import DamageTypeBreakdownPanel from './DamageTypeBreakdownPanel';
import DebuffUptimesPanel from './DebuffUptimesPanel';
import StatusEffectUptimesPanel from './StatusEffectUptimesPanel';

interface InsightsPanelViewProps {
  fight: FightFragment;
  durationSeconds: number;
  abilityEquipped: Record<string, string[]>;
  buffActors: Record<string, Set<string>>;
  firstDamageDealer: string | null;
  selectedTargetId?: string;
  isLoading: boolean;
}

const ABILITY_NAMES = ['Glacial Colossus', 'Summon Charged Atronach', 'Aggressive Horn'];
const CHAMPION_POINT_NAMES = ['Enlivening Overflow', 'From the Brink'];

const InsightsPanelView: React.FC<InsightsPanelViewProps> = ({
  fight,
  durationSeconds,
  abilityEquipped,
  buffActors,
  firstDamageDealer,
  selectedTargetId,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <>
        <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={20} />
            <Typography variant="h6">Loading Fight Insights...</Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Box sx={{ mt: 2 }}>
              <Skeleton variant="text" width="40%" height={20} />
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} variant="text" width="80%" height={20} sx={{ mt: 1 }} />
              ))}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Skeleton variant="text" width="40%" height={20} />
              {[...Array(2)].map((_, index) => (
                <Skeleton key={index} variant="text" width="80%" height={20} sx={{ mt: 1 }} />
              ))}
            </Box>
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={16} />
            <Typography variant="h6">Loading Status Effects & Uptimes Analysis...</Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="rectangular" width="100%" height={40} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 3 }} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 3 }} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={16} />
            <Typography variant="h6">Loading Damage Analysis...</Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="rectangular" width="100%" height={40} />
            <Skeleton variant="rectangular" width="100%" height={300} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 3 }} />
            <Skeleton variant="rectangular" width="100%" height={250} sx={{ mt: 2 }} />
          </Box>
        </Paper>
      </>
    );
  }
  return (
    <>
      <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Fight Insights
        </Typography>

        <Box>
          <Typography>
            <strong>Duration:</strong> {durationSeconds.toFixed(1)} seconds
          </Typography>
        </Box>

        {firstDamageDealer && (
          <Box>
            <Typography>
              <strong>First Damage Dealer:</strong> {firstDamageDealer}
            </Typography>
          </Box>
        )}

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Abilities Equipped:
          </Typography>
          <List dense>
            {ABILITY_NAMES.map((name) => (
              <ListItem key={name} sx={{ mb: 1 }}>
                <ListItemText
                  primary={name}
                  secondary={
                    abilityEquipped[name]?.length ? abilityEquipped[name].join(', ') : 'None'
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Champion Points Equipped:
          </Typography>
          <List dense>
            {CHAMPION_POINT_NAMES.map((name) => (
              <ListItem key={name} sx={{ mb: 1 }}>
                <ListItemText
                  primary={name}
                  secondary={
                    buffActors[name]?.size ? Array.from(buffActors[name]).join(', ') : 'None'
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Paper>

      {/* Target Selection and Status Effect/Buff Uptimes */}
      <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Status Effects & Uptimes
        </Typography>
        <StatusEffectUptimesPanel fight={fight} selectedTargetId={selectedTargetId} />
        <BuffUptimesPanel fight={fight} selectedTargetId={selectedTargetId} />
        <DebuffUptimesPanel fight={fight} selectedTargetId={selectedTargetId} />
      </Paper>

      {/* Damage Breakdown */}
      <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Damage Analysis
        </Typography>
        <DamageBreakdownPanel fight={fight} />
        <DamageTypeBreakdownPanel fight={fight} />
      </Paper>
    </>
  );
};

export default InsightsPanelView;
