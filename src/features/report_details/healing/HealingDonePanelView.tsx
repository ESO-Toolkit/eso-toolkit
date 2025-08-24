import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Link,
  Chip,
  Paper,
} from '@mui/material';
import React from 'react';

import { useReportFightParams } from '../../../hooks/useReportFightParams';
import { KnownAbilities } from '../../../types/abilities';

interface HealingRow {
  id: string;
  name: string;
  raw: number;
  hps: number;
  overheal: number;
  overhealPercentage: number;
  iconUrl?: string;
  ressurects: number;
}

interface HealingDonePanelViewProps {
  healingRows: HealingRow[];
}

/**
 * Dumb component that only handles rendering the healing done panel UI
 */
export const HealingDonePanelView: React.FC<HealingDonePanelViewProps> = ({ healingRows }) => {
  const { reportId, fightId } = useReportFightParams();

  const handleResurrectClick = (playerId: string): void => {
    if (reportId && fightId) {
      const url = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=casts&ability=${KnownAbilities.RESURRECT}&source=${playerId}`;
      window.open(url, '_blank');
    }
  };

  const handleHealingLinkClick = (playerId: string): void => {
    if (reportId && fightId) {
      const url = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=healing&source=${playerId}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Box>
      <Typography variant="h6">Healing Done by Player</Typography>
      <Paper elevation={2} sx={{ p: 2 }}>
        {healingRows.length > 0 ? (
          <List>
            {healingRows.map((row) => (
              <ListItem key={row.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {row.iconUrl && (
                        <Avatar src={row.iconUrl} alt="icon" sx={{ width: 24, height: 24 }} />
                      )}
                      <Typography component="span">
                        {row.name} (ID: {row.id})
                      </Typography>
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => handleHealingLinkClick(row.id)}
                        sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        View in ESO Logs
                      </Link>
                      {row.ressurects > 0 && (
                        <Chip
                          label={`${row.ressurects} Resurrect${row.ressurects > 1 ? 's' : ''}`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                          clickable
                          onClick={() => handleResurrectClick(row.id)}
                          sx={{ fontSize: '0.75rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={`Raw Heals: ${row.raw.toLocaleString()} | HPS: ${row.hps.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Overheals: ${row.overheal.toLocaleString()} (${row.overhealPercentage.toFixed(1)}%)`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>No healing events found.</Typography>
        )}
      </Paper>
    </Box>
  );
};
