import { Box, Typography, List, ListItem, ListItemText, Avatar } from '@mui/material';
import React from 'react';

interface DamageRow {
  id: string;
  name: string;
  total: number;
  dps: number;
  iconUrl?: string;
}

interface DamageDonePanelViewProps {
  damageRows: DamageRow[];
}

/**
 * Dumb component that only handles rendering the damage done panel UI
 */
const DamageDonePanelView: React.FC<DamageDonePanelViewProps> = ({ damageRows }) => {
  return (
    <Box>
      <Typography variant="h6">Damage Done by Player</Typography>
      {damageRows.length > 0 ? (
        <List>
          {damageRows.map((row) => (
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
                secondary={`Total Damage: ${row.total.toLocaleString()} | DPS: ${row.dps.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography>No damage events found.</Typography>
      )}
    </Box>
  );
};

export default DamageDonePanelView;
