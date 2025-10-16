import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../../graphql/generated';

interface MapsPanelProps {
  fight: FightFragment;
}

export const MapsPanel: React.FC<MapsPanelProps> = ({ fight }) => {
  const maps = fight.maps || [];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Fight Maps
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Maps associated with this fight. Multiple maps may indicate phase transitions or different
        areas visited during the encounter.
      </Typography>

      {maps.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">No maps found for this fight.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {maps.map((map, index) => (
            <Card key={map?.id || index} elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Chip
                    label={`Map ${index + 1}`}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  {index === 0 && (
                    <Chip
                      label="Primary"
                      color="success"
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                </Box>

                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Name
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {map?.name || 'Unknown'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Map ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {map?.id || 'N/A'}
                    </Typography>
                  </Box>

                  {map?.file && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        File
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                        }}
                      >
                        {map.file}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Game Zone Information */}
      {fight.gameZone && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Game Zone
          </Typography>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Zone Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {fight.gameZone.name || 'Unknown'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Zone ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {fight.gameZone.id}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};
