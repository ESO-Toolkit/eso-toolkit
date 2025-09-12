import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/generated';
import { useDamageEvents } from '../../hooks/events/useDamageEvents';
import { usePlayerData } from '../../hooks/usePlayerData';

import { DamageEventsList } from './components/DamageEventsList';

interface DamageAnalysisViewProps {
  fight: FightFragment | undefined;
  fightsLoading: boolean;
  reportId?: string;
  fightId?: string;
}

export const DamageAnalysisView: React.FC<DamageAnalysisViewProps> = ({
  fight,
  fightsLoading,
  reportId,
  fightId,
}) => {
  const [selectedActorId, setSelectedActorId] = React.useState<string>('');
  const [eventLimit, setEventLimit] = React.useState<number>(500); // Limit events for performance

  // Get player data and damage events
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();

  // Handle actor selection
  const handleActorChange = (event: SelectChangeEvent): void => {
    setSelectedActorId(event.target.value);
  };

  // Handle event limit change
  const handleEventLimitChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(event.target.value, 10);
    if (value > 0) {
      setEventLimit(value);
    }
  };

  // Filter damage events for the selected actor
  const actorDamageEvents = React.useMemo(() => {
    if (!selectedActorId || !damageEvents) return [];
    const actorIdNumber = parseInt(selectedActorId, 10);
    const filtered = damageEvents.filter((event) => event.sourceID === actorIdNumber);

    // Limit events for performance - take the first N events
    return filtered.slice(0, eventLimit);
  }, [selectedActorId, damageEvents, eventLimit]);

  // Loading state
  if (fightsLoading || isPlayerDataLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
      </Container>
    );
  }

  // Error states
  if (!reportId || !fightId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Missing report ID or fight ID. Please navigate to a specific fight to analyze damage.
        </Alert>
      </Container>
    );
  }

  if (!fight) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Fight not found. The selected fight may not exist or may not be loaded yet.
        </Alert>
      </Container>
    );
  }

  if (!playerData?.playersById || Object.keys(playerData.playersById).length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          No player data available for this fight. Player data may still be loading.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Damage Analysis
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {fight.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Duration: {Math.round((fight.endTime - fight.startTime) / 1000)}s
        </Typography>
      </Box>

      {/* Actor Selection */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Actor
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <FormControl fullWidth sx={{ minWidth: 200 }}>
              <InputLabel id="actor-select-label">Actor</InputLabel>
              <Select
                labelId="actor-select-label"
                id="actor-select"
                value={selectedActorId}
                label="Actor"
                onChange={handleActorChange}
              >
                {Object.entries(playerData.playersById).map(([id, player]) => (
                  <MenuItem key={id} value={id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">{player.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({player.role})
                      </Typography>
                      {player.server && (
                        <Typography variant="body2" color="text.secondary">
                          - {player.server}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Event Limit"
              type="number"
              value={eventLimit}
              onChange={handleEventLimitChange}
              inputProps={{ min: 1, max: 10000 }}
              sx={{ minWidth: 150 }}
              helperText="Limit events for performance"
            />
          </Box>

          {selectedActorId && damageEvents && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Total events for actor:{' '}
              {damageEvents.filter((e) => e.sourceID === parseInt(selectedActorId, 10)).length}
              {actorDamageEvents.length <
                damageEvents.filter((e) => e.sourceID === parseInt(selectedActorId, 10)).length &&
                ` (showing first ${actorDamageEvents.length})`}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Damage Events List */}
      {selectedActorId && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Damage Events for {playerData.playersById[selectedActorId]?.name}
            </Typography>
            {isDamageEventsLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[...Array(5)].map((_, index) => (
                  <Skeleton key={index} variant="rectangular" width="100%" height={80} />
                ))}
              </Box>
            ) : (
              <DamageEventsList
                damageEvents={actorDamageEvents}
                selectedActorId={parseInt(selectedActorId, 10)}
                fight={fight}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions when no actor selected */}
      {!selectedActorId && (
        <Card>
          <CardContent>
            <Alert severity="info">
              Select an actor from the dropdown above to view their damage events with associated
              buffs, debuffs, and predicted damage calculations.
            </Alert>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};
