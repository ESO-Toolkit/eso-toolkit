import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import TimelineIcon from '@mui/icons-material/Timeline';
import {
  Box,
  Typography,
  List,
  ListItem,
  Button,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import React from 'react';

import { AnalyzerPanelState, type AnalyzerPanelStateKind } from '../AnalyzerPanelState';

import { BuffUptimeProgressBar, BuffUptime } from './BuffUptimeProgressBar';

interface DebuffUptimesViewProps {
  selectedTargetId: number | null;
  debuffUptimes: BuffUptime[];
  state: AnalyzerPanelStateKind;
  stateDetail?: string;
  showAllDebuffs: boolean;
  onToggleShowAll: (showAll: boolean) => void;
  reportId: string | null;
  fightId: string | null;
  onOpenTimeline?: () => void;
  canOpenTimeline?: boolean;
}

export const DebuffUptimesView: React.FC<DebuffUptimesViewProps> = ({
  selectedTargetId,
  debuffUptimes,
  state,
  stateDetail,
  showAllDebuffs,
  onToggleShowAll,
  reportId,
  fightId,
  onOpenTimeline,
  canOpenTimeline = false,
}) => {
  const descriptionId = React.useId();
  const [nameFilter, setNameFilter] = React.useState('');

  const filteredDebuffUptimes = React.useMemo(() => {
    if (!nameFilter.trim()) return debuffUptimes;
    const normalizedFilter = nameFilter.trim().toLowerCase();
    return debuffUptimes.filter((debuff) =>
      debuff.abilityName.toLowerCase().includes(normalizedFilter),
    );
  }, [debuffUptimes, nameFilter]);

  return (
    <Box sx={{ mt: 2 }}>
      <AnalyzerPanelState title="Debuff Uptimes" state={state} detail={stateDetail}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
        >
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => onToggleShowAll(!showAllDebuffs)}
            >
              {showAllDebuffs ? 'Show Important Only' : 'Show All Debuffs'}
            </Button>
            <Tooltip title="View debuff uptimes timeline">
              <span>
                <IconButton
                  aria-label="Open debuff uptimes timeline"
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
        </Stack>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }} id={descriptionId}>
          {selectedTargetId
            ? 'Shows debuffs applied by friendly players to the selected target'
            : 'Shows debuffs applied by friendly players to all targets'}
          {!showAllDebuffs && ' (filtered to important debuffs only)'}.
          {reportId && fightId && ' Click on a debuff to view in ESO Logs.'}
        </Typography>

        {debuffUptimes.length > 0 && (
          <TextField
            size="small"
            fullWidth
            placeholder="Filter by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            sx={{ mb: 1 }}
            slotProps={{
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

        {filteredDebuffUptimes.length > 0 ? (
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            <List disablePadding>
              {filteredDebuffUptimes.map((debuff) => {
                return (
                  <ListItem
                    key={debuff.abilityGameID}
                    sx={{
                      py: 1,
                      pl: 0.5,
                      '&:hover': {
                        backgroundColor: reportId && fightId ? 'action.hover' : 'transparent',
                      },
                    }}
                    divider
                  >
                    <BuffUptimeProgressBar
                      buff={debuff}
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
              ? `No debuffs matching "${nameFilter}" found.`
              : showAllDebuffs
                ? selectedTargetId
                  ? 'No friendly debuff events found for the selected target.'
                  : 'No friendly debuff events found.'
                : selectedTargetId
                  ? 'No important debuff events found for the selected target. Try showing all debuffs.'
                  : 'No important debuff events found. Try showing all debuffs.'}
          </Typography>
        )}
      </AnalyzerPanelState>
    </Box>
  );
};
