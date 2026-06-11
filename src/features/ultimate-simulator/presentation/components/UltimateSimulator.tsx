/**
 * Arcanist Ultimate Simulator — minimal first-pass UI.
 *
 * Editable inputs (fight length, Decisive weapon, MC runs, per-source uptime)
 * drive a live Monte Carlo aggregate. Results show the mean total ultimate, the
 * 95% confidence interval (so the estimate's precision is visible — the thing
 * the original 100-run sheet couldn't surface), ult/s, and a per-source split.
 */

import {
  Box,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import { DECISIVE_PROC_CHANCE, DecisiveQuality } from '../../shared/constants';
import { useUltimateSimulator } from '../useUltimateSimulator';

const QUALITY_OPTIONS: { value: DecisiveQuality; label: string }[] = [
  { value: 'fine', label: 'Fine (green)' },
  { value: 'superior', label: 'Superior (blue)' },
  { value: 'epic', label: 'Epic (purple)' },
  { value: 'legendary', label: 'Legendary (gold)' },
];

const fmt = (n: number, digits = 1): string =>
  n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

export interface UltimateSimulatorProps {
  className?: string;
}

export const UltimateSimulator: React.FC<UltimateSimulatorProps> = ({ className }) => {
  const sim = useUltimateSimulator();
  const { state, sources, result } = sim;

  React.useEffect(() => {
    document.title = 'Arcanist Ultimate Simulator | ESO Toolkit';
  }, []);

  return (
    <Container maxWidth="lg" className={className}>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Arcanist Ultimate Simulator
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Estimates ultimate generation for an Arcanist receiving realistic raid support, using a
          Monte Carlo over the Decisive trait&apos;s per-instance procs. Measured ESO Logs data is
          the source of truth; these defaults are calibrated to match it.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Inputs */}
          <Paper variant="outlined" sx={{ p: 3, flex: 1, minWidth: 0 }}>
            <Typography variant="h6" gutterBottom>
              Inputs
            </Typography>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Fight duration (seconds)"
                type="number"
                size="small"
                value={state.fightDurationSeconds}
                onChange={(e) => sim.setFightDuration(Number(e.target.value))}
                slotProps={{ htmlInput: { min: 1, step: 5 } }}
              />

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.decisiveEnabled}
                      onChange={(e) => sim.setDecisiveEnabled(e.target.checked)}
                    />
                  }
                  label="Decisive trait"
                />
                {state.decisiveEnabled && (
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel id="decisive-quality-label">Weapon quality</InputLabel>
                      <Select
                        labelId="decisive-quality-label"
                        label="Weapon quality"
                        value={state.decisiveQuality}
                        onChange={(e) =>
                          sim.setDecisiveQuality(e.target.value as DecisiveQuality)
                        }
                      >
                        {QUALITY_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label} — {(DECISIVE_PROC_CHANCE[opt.value] * 100).toFixed(1)}%
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Tooltip title="Two-handed weapons (incl. staves/bows) roll Decisive twice per ultimate-gain instance.">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={state.decisiveTwoHanded}
                            onChange={(e) => sim.setDecisiveTwoHanded(e.target.checked)}
                          />
                        }
                        label="Two-handed (rolls twice)"
                      />
                    </Tooltip>
                  </Stack>
                )}
              </Box>

              <TextField
                label="Monte Carlo runs"
                type="number"
                size="small"
                value={state.runs}
                onChange={(e) => sim.setRuns(Number(e.target.value))}
                slotProps={{ htmlInput: { min: 1, max: 100000, step: 1000 } }}
                helperText="More runs → tighter confidence interval."
              />

              <Divider textAlign="left">
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Source uptimes
                </Typography>
              </Divider>
              {sources.map((source) => (
                <Box key={source.id}>
                  <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                  >
                    <Typography variant="body2">{source.label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {Math.round(source.uptime * 100)}%
                    </Typography>
                  </Stack>
                  <Slider
                    size="small"
                    value={Math.round(source.uptime * 100)}
                    onChange={(_, v) => sim.setUptimeOverride(source.id, (v as number) / 100)}
                    min={0}
                    max={100}
                    aria-label={`${source.label} uptime`}
                  />
                  {source.note && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {source.note}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </Paper>

          {/* Results */}
          <Paper variant="outlined" sx={{ p: 3, flex: 1, minWidth: 0 }}>
            <Typography variant="h6" gutterBottom>
              Results
            </Typography>
            <Stack direction="row" spacing={4} sx={{ mt: 1, mb: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Mean total ultimate
                </Typography>
                <Typography variant="h4">{fmt(result.meanTotal, 1)}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  ± {fmt(result.ci95HalfWidth, 1)} (95% CI)
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Ultimate / second
                </Typography>
                <Typography variant="h4">{fmt(result.meanPerSecond, 2)}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  over {result.runs.toLocaleString()} runs
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={4} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Range: {fmt(result.minTotal, 0)}–{fmt(result.maxTotal, 0)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Std dev: {fmt(result.stdDevTotal, 1)}
              </Typography>
            </Stack>

            <Divider sx={{ my: 1 }} />
            <Table size="small" aria-label="per-source contribution">
              <TableHead>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Base</TableCell>
                  <TableCell align="right">Decisive</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.contributions.map((c) => (
                  <TableRow key={c.sourceId}>
                    <TableCell>{c.label}</TableCell>
                    <TableCell align="right">{fmt(c.baseUltimate, 0)}</TableCell>
                    <TableCell align="right">{fmt(c.decisiveUltimate, 1)}</TableCell>
                    <TableCell align="right">
                      {fmt(c.baseUltimate + c.decisiveUltimate, 1)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fmt(result.meanTotal - result.contributions.reduce((s, c) => s + c.decisiveUltimate, 0), 0)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fmt(result.contributions.reduce((s, c) => s + c.decisiveUltimate, 0), 1)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }} data-testid="grand-total">
                    {fmt(result.meanTotal, 1)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};
