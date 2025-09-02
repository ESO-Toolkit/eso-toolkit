import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { useReportMasterData } from '../../../hooks';
import { useSelectedFight } from '../../../hooks/useSelectedFight';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import { setSelectedTargetId } from '../../../store/ui/uiSlice';
import { useAppDispatch } from '../../../store/useAppDispatch';

const ALL_BOSSES_SENTINEL = 'ALL_BOSSES';

export const TargetSelector: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const fight = useSelectedFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const selectedTargetId = useSelector(selectSelectedTargetId);

  const handleTargetChange = React.useCallback(
    (event: SelectChangeEvent<string>): void => {
      const value = event.target.value;
      dispatch(setSelectedTargetId(value === ALL_BOSSES_SENTINEL ? null : Number(value)));
    },
    [dispatch]
  );

  const targetsList = React.useMemo(() => {
    if (!fight?.enemyNPCs) {
      return [];
    }

    const result = [];
    for (const npc of fight?.enemyNPCs) {
      if (!npc?.id) {
        continue;
      }

      const enemy = reportMasterData?.actorsById?.[npc.id];
      if (enemy) {
        result.push({
          id: enemy.id,
          name: enemy.name,
        });
      }
    }

    return result;
  }, [reportMasterData, fight?.enemyNPCs]);

  if (isMasterDataLoading) {
    return null;
  }

  if (!fight?.enemyNPCs?.length) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No players available for selection
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mb: 2,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 2,
          padding: '1px',
          background: isDarkMode
            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.4) 0%, rgba(147, 51, 234, 0.3) 50%, rgba(239, 68, 68, 0.2) 100%)'
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.2) 50%, rgba(236, 72, 153, 0.15) 100%)',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'xor',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          pointerEvents: 'none',
          opacity: 0.6,
          transition: 'opacity 0.3s ease',
        },
        '&:hover::before': {
          opacity: 1,
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          background: isDarkMode
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 50%, rgba(51, 65, 85, 0.7) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 50%, rgba(241, 245, 249, 0.85) 100%)',
          borderRadius: 2,
          border: isDarkMode
            ? '1px solid rgba(56, 189, 248, 0.2)'
            : '1px solid rgba(59, 130, 246, 0.15)',
          boxShadow: isDarkMode
            ? '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(56, 189, 248, 0.1)'
            : '0 2px 12px rgba(59, 130, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          overflow: 'visible',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: isDarkMode
              ? '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 40px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(56, 189, 248, 0.2)'
              : '0 4px 20px rgba(59, 130, 246, 0.15), 0 0 30px rgba(147, 51, 234, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          },
        }}
      >
        <FormControl
          fullWidth
          size="small"
          sx={{
            '& .MuiInputLabel-root': {
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: isDarkMode ? 'rgba(226, 232, 240, 0.8)' : 'rgba(51, 65, 85, 0.8)',
              transform: 'translate(16px, -6px) scale(0.75)',
              background: isDarkMode
                ? 'linear-gradient(90deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)'
                : 'linear-gradient(90deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
              padding: '0 8px',
              borderRadius: '6px',
              zIndex: 1,
              '&.Mui-focused': {
                color: isDarkMode ? '#38bdf8' : '#3b82f6',
              },
            },
            '& .MuiOutlinedInput-root': {
              background: 'transparent',
              borderRadius: 2,
              fontFamily: 'Inter, system-ui',
              fontWeight: 500,
              '& fieldset': {
                border: 'none',
              },
              '&:hover fieldset': {
                border: 'none',
              },
              '&.Mui-focused fieldset': {
                border: 'none',
              },
              '& .MuiSelect-select': {
                padding: '14px 16px',
                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                fontSize: '0.925rem',
                fontWeight: 500,
              },
              '& .MuiSelect-icon': {
                color: isDarkMode ? 'rgba(56, 189, 248, 0.7)' : 'rgba(59, 130, 246, 0.7)',
                transition: 'transform 0.2s ease, color 0.2s ease',
              },
              '&:hover .MuiSelect-icon': {
                color: isDarkMode ? '#38bdf8' : '#3b82f6',
                transform: 'scale(1.1)',
              },
            },
          }}
        >
          <InputLabel id="target-selector-label" shrink={true}>
            Target
          </InputLabel>
          <Select
            labelId="target-selector-label"
            value={selectedTargetId?.toString() || ALL_BOSSES_SENTINEL}
            label="Target"
            onChange={handleTargetChange}
            MenuProps={{
              PaperProps: {
                sx: {
                  mt: 1,
                  borderRadius: 2,
                  border: isDarkMode
                    ? '1px solid rgba(56, 189, 248, 0.2)'
                    : '1px solid rgba(59, 130, 246, 0.15)',
                  background: isDarkMode
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: isDarkMode
                    ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(56, 189, 248, 0.1)'
                    : '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 40px rgba(59, 130, 246, 0.06)',
                  '& .MuiMenuItem-root': {
                    fontFamily: 'Inter, system-ui',
                    fontWeight: 500,
                    color: isDarkMode ? '#e2e8f0' : '#1e293b',
                    transition: 'all 0.2s ease',
                    borderRadius: '6px',
                    margin: '2px 6px',
                    '&:hover': {
                      background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(147, 51, 234, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.08) 100%)',
                      color: isDarkMode ? '#38bdf8' : '#3b82f6',
                      transform: 'translateX(4px)',
                    },
                    '&.Mui-selected': {
                      background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(147, 51, 234, 0.2) 100%)'
                        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.12) 100%)',
                      color: isDarkMode ? '#38bdf8' : '#3b82f6',
                      fontWeight: 600,
                      '&:hover': {
                        background: isDarkMode
                          ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(147, 51, 234, 0.25) 100%)'
                          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.15) 100%)',
                      },
                    },
                  },
                },
              },
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
            }}
          >
            <MenuItem value={ALL_BOSSES_SENTINEL}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isDarkMode
                      ? 'linear-gradient(135deg, #38bdf8 0%, #9333ea 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)',
                    flexShrink: 0,
                  }}
                />
                All Bosses
              </Box>
            </MenuItem>
            {targetsList.map((target) => (
              <MenuItem key={target.id} value={target.id?.toString() || ''}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isDarkMode
                        ? 'linear-gradient(135deg, #22c55e 0%, #38bdf8 100%)'
                        : 'linear-gradient(135deg, #059669 0%, #3b82f6 100%)',
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Box sx={{ fontWeight: 600 }}>{target.name}</Box>
                    <Box
                      sx={{
                        fontSize: '0.75rem',
                        opacity: 0.7,
                        fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                      }}
                    >
                      ID: {target.id}
                    </Box>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};
