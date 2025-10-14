/**
 * Presentational components for scribing simulation
 * Pure components that receive props and render UI
 */

import { Refresh as RefreshIcon, Share as ShareIcon } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Button,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Paper,
} from '@mui/material';
import React from 'react';

import type { ScribingSimulationResponse } from '../../shared/types';

export interface ScriptSelectorProps {
  label: string;
  value: string;
  options: Array<{ id: string; name: string; description: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export const ScriptSelector: React.FC<ScriptSelectorProps> = ({
  label,
  value,
  options,
  onChange,
  disabled = false,
  error,
}) => (
  <FormControl fullWidth disabled={disabled} error={!!error}>
    <InputLabel>{label}</InputLabel>
    <Select value={value} onChange={(e) => onChange(e.target.value)} label={label}>
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {options.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          <Box>
            <Typography variant="body1">{option.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {option.description}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
    {error && (
      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
        {error}
      </Typography>
    )}
  </FormControl>
);

export interface SimulationResultDisplayProps {
  result: ScribingSimulationResponse | null;
  isSimulating: boolean;
  error?: string | null;
}

export const SimulationResultDisplay: React.FC<SimulationResultDisplayProps> = ({
  result,
  isSimulating,
  error,
}) => {
  if (isSimulating) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Calculating skill properties...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="body1">Simulation Error</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
            Select a grimoire and click simulate to see results
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!result.isValid) {
    return (
      <Alert severity="warning">
        <Typography variant="body1">Invalid Combination</Typography>
        {result.errors?.map((error, index) => (
          <Typography key={index} variant="body2">
            • {error}
          </Typography>
        ))}
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {result.calculatedSkill.name}
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          {result.calculatedSkill.description}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={2}>
          {/* Combination Details */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Scribing Combination
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={`Grimoire: ${result.combination.grimoire}`}
                color="primary"
                variant="outlined"
              />
              {result.combination.focusScript && (
                <Chip
                  label={`Focus: ${result.combination.focusScript}`}
                  color="secondary"
                  variant="outlined"
                />
              )}
              {result.combination.signatureScript && (
                <Chip
                  label={`Signature: ${result.combination.signatureScript}`}
                  color="info"
                  variant="outlined"
                />
              )}
              {result.combination.affixScript && (
                <Chip
                  label={`Affix: ${result.combination.affixScript}`}
                  color="success"
                  variant="outlined"
                />
              )}
            </Stack>
          </Paper>

          {/* Skill Properties */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Skill Properties
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Resource Type:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {result.calculatedSkill.resourceType}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Cost:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {result.calculatedSkill.cost}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Cast Time:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {(result.calculatedSkill.castTime / 1000).toFixed(1)}s
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Range:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {result.calculatedSkill.range}m
                </Typography>
              </Box>
              {result.calculatedSkill.duration && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Duration:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {(result.calculatedSkill.duration / 1000).toFixed(1)}s
                  </Typography>
                </Box>
              )}
              {result.calculatedSkill.damage && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Damage:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {result.calculatedSkill.damage.amount} ({result.calculatedSkill.damage.type})
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Effects */}
          {result.calculatedSkill.effects.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Effects
              </Typography>
              <Stack spacing={1}>
                {result.calculatedSkill.effects.map((effect, index) => (
                  <Typography key={index} variant="body2">
                    • {effect}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export interface SimulationControlsProps {
  onSimulate: () => void;
  onShare?: () => void;
  isSimulating: boolean;
  disabled?: boolean;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  onSimulate,
  onShare,
  isSimulating,
  disabled = false,
}) => (
  <Stack direction="row" spacing={2} justifyContent="center">
    <Button
      variant="contained"
      startIcon={<RefreshIcon />}
      onClick={onSimulate}
      disabled={disabled || isSimulating}
    >
      {isSimulating ? 'Calculating...' : 'Simulate Skill'}
    </Button>
    {onShare && (
      <Button variant="outlined" startIcon={<ShareIcon />} onClick={onShare} disabled={disabled}>
        Share Configuration
      </Button>
    )}
  </Stack>
);
