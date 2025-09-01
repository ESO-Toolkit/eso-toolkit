import { Box, Typography, Paper, Skeleton, CircularProgress } from '@mui/material';
import React from 'react';

interface InsightsSkeletonLayoutProps {
  showHeader?: boolean;
  showTabs?: boolean;
}

export const InsightsSkeletonLayout: React.FC<InsightsSkeletonLayoutProps> = ({
  showHeader = false,
  showTabs = false,
}) => {
  return (
    <Box>
      {/* Target Selection Skeleton */}
      {showHeader && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ minWidth: 200 }}>
            <Skeleton variant="rounded" width={200} height={56} />
          </Box>
        </Box>
      )}

      {/* Tabs Skeleton */}
      {showTabs && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 1,
          width: '100%',
          gap: 1,
          overflowX: 'auto' 
        }}>
          <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton 
                key={i} 
                variant="rounded" 
                width={36} 
                height={36}
                sx={{ 
                  borderRadius: '50%',
                  flexShrink: 0,
                }}
              />
            ))}
          </Box>
          <Skeleton variant="rounded" width={140} height={32} />
        </Box>
      )}

      {/* Main insights grid layout - matches InsightsPanelView exactly */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          opacity: 1,
          transition: 'opacity 0.2s ease-in-out',
        }}
      >
        {/* Fight Insights - First column */}
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Fight Insights
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="text" width="60%" height={20} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="text" width="70%" height={20} />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 300 }}>
                Abilities Equipped:
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {[...Array(4)].map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 0.75,
                      height: 56, // Exact height to match ability cards
                      bgcolor: 'rgba(0,0,0,0.04)',
                      borderRadius: 1,
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  >
                    <Skeleton variant="rounded" width={40} height={40} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="80%" height={12} />
                      <Skeleton variant="text" width="60%" height={10} sx={{ mt: 0.25 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 0, fontWeight: 300 }}>
                Champion Points Equipped:
              </Typography>
              <Box sx={{ mt: 1 }}>
                {[...Array(2)].map((_, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="40%" height={16} />
                      <Skeleton variant="text" width="30%" height={12} sx={{ mt: 0.25 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Status Effects - Second column */}
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Status Effect Uptimes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Shows average status effect uptimes across friendly players
            </Typography>
            <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
              {[...Array(6)].map((_, index) => (
                <Box key={index} sx={{ py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Skeleton variant="rounded" width={32} height={32} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="70%" height={16} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Skeleton variant="text" width="30%" height={12} />
                        <Skeleton variant="text" width="20%" height={12} />
                      </Box>
                      <Skeleton variant="rectangular" width="100%" height={8} sx={{ mt: 1, borderRadius: 999 }} />
                    </Box>
                    <Skeleton variant="text" width="40%" height={14} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Buff Uptimes - Third column */}
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ mt: 2 }}>Buff Uptimes</Typography>
              <Skeleton variant="rounded" width={120} height={32} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Shows average buff uptimes across friendly players
            </Typography>
            <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
              {[...Array(6)].map((_, index) => (
                <Box key={index} sx={{ py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Skeleton variant="rounded" width={32} height={32} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="70%" height={16} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Skeleton variant="text" width="30%" height={12} />
                        <Skeleton variant="text" width="20%" height={12} />
                      </Box>
                      <Skeleton variant="rectangular" width="100%" height={8} sx={{ mt: 1, borderRadius: 999 }} />
                    </Box>
                    <Skeleton variant="text" width="40%" height={14} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Debuff Uptimes - Fourth column */}
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Debuff Uptimes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Shows average debuff uptimes against hostile targets
            </Typography>
            <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
              {[...Array(5)].map((_, index) => (
                <Box key={index} sx={{ py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Skeleton variant="rounded" width={32} height={32} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="70%" height={16} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Skeleton variant="text" width="30%" height={12} />
                        <Skeleton variant="text" width="20%" height={12} />
                      </Box>
                      <Skeleton variant="rectangular" width="100%" height={8} sx={{ mt: 1, borderRadius: 999 }} />
                    </Box>
                    <Skeleton variant="text" width="40%" height={14} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Damage Breakdown - Fifth column */}
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Damage Breakdown
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Total damage dealt by friendly players: <Skeleton variant="text" width="60px" sx={{ display: 'inline-block' }} />
            </Typography>
            <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
              {[...Array(8)].map((_, index) => (
                <Box key={index} sx={{ py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.25 }}>
                    <Skeleton variant="rounded" width={32} height={32} />
                    <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="rounded" width={60} height={16} sx={{ mb: 0.5 }} />
                          <Skeleton variant="text" width="80%" height={16} />
                        </Box>
                        <Skeleton variant="rounded" width={50} height={28} />
                      </Box>
                      <Box sx={{ mt: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Skeleton variant="text" width="40px" height={12} />
                          <Skeleton variant="text" width="50px" height={12} />
                          <Skeleton variant="text" width="40px" height={12} />
                          <Skeleton variant="text" width="30px" height={12} />
                        </Box>
                      </Box>
                      <Skeleton variant="rectangular" width="100%" height={8} sx={{ mt: 1, borderRadius: 999 }} />
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Damage by Type - Sixth column */}
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Damage by Type
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Damage breakdown by damage type from friendly players: <Skeleton variant="text" width="60px" sx={{ display: 'inline-block' }} />
            </Typography>
            <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
              {[...Array(6)].map((_, index) => (
                <Box key={index} sx={{ py: 1.5, pl: 0.5, pr: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <Box sx={{ width: '100%' }}>
                    <Box
                      sx={{
                        position: 'relative',
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                      }}
                    >
                      <Skeleton variant="rounded" width={32} height={32} />
                      <Box sx={{ flex: 1, minWidth: 0, ml: 1.5 }}>
                        <Skeleton variant="text" width="60%" height={16} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                          <Skeleton variant="text" width="40px" height={12} />
                          <Skeleton variant="text" width="40px" height={12} />
                        </Box>
                      </Box>
                      <Skeleton variant="text" width="40px" height={20} />
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Rotation Analysis - Full width */}
        <Box sx={{ flex: '1 1 100%', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Rotation Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Analysis of ability rotation patterns
            </Typography>
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 1 }} />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};