import { Box, Typography, List, ListItem, ListItemText, Avatar } from '@mui/material';
import React from 'react';

interface HealingRow {
  id: string;
  name: string;
  raw: number;
  hps: number;
  overheal: number;
  iconUrl?: string;
}

interface HealingDonePanelViewProps {
  healingRows: HealingRow[];
}

/**
 * Dumb component that only handles rendering the healing done panel UI
 */
const HealingDonePanelView: React.FC<HealingDonePanelViewProps> = ({ healingRows }) => {
  return (
    <Box>
      <Typography variant="h6">Healing Done by Player</Typography>
      {healingRows.length > 0 ? (
        <List>
          {healingRows.map((row) => (
            <ListItem key={row.id} divider>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {row.iconUrl && (
                      <Avatar src={row.iconUrl} alt="icon" sx={{ width: 24, height: 24 }} />
                    )}
                    <Typography component="span">
                      {row.name} (ID: {row.id})
                    </Typography>
                  </Box>
                }
                secondary={`Raw Heals: ${row.raw.toLocaleString()} | HPS: ${row.hps.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Overheals: ${row.overheal.toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography>No healing events found.</Typography>
      )}
    </Box>
  );
};

export default HealingDonePanelView;
