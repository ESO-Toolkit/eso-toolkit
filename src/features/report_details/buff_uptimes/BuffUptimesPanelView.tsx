import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  Avatar,
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
  expandedBuff: _expandedBuff,
  onToggleExpand: _onToggleExpand,
}) => {
  return (
    <Box>
      <Card variant="outlined" className="u-hover-lift u-fade-in-up">
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" align="center" sx={{ fontWeight: 700 }}>
            Buff Uptimes
          </Typography>
          <Divider sx={{ my: 1.5, opacity: 0.2 }} />
          {buffs.length > 0 ? (
            <List disablePadding>
              {buffs.map((buff) => {
                const pct = Math.max(0, Math.min(100, buff.totalUptimePercent));
                return (
                  <ListItem key={buff.abilityGameID} sx={{ py: 1 }} divider>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.25 }}>
                      {buff.icon ? (
                        <Avatar
                          src={`https://assets.rpglogs.com/img/eso/abilities/${buff.icon}.png`}
                          alt={buff.name}
                          sx={{ width: 32, height: 32, borderRadius: 1, boxShadow: 1 }}
                          variant="rounded"
                        />
                      ) : (
                        <Avatar sx={{ width: 32, height: 32 }} variant="rounded">
                          {buff.name.charAt(0)}
                        </Avatar>
                      )}
                      <ListItemText
                        primary={buff.name}
                        primaryTypographyProps={{
                          variant: 'body2',
                          noWrap: true,
                          sx: { fontWeight: 600 },
                        }}
                        sx={{ flex: '0 0 240px', mr: 1 }}
                      />
                      <Box sx={{ flex: 1, minWidth: 160 }}>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 12,
                            borderRadius: 999,
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(0,0,0,0.06)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 999,
                              background: 'linear-gradient(90deg, #0ea5a0 0%, #16a34a 100%)',
                            },
                          }}
                        />
                      </Box>
                      <Box sx={{ width: 48, textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {Math.round(pct)}%
                        </Typography>
                      </Box>
                    </Box>
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No buff events found.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default BuffUptimesPanelView;

