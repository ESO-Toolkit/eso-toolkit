import { Box, Typography, List, ListItem, ListItemText, Button } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../store/storeWithHistory';

interface EventsPanelProps {
  page: number;
  setPage: (page: number) => void;
  EVENTS_PER_PAGE: number;
}

const EventsPanel: React.FC<EventsPanelProps> = ({ page, setPage, EVENTS_PER_PAGE }) => {
  const events = useSelector((state: RootState) => state.events.events);
  const paginatedEvents = events.slice(page * EVENTS_PER_PAGE, (page + 1) * EVENTS_PER_PAGE);
  return (
    <Box mt={2}>
      <Typography variant="h6">Events</Typography>
      <List>
        {paginatedEvents.map((event, idx) => (
          <ListItem key={page * EVENTS_PER_PAGE + idx} divider>
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
          Page {page + 1} of {Math.ceil(events.length / EVENTS_PER_PAGE)}
        </Typography>
        <Button
          variant="outlined"
          onClick={() =>
            setPage(Math.min(Math.ceil(events.length / EVENTS_PER_PAGE) - 1, page + 1))
          }
          disabled={(page + 1) * EVENTS_PER_PAGE >= events.length}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default EventsPanel;
