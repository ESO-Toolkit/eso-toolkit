import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import ShieldIcon from '@mui/icons-material/Shield';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import React from 'react';

import type { SourcePayload } from '../types';

interface SourcesPanelProps {
  sources: SourcePayload;
}

const DOC_TYPE_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  build: { color: '#43a047', icon: <FitnessCenterIcon sx={{ fontSize: 14 }} />, label: 'Build' },
  gear: { color: '#ffb300', icon: <ShieldIcon sx={{ fontSize: 14 }} />, label: 'Gear' },
  mechanic: { color: '#42a5f5', icon: <SettingsIcon sx={{ fontSize: 14 }} />, label: 'Mechanic' },
  role: { color: '#ab47bc', icon: <FitnessCenterIcon sx={{ fontSize: 14 }} />, label: 'Role' },
  enchant: { color: '#ef5350', icon: <ShieldIcon sx={{ fontSize: 14 }} />, label: 'Enchant' },
};

const getDocConfig = (docType: string) =>
  DOC_TYPE_CONFIG[docType] ?? { color: '#78909c', icon: <MenuBookIcon sx={{ fontSize: 14 }} />, label: docType };

const CLASS_COLORS: Record<string, string> = {
  dragonknight: '#e05c00',
  sorcerer: '#00acc1',
  nightblade: '#e53935',
  templar: '#ffb300',
  warden: '#26a69a',
  necromancer: '#7c4dff',
  arcanist: '#43a047',
};

export const SourcesPanel: React.FC<SourcesPanelProps> = ({ sources }) => {
  const totalSources = sources.buildStats.length + sources.knowledgeDocs.length;

  if (totalSources === 0) return null;

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        mt: 1,
        bgcolor: (t: Theme) => alpha(t.palette.background.paper, 0.4),
        border: 1,
        borderColor: (t: Theme) => alpha(t.palette.divider, 0.08),
        borderRadius: '8px !important',
        backdropFilter: 'blur(8px)',
        '&::before': { display: 'none' },
        '& .MuiAccordionSummary-root': {
          minHeight: 36,
          py: 0,
        },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MenuBookIcon sx={{ fontSize: 14, opacity: 0.7 }} />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            Sources ({totalSources})
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
        {sources.knowledgeDocs.length > 0 && (
          <Stack spacing={0.75} sx={{ mb: sources.buildStats.length > 0 ? 1.5 : 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
              Knowledge Base
            </Typography>
            {sources.knowledgeDocs.map((d, i) => {
              const config = getDocConfig(d.docType);
              return (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 0.75,
                    pl: 1,
                    borderRadius: 1,
                    borderLeft: 3,
                    borderColor: config.color,
                    bgcolor: (t: Theme) => alpha(config.color, t.palette.mode === 'dark' ? 0.08 : 0.05),
                  }}
                >
                  <Box sx={{ color: config.color, display: 'flex', alignItems: 'center' }}>
                    {config.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem', display: 'block', lineHeight: 1.3 }} noWrap>
                      {d.title}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5, fontSize: '0.62rem' }}>
                      {config.label} · {(d.score * 100).toFixed(0)}% match
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}

        {sources.buildStats.length > 0 && (
          <Stack spacing={0.75}>
            <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
              Build Statistics
            </Typography>
            {sources.buildStats.map((s, i) => {
              const classColor = CLASS_COLORS[s.class.toLowerCase()] ?? '#78909c';
              return (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 0.75,
                    pl: 1,
                    borderRadius: 1,
                    borderLeft: 3,
                    borderColor: classColor,
                    bgcolor: (t: Theme) => alpha(classColor, t.palette.mode === 'dark' ? 0.08 : 0.05),
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem', display: 'block', lineHeight: 1.3 }} noWrap>
                      {s.weaponCombo}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5, fontSize: '0.62rem' }}>
                      {s.class} {s.role} · {s.usageCount} players · {s.avgParseScore.toLocaleString()} avg
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
