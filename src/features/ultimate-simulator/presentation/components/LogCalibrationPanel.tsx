/**
 * "Verify against your own log" panel — the calibration feature surfaced in the UI.
 *
 * Paste an ESO Logs report code, pick a boss fight + player, and the panel
 * measures that player's REAL ultimate generation from the log (conservation /
 * snapshot method) and compares it to the model's current ult/sec. Measurement
 * is total-only — ESO Logs does not expose per-source ultimate gains (see
 * calibration.ts) — so it validates the headline number, not the breakdown.
 */

import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import { useLogCalibration } from '../useLogCalibration';

const fmt = (n: number, digits = 2): string =>
  Number.isFinite(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '—';

export interface LogCalibrationPanelProps {
  /** The model's current modeled ult/sec, for the side-by-side comparison. */
  modeledPerSecond: number;
}

export const LogCalibrationPanel: React.FC<LogCalibrationPanelProps> = ({ modeledPerSecond }) => {
  const theme = useTheme();
  const cal = useLogCalibration();
  const accent = theme.palette.mode === 'dark' ? 'rgb(56, 189, 248)' : 'rgb(40, 145, 200)';

  const m = cal.measurement;
  // How far the MODEL is from the MEASURED log rate, as a fraction of the
  // measured rate (the measured value is the reference — "the model is X% vs
  // measured"). Guard measured-zero to avoid divide-by-zero / Infinity.
  const delta = m && m.perSecond > 0 ? (modeledPerSecond - m.perSecond) / m.perSecond : null;
  const deltaPct = delta != null ? Math.round(delta * 100) : null;

  return (
    <Accordion
      variant="outlined"
      disableGutters
      sx={{ borderRadius: 3, '&:before': { display: 'none' }, overflow: 'hidden' }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Verify against your own log
          </Typography>
          <Chip label="beta" size="small" sx={{ height: 18, fontSize: 10 }} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Measure your real ultimate generation from an ESO Logs report and compare it to the model.
          (Total ult/s only — logs don&apos;t record per-source ultimate gains.)
        </Typography>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5, mb: 2 }}>
          <TextField
            label="Report code or URL"
            size="small"
            value={cal.reportCode}
            onChange={(e) => cal.setReportCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void cal.loadReport();
            }}
            placeholder="e.g. kZAvqFwYcRTLB97W"
            sx={{ flex: 1, minWidth: 220 }}
            disabled={cal.phase === 'loadingReport' || cal.phase === 'measuring'}
          />
          <Button
            variant="contained"
            onClick={() => void cal.loadReport()}
            disabled={!cal.ready || cal.phase === 'loadingReport' || cal.phase === 'measuring'}
            sx={{ textTransform: 'none' }}
          >
            {cal.phase === 'loadingReport' ? <CircularProgress size={20} /> : 'Load report'}
          </Button>
        </Stack>

        {!cal.ready && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Connecting to ESO Logs… try again in a moment if Load report is disabled.
          </Alert>
        )}
        {cal.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {cal.error}
          </Alert>
        )}

        {(cal.phase === 'reportLoaded' ||
          cal.phase === 'measuring' ||
          cal.phase === 'measured') && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
              <FormControl size="small" sx={{ minWidth: 220, flex: 1 }}>
                <InputLabel id="cal-fight-label">Fight</InputLabel>
                <Select
                  labelId="cal-fight-label"
                  label="Fight"
                  value={cal.selectedFightId ?? ''}
                  onChange={(e) => cal.setFight(Number(e.target.value))}
                >
                  {cal.fights.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.kill ? '✓ ' : ''}
                      {f.name} — {Math.floor(f.durationSeconds / 60)}m {f.durationSeconds % 60}s
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel id="cal-player-label">Player</InputLabel>
                <Select
                  labelId="cal-player-label"
                  label="Player"
                  value={cal.selectedPlayerId ?? ''}
                  onChange={(e) => cal.setPlayer(Number(e.target.value))}
                >
                  {cal.players.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} ({p.subType})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={() => void cal.measure()}
                disabled={cal.phase === 'measuring' || cal.selectedPlayerId == null}
                sx={{ textTransform: 'none' }}
              >
                {cal.phase === 'measuring' ? <CircularProgress size={20} /> : 'Measure'}
              </Button>
            </Stack>

            {m && cal.phase === 'measured' && (
              <Box
                sx={{
                  borderRadius: 2,
                  p: 2,
                  background:
                    theme.palette.mode === 'dark'
                      ? 'rgba(56,189,248,0.06)'
                      : 'rgba(40,145,200,0.05)',
                }}
              >
                {m.samples === 0 ? (
                  <Alert severity="warning">
                    No ultimate snapshots were recorded for {m.playerName} in this fight. ESO Logs
                    only snapshots some actors — try a different player (ideally one who cast their
                    ultimate during the fight).
                  </Alert>
                ) : (
                  <>
                    <Stack
                      direction="row"
                      spacing={4}
                      sx={{ flexWrap: 'wrap', rowGap: 2, mb: 1.5 }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Measured ({m.playerName})
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: accent }}>
                          {fmt(m.perSecond)} ult/s
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {Math.round(m.totalGenerated)} generated · {m.approxCasts} casts
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Modeled (current build)
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {fmt(modeledPerSecond)} ult/s
                        </Typography>
                        {deltaPct != null && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            model is {deltaPct >= 0 ? '+' : ''}
                            {deltaPct}% vs measured
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    {m.hitCap && (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        This player hit the 500 ultimate cap during the fight, so the measured value
                        is a lower bound (overcapped ultimate isn&apos;t visible in logs).
                      </Alert>
                    )}
                    {deltaPct != null && Math.abs(deltaPct) <= 15 && !m.hitCap && (
                      <Alert severity="success">
                        Within {Math.abs(deltaPct)}% — the model matches this log well. Differences
                        come from your real uptimes vs the toggles above.
                      </Alert>
                    )}
                    {deltaPct != null && Math.abs(deltaPct) > 15 && !m.hitCap && (
                      <Alert severity="info">
                        {Math.abs(deltaPct)}% apart. Tune the source toggles/uptimes to match this
                        player&apos;s actual build (e.g. whether they ran Minor Heroism), then the
                        numbers should converge.
                      </Alert>
                    )}
                  </>
                )}
              </Box>
            )}

            <Button
              size="small"
              variant="text"
              onClick={cal.clear}
              sx={{ alignSelf: 'flex-start' }}
            >
              Clear
            </Button>
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
