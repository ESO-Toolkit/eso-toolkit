/**
 * Setup List Component
 * Displays a list of all setups for the current trial/page
 */

import BoltIcon from '@mui/icons-material/Bolt';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useMemo, useState } from 'react';

import { getSkillById } from '../data/skillLineSkills';
import { LoadoutSetup, SkillBar } from '../types/loadout.types';
import {
  formatProgressSection,
  getSetupConditionSummary,
  getSetupProgressSections,
  getSetupTags,
  SetupProgressSection,
} from '../utils/setupDisplay';

const SKILL_SLOTS = [3, 4, 5, 6, 7];
const ULTIMATE_SLOT = 8;

const resolveAbilityIconUrl = (icon?: string): string | null => {
  if (!icon) return null;
  if (/^https?:\/\//.test(icon)) {
    return icon;
  }

  const sanitized = icon.replace(/\.(dds|png)$/i, '');
  return `https://eso-hub.com/storage/icons/${sanitized}.png`;
};

interface SetupListProps {
  setups: LoadoutSetup[];
  selectedIndex: number | null;
  filterText: string;
  onOpenDetails: (index: number) => void;
  onDuplicateSetup: (index: number) => void;
  onDeleteSetup: (index: number) => void;
  onCopySetup: (index: number) => void;
}

export const SetupList: React.FC<SetupListProps> = ({
  setups,
  selectedIndex,
  filterText,
  onOpenDetails,
  onDuplicateSetup,
  onDeleteSetup,
  onCopySetup,
}) => {
  const normalizedFilter = filterText.trim().toLowerCase();
  const filtered = useMemo(() => {
    return setups
      .map((setup, index) => ({ setup, index }))
      .filter(({ setup }) => {
        if (!normalizedFilter) return true;
        const tags = getSetupTags(setup).
          map((tag) => tag.label.toLowerCase()).join(' ');
        const condition = getSetupConditionSummary(setup)?.toLowerCase() ?? '';
        const progress = getSetupProgressSections(setup)
          .map((section) => formatProgressSection(section).toLowerCase())
          .join(' ');
        const haystack = `${setup.name.toLowerCase()} ${tags} ${condition} ${progress}`;
        return haystack.includes(normalizedFilter);
      });
  }, [setups, normalizedFilter]);

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <Box
        sx={(theme) => ({
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.6 : 0.9),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        })}
      >
        <Typography variant="overline" sx={{ letterSpacing: 0.8 }} color="text.secondary">
          Loadout Library
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {filtered.length} shown · {setups.length} total
        </Typography>
      </Box>

      <List disablePadding>
        {filtered.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              px: 2,
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>No matching setups</Typography>
            <Typography variant="caption">Adjust filters or create a new loadout.</Typography>
          </Box>
        ) : (
          filtered.map(({ setup, index }) => (
            <LoadoutRow
              key={`${setup.name}-${index}`}
              setup={setup}
              index={index}
              displayIndex={index + 1}
              selected={selectedIndex === index}
              onOpenDetails={onOpenDetails}
              onDuplicate={onDuplicateSetup}
              onDelete={onDeleteSetup}
              onCopy={onCopySetup}
            />
          ))
        )}
      </List>
    </Paper>
  );
};

interface LoadoutRowProps {
  setup: LoadoutSetup;
  index: number;
  displayIndex: number;
  selected: boolean;
  onOpenDetails: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onCopy: (index: number) => void;
}

const LoadoutRow: React.FC<LoadoutRowProps> = ({
  setup,
  index,
  displayIndex,
  selected,
  onOpenDetails,
  onDuplicate,
  onDelete,
  onCopy,
}) => {
  const tags = getSetupTags(setup);
  const conditionSummary = getSetupConditionSummary(setup);
  const progressSections = getSetupProgressSections(setup);
  const displayId = displayIndex.toString().padStart(2, '0');

  return (
    <ListItem disableGutters sx={{ px: 1.5, py: 1 }}>
      <Paper
        variant="outlined"
        sx={(theme) => ({
          width: '100%',
          px: 1.25,
          py: 1,
          borderRadius: 2,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 1,
          borderColor: selected
            ? alpha(theme.palette.primary.main, 0.6)
            : theme.palette.divider,
          backgroundColor: selected
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.12)
            : alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.9 : 0.98),
          opacity: setup.disabled ? 0.6 : 1,
          position: 'relative',
        })}
      >
        <Stack spacing={0.65} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <BadgeBox selected={selected}>{displayId}</BadgeBox>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {setup.name}
              </Typography>
              {conditionSummary && (
                <Typography variant="caption" color="text.secondary">
                  {conditionSummary}
                </Typography>
              )}
              {tags.length > 0 && (
                <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                  {tags.map((tag, idx) => (
                    <Chip
                      key={`${tag.label}-${idx}`}
                      label={tag.label}
                      size="small"
                      color={tag.color}
                      variant={tag.variant ?? 'filled'}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>

          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            <SkillStrip bar={setup.skills?.[0]} label="Front" />
            <SkillStrip bar={setup.skills?.[1]} label="Back" />
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
            {progressSections.length === 0 ? (
              <Chip label="Empty" size="small" variant="outlined" />
            ) : (
              progressSections.map((section, idx) => (
                <ProgressBadge key={`${section.type}-${idx}`} section={section} />
              ))
            )}
          </Stack>
        </Stack>

        <Stack
          spacing={0.5}
          alignItems="center"
          sx={{
            justifySelf: 'end',
            alignSelf: 'stretch',
            justifyContent: 'center',
          }}
        >
          <Tooltip title="Open details" arrow>
            <IconButton size="small" onClick={() => onOpenDetails(index)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy to clipboard" arrow>
            <IconButton size="small" onClick={() => onCopy(index)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Duplicate" arrow>
            <IconButton size="small" onClick={() => onDuplicate(index)}>
              <FileCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete" arrow>
            <IconButton size="small" color="error" onClick={() => onDelete(index)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
    </ListItem>
  );
};

const BadgeBox: React.FC<{ selected: boolean; children: React.ReactNode }> = ({ selected, children }) => (
  <Box
    sx={(theme) => ({
      width: 36,
      height: 36,
      borderRadius: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: '0.85rem',
      letterSpacing: 0.6,
      flexShrink: 0,
      color: selected ? theme.palette.primary.contrastText : theme.palette.primary.main,
      backgroundColor: selected
        ? theme.palette.primary.main
        : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.15),
    })}
  >
    {children}
  </Box>
);

const SkillStrip: React.FC<{ bar?: SkillBar; label: string }> = ({ bar, label }) => (
  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        width: 44,
        flexShrink: 0,
        fontWeight: 600,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Typography>
    <Stack direction="row" spacing={0.6} useFlexGap alignItems="center">
      {SKILL_SLOTS.map((slot) => (
        <AbilityIcon key={slot} abilityId={bar?.[slot]} size={32} />
      ))}
      <DividerStub />
      <AbilityIcon abilityId={bar?.[ULTIMATE_SLOT]} size={32} highlight />
    </Stack>
  </Stack>
);

const DividerStub: React.FC = () => (
  <Box
    sx={{
      width: 2,
      height: 30,
      borderRadius: 1,
      backgroundColor: 'divider',
      opacity: 0.5,
    }}
  />
);

const AbilityIcon: React.FC<{ abilityId?: number; size: number; highlight?: boolean }> = ({
  abilityId,
  size,
  highlight = false,
}) => {
  const skill = abilityId ? getSkillById(abilityId) : undefined;

  const iconUrl = resolveAbilityIconUrl(skill?.icon);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [iconUrl]);

  return (
    <Tooltip title={skill?.name ?? 'Empty slot'} arrow>
      <Box
        sx={(theme) => ({
          width: size,
          height: size,
          borderRadius: 1.5,
          border: `1px solid ${highlight ? theme.palette.warning.main : theme.palette.divider}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: abilityId
            ? alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.75 : 1)
            : alpha(theme.palette.action.disabledBackground, 0.3),
        })}
      >
        {iconUrl && !loadFailed ? (
          <Box
            component="img"
            src={iconUrl}
            alt={skill?.name ?? 'Empty slot'}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            --
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

const ProgressBadge: React.FC<{ section: SetupProgressSection }> = ({ section }) => {
  const label = formatProgressSection(section);

  return (
    <Tooltip title={label} arrow>
      <Box
        sx={(theme) => {
          const colorMap: Record<SetupProgressSection['type'], string> = {
            skills: theme.palette.primary.main,
            cp: theme.palette.secondary.main,
            food: theme.palette.success.main,
            gear: theme.palette.info.main,
          };
          const color = colorMap[section.type] ?? theme.palette.text.secondary;
          return {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.35,
            px: 0.75,
            py: 0.35,
            borderRadius: 999,
            fontSize: '0.68rem',
            fontWeight: 600,
            letterSpacing: 0.35,
            textTransform: 'uppercase',
            color,
            backgroundColor: alpha(color, theme.palette.mode === 'dark' ? 0.28 : 0.12),
          };
        }}
      >
        {getProgressIcon(section.type)}
        {section.type !== 'food' ? section.count : null}
      </Box>
    </Tooltip>
  );
};

const getProgressIcon = (type: SetupProgressSection['type']): React.ReactElement => {
  switch (type) {
    case 'skills':
      return <BoltIcon fontSize="inherit" />;
    case 'cp':
      return <PsychologyIcon fontSize="inherit" />;
    case 'food':
      return <RestaurantIcon fontSize="inherit" />;
    case 'gear':
      return <CheckroomIcon fontSize="inherit" />;
    default:
      return <HelpOutlineIcon fontSize="inherit" />;
  }
};
