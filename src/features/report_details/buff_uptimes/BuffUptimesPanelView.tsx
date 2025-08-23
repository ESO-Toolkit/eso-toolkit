import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  ListItemButton,
} from '@mui/material';
import React from 'react';

interface BuffData {
  abilityGameID: string;
  name: string;
  icon?: string;
  totalUptimePercent: number;
  avgTargetUptime: number;
  targets: Array<{
    targetId: string;
    targetName: string;
    uptimePercent: number;
  }>;
}

interface BuffUptimesPanelViewProps {
  buffs: BuffData[];
  expandedBuff: string | null;
  onToggleExpand: (abilityId: string) => void;
}

/**
 * Dumb component that only handles rendering the buff uptimes panel UI
 */
const BuffUptimesPanelView: React.FC<BuffUptimesPanelViewProps> = ({
  buffs,
  expandedBuff,
  onToggleExpand,
}) => {
  return (
    <Box>
      <Typography variant="h6">Buff Uptime Percentages</Typography>
      {buffs.length > 0 ? (
        <List>
          {buffs.map((buff) => (
            <React.Fragment key={buff.abilityGameID}>
              <ListItem divider>
                <ListItemButton onClick={() => onToggleExpand(buff.abilityGameID)}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    {buff.icon && (
                      <img
                        src={`https://assets.rpglogs.com/img/eso/abilities/${buff.icon}.png`}
                        alt={buff.name}
                        style={{ width: 32, height: 32, marginRight: 12, borderRadius: 4 }}
                      />
                    )}
                    <ListItemText
                      primary={`${buff.name} (${buff.abilityGameID})`}
                      secondary={`Total Uptime: ${buff.totalUptimePercent.toFixed(2)}% | Avg per Target: ${buff.avgTargetUptime.toFixed(2)}%`}
                    />
                  </Box>
                  <Box sx={{ width: 200, ml: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={buff.totalUptimePercent}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                </ListItemButton>
              </ListItem>
              {expandedBuff === buff.abilityGameID && (
                <Box sx={{ pl: 4, pb: 2 }}>
                  <Typography variant="subtitle1">Buff Uptime Details by Target</Typography>
                  <List>
                    {buff.targets.map((target) => (
                      <ListItem key={target.targetId}>
                        <ListItemText
                          primary={target.targetName}
                          secondary={`Uptime: ${target.uptimePercent.toFixed(2)}%`}
                        />
                        <Box sx={{ width: 200, ml: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={target.uptimePercent}
                            sx={{ height: 10, borderRadius: 5 }}
                          />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </React.Fragment>
          ))}
        </List>
      ) : (
        <Typography>No buff events found. Check event structure in console log.</Typography>
      )}
    </Box>
  );
};

export default BuffUptimesPanelView;
