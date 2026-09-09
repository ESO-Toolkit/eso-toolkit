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

interface BuffUptimesViewProps {
  buffUptimes: BuffUptime[];
  state: AnalyzerPanelStateKind;
  stateDetail?: string;
  showAllBuffs: boolean;
  onToggleShowAll: (showAll: boolean) => void;
  reportId: string | null;
  fightId: string | null;
  selectedTargetId: number | null;
  onOpenTimeline?: () => void;
  canOpenTimeline?: boolean;
}

export const BuffUptimesView: React.FC<BuffUptimesViewProps> = ({
  buffUptimes,
  state,
  stateDetail,
  showAllBuffs,
  onToggleShowAll,
  reportId,
  fightId,
  selectedTargetId,
  onOpenTimeline,
  canOpenTimeline = false,
}) => {
  const descriptionId = React.useId();
  const [nameFilter, setNameFilter] = React.useState('');
  const [expandedRows, setExpandedRows] = React.useState(false);

  const filteredBuffUptimes = React.useMemo(() => {
    if (!nameFilter.trim()) return buffUptimes;
    const normalizedFilter = nameFilter.trim().toLowerCase();
    return buffUptimes.filter((buff) => buff.abilityName.toLowerCase().includes(normalizedFilter));
  }, [buffUptimes, nameFilter]);

  // Cap the number of rendered rows to avoid mounting a large number of
  // progress bars at once (each can expand into a stacks Collapse). Mirrors
  // the slice cap used in DamageBreakdownView, with an opt-in "show more".
  const ROW_CAP = 30;
  const visibleBuffUptimes = expandedRows
    ? filteredBuffUptimes
    : filteredBuffUptimes.slice(0, ROW_CAP);
  const hiddenCount = filteredBuffUptimes.length - visibleBuffUptimes.length;

  // Collapse back to the cap whenever the result set changes (filter/data).
  React.useEffect(() => {
    setExpandedRows(false);
  }, [nameFilter, buffUptimes]);

  return (
    <Box sx={{ mt: 2 }}>
      <AnalyzerPanelState title="Buff Uptimes" state={state} detail={stateDetail}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
        >
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" onClick={() => onToggleShowAll(!showAllBuffs)}>
              {showAllBuffs ? 'Show Important Only' : 'Show All Buffs'}
            </Button>
            <Tooltip title="View buff uptimes timeline">
              <span>
                <IconButton
                  aria-label="Open buff uptimes timeline"
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
            ? 'Shows buff uptimes for the selected player with delta from group average'
            : 'Shows average buff uptimes across friendly players'}
          {!showAllBuffs && ' (filtered to important buffs only)'}. Click on a buff to view in ESO
          Logs.
        </Typography>

        {buffUptimes.length > 0 && (
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

        {filteredBuffUptimes.length > 0 ? (
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            <List disablePadding>
              {visibleBuffUptimes.map((buff) => {
                return (
                  <ListItem
                    key={buff.abilityGameID}
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
                      buff={buff}
                      reportId={reportId}
                      fightId={fightId}
                      selectedTargetId={selectedTargetId}
                    />
                  </ListItem>
                );
              })}
            </List>
            {hiddenCount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <Button size="small" onClick={() => setExpandedRows(true)}>
                  Show {hiddenCount} more
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {nameFilter
              ? `No buffs matching "${nameFilter}" found.`
              : showAllBuffs
                ? 'No friendly buff events found.'
                : 'No important buff events found. Try showing all buffs.'}
          </Typography>
        )}
      </AnalyzerPanelState>
    </Box>
  );
};
