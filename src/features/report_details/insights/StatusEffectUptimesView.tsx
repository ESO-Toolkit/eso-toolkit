import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import TimelineIcon from '@mui/icons-material/Timeline';
import {
  Box,
  Typography,
  List,
  ListItem,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import React from 'react';

import { AnalyzerPanelState, type AnalyzerPanelStateKind } from '../AnalyzerPanelState';

import { BuffUptime, BuffUptimeProgressBar } from './BuffUptimeProgressBar';

interface StatusEffectUptimesViewProps {
  selectedTargetId: number | null;
  statusEffectUptimes: BuffUptime[] | null;
  state: AnalyzerPanelStateKind;
  stateDetail?: string;
  reportId: string | null;
  fightId: string | null;
  onOpenTimeline?: () => void;
  canOpenTimeline?: boolean;
}

export const StatusEffectUptimesView: React.FC<StatusEffectUptimesViewProps> = ({
  selectedTargetId,
  statusEffectUptimes,
  state,
  stateDetail,
  reportId,
  fightId,
  onOpenTimeline,
  canOpenTimeline = false,
}) => {
  const descriptionId = React.useId();
  const [nameFilter, setNameFilter] = React.useState('');

  const filteredStatusEffectUptimes = React.useMemo(() => {
    if (!statusEffectUptimes || !nameFilter.trim()) return statusEffectUptimes;
    const normalizedFilter = nameFilter.trim().toLowerCase();
    return statusEffectUptimes.filter((effect) =>
      effect.abilityName.toLowerCase().includes(normalizedFilter),
    );
  }, [statusEffectUptimes, nameFilter]);

  return (
    <Box sx={{ mt: 2 }}>
      <AnalyzerPanelState title="Status Effect Uptimes" state={state} detail={stateDetail}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
        >
          <Tooltip title="View status effect uptimes timeline">
            <span>
              <IconButton
                aria-label="Open status effect uptimes timeline"
                aria-describedby={descriptionId}
                size="small"
                color="primary"
                onClick={onOpenTimeline}
                disabled={!canOpenTimeline}
              >
                <TimelineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }} id={descriptionId}>
          {selectedTargetId
            ? 'Shows status effects applied to the selected target'
            : 'Shows status effects applied to all targets'}
          {selectedTargetId && '. Click on a status effect to view in ESO Logs'}.
        </Typography>

        {statusEffectUptimes && statusEffectUptimes.length > 0 && (
          <TextField
            size="small"
            fullWidth
            placeholder="Filter by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            sx={{ mb: 1 }}
            slotProps={{
              htmlInput: { 'aria-label': 'Filter status effects by name' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: nameFilter && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setNameFilter('')}
                      edge="end"
                      aria-label="clear filter"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        )}

        {filteredStatusEffectUptimes && filteredStatusEffectUptimes.length > 0 ? (
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            <List disablePadding>
              {filteredStatusEffectUptimes.map((statusEffect) => {
                return (
                  <ListItem
                    key={statusEffect.abilityGameID}
                    sx={{
                      py: 1,
                      pl: 0,
                      '&:hover': {
                        backgroundColor:
                          reportId && fightId && selectedTargetId ? 'action.hover' : 'transparent',
                      },
                    }}
                    divider
                  >
                    <BuffUptimeProgressBar
                      buff={statusEffect}
                      reportId={reportId}
                      fightId={fightId}
                      selectedTargetId={selectedTargetId}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {nameFilter
              ? `No status effects matching "${nameFilter}" found.`
              : selectedTargetId
                ? 'No status effects found for the selected target.'
                : 'No status effects found.'}
          </Typography>
        )}
      </AnalyzerPanelState>
    </Box>
  );
};
