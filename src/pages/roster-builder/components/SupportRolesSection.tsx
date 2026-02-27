/**
 * Support Roles Section Component
 * Displays tanks and healers in role-colored sections
 */

import { Box, Stack, Typography, Divider, Paper } from '@mui/material';
import React from 'react';

import { TankSetup, HealerSetup } from '../../../types/roster';
import { getRoleColorSolid } from '../../../utils/roleColors';
import { TankCard } from './cards/TankCard';
import { HealerCard } from './cards/HealerCard';
import { validateTank, validateHealer } from '../utils/rosterValidation';

interface SupportRolesSectionProps {
  tank1: TankSetup;
  tank2: TankSetup;
  healer1: HealerSetup;
  healer2: HealerSetup;
  availableGroups: string[];
  usedBuffs: HealerSetup['healerBuff'][];
  onTankChange: (tankNum: 1 | 2, updates: Partial<TankSetup>) => void;
  onHealerChange: (healerNum: 1 | 2, updates: Partial<HealerSetup>) => void;
}

export const SupportRolesSection: React.FC<SupportRolesSectionProps> = ({
  tank1,
  tank2,
  healer1,
  healer2,
  availableGroups,
  usedBuffs,
  onTankChange,
  onHealerChange,
}) => {
  const themeMode = 'dark'; // Could get from theme context

  const tank1Warnings = validateTank(tank1, 1);
  const tank2Warnings = validateTank(tank2, 2);
  const healer1Warnings = validateHealer(healer1, 1);
  const healer2Warnings = validateHealer(healer2, 2);

  const hasTankWarnings = tank1Warnings.length > 0 || tank2Warnings.length > 0;
  const hasHealerWarnings = healer1Warnings.length > 0 || healer2Warnings.length > 0;

  const tankColor = getRoleColorSolid('tank', themeMode);
  const healerColor = getRoleColorSolid('healer', themeMode);

  return (
    <Paper
      elevation={2}
      sx={{
        mb: 3,
        borderLeft: `4px solid ${tankColor}`,
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: tankColor }}>
          Support Roles
        </Typography>

        {/* Tanks Section */}
        <Box
          sx={{
            mb: 3,
            pb: 2,
            borderBottom: `1px solid ${tankColor}`,
          }}
        >
          <Typography variant="subtitle1" gutterBottom sx={{ color: tankColor }}>
            Tanks
          </Typography>
          <Stack spacing={2}>
            <TankCard
              tankNum={1}
              tank={tank1}
              onChange={(updates) => onTankChange(1, updates)}
              availableGroups={availableGroups}
            />
            <TankCard
              tankNum={2}
              tank={tank2}
              onChange={(updates) => onTankChange(2, updates)}
              availableGroups={availableGroups}
            />
          </Stack>
          {hasTankWarnings && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
              {tank1Warnings.length + tank2Warnings.length} gear compatibility warning(s)
            </Typography>
          )}
        </Box>

        {/* Healers Section */}
        <Box
          sx={{
            pb: 2,
          }}
        >
          <Typography variant="subtitle1" gutterBottom sx={{ color: healerColor }}>
            Healers
          </Typography>
          <Stack spacing={2}>
            <HealerCard
              healerNum={1}
              healer={healer1}
              onChange={(updates) => onHealerChange(1, updates)}
              availableGroups={availableGroups}
              usedBuffs={usedBuffs}
            />
            <HealerCard
              healerNum={2}
              healer={healer2}
              onChange={(updates) => onHealerChange(2, updates)}
              availableGroups={availableGroups}
              usedBuffs={usedBuffs}
            />
          </Stack>
          {hasHealerWarnings && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
              {healer1Warnings.length + healer2Warnings.length} gear compatibility warning(s)
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
