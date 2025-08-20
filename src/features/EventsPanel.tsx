import { Box, Typography, List, ListItem, ListItemText, Button } from '@mui/material';
import { TextField } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../store/storeWithHistory';

interface EventsPanelProps {
  page: number;
  setPage: (page: number) => void;
  EVENTS_PER_PAGE?: number;
}

const EventsPanel: React.FC<EventsPanelProps> = ({ page, setPage, EVENTS_PER_PAGE }) => {
  const events = useSelector((state: RootState) => state.events.events);
  const [filterType, setFilterType] = React.useState('');
  const EVENTS_PER_PAGE_FINAL = EVENTS_PER_PAGE ?? 25;
  const filteredEvents = React.useMemo(() => {
    if (!filterType) return events;
    return events.filter((e) => (e.type || '').toLowerCase().includes(filterType.toLowerCase()));
  }, [events, filterType]);
  const paginatedEvents = filteredEvents.slice(
    page * EVENTS_PER_PAGE_FINAL,
    (page + 1) * EVENTS_PER_PAGE_FINAL
  );
  return (
    <Box mt={2}>
      <Typography variant="h6">Events</Typography>
      <TextField
        label="Filter by Event Type"
        variant="outlined"
        size="small"
        value={filterType}
        onChange={(e) => {
          setPage(0);
          setFilterType(e.target.value);
        }}
        sx={{ mb: 2 }}
      />
      <List>
        {paginatedEvents.map((event, idx) => (
          <ListItem key={page * EVENTS_PER_PAGE_FINAL + idx} divider>
            <ListItemText
              primary={event.type || JSON.stringify(event)}
              secondary={JSON.stringify(event, null, 2)}
            />
          </ListItem>
        ))}
      </List>
      <Box display="flex" justifyContent="center" alignItems="center" mt={2} gap={2}>
        <Button
          variant="outlined"
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
        >
          Previous
        </Button>
        <Typography>
          Page {page + 1} of {Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE_FINAL))}
        </Typography>
        <Button
          variant="outlined"
          onClick={() =>
            setPage(
              Math.min(Math.ceil(filteredEvents.length / EVENTS_PER_PAGE_FINAL) - 1, page + 1)
            )
          }
          disabled={(page + 1) * EVENTS_PER_PAGE_FINAL >= filteredEvents.length}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default EventsPanel;
