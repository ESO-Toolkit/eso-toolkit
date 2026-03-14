/**
 * Setup List Component
 * Compact, scannable list of setups with hover-to-reveal actions.
 *
 * UX improvements:
 * - Clickable rows with clear left-border selected state
 * - Actions in a context menu (⋮) instead of always-visible icon columns
 * - Front+back bar skill strips shown in list for density
 * - Smaller badges, tighter spacing
 */

import BoltIcon from '@mui/icons-material/Bolt';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import {
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
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
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const normalizedFilter = filterText.trim().toLowerCase();
  const filtered = useMemo(() => {
    return setups
      .map((setup, index) => ({ setup, index }))
      .filter(({ setup }) => {
        if (!normalizedFilter) return true;
        const tags = getSetupTags(setup)
          .map((tag) => tag.label.toLowerCase())
          .join(' ');
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
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        width: '100%',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      {/* Compact header */}
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            background: isDarkMode
              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Setups
        </Typography>
        <Box
          sx={{
            px: 0.75,
            py: 0.15,
            borderRadius: '999px',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: '0.65rem', fontWeight: 600 }}
          >
            {filtered.length}/{setups.length}
          </Typography>
        </Box>
      </Box>

      {/* List */}
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, px: 2, color: 'text.secondary' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              No matching setups
            </Typography>
            <Typography variant="caption">Adjust filters or create a new loadout.</Typography>
          </Box>
        ) : (
          filtered.map(({ setup, index }, i) => (
            <React.Fragment key={`${setup.name}-${index}`}>
              <LoadoutRow
                setup={setup}
                index={index}
                displayIndex={index + 1}
                selected={selectedIndex === index}
                onOpenDetails={onOpenDetails}
                onDuplicate={onDuplicateSetup}
                onDelete={onDeleteSetup}
                onCopy={onCopySetup}
              />
              {i < filtered.length - 1 && (
                <Box
                  sx={{
                    height: '1px',
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    mx: 1.5,
                  }}
                />
              )}
            </React.Fragment>
          ))
        )}
      </Box>
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
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const conditionSummary = getSetupConditionSummary(setup);
  const progressSections = getSetupProgressSections(setup);
  const displayId = displayIndex.toString().padStart(2, '0');

  // Context-menu state
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = (): void => {
    setMenuAnchor(null);
  };

  return (
    <>
      <Box
        onClick={() => onOpenDetails(index)}
        sx={(theme: Theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 1.5,
          py: 1,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          opacity: setup.disabled ? 0.55 : 1,
          backgroundColor: selected
            ? isDarkMode
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)'
            : 'transparent',
          borderLeft: selected
            ? `3px solid ${theme.palette.primary.main}`
            : '3px solid transparent',
          '&:hover': {
            backgroundColor: selected
              ? isDarkMode
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.05)'
              : isDarkMode
                ? 'rgba(255,255,255,0.03)'
                : 'rgba(0,0,0,0.02)',
          },
        })}
      >
        {/* Badge */}
        <BadgeBox selected={selected}>{displayId}</BadgeBox>

        {/* Content */}
        <Stack spacing={0.4} sx={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: name + condition */}
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
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
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                · {conditionSummary}
              </Typography>
            )}
          </Stack>

          {/* Row 2: compact skill bars (front + back) */}
          <Stack spacing={0.25}>
            <SkillStrip bar={setup.skills?.[0]} label="F" />
            <SkillStrip bar={setup.skills?.[1]} label="B" />
          </Stack>

          {/* Row 3: progress indicators */}
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ flexWrap: 'wrap', rowGap: 0.3 }}
          >
            {progressSections.length === 0 ? (
              <Typography variant="caption" color="text.disabled">
                Empty
              </Typography>
            ) : (
              progressSections.map((section, idx) => (
                <ProgressBadge key={`${section.type}-${idx}`} section={section} />
              ))
            )}
          </Stack>
        </Stack>

        {/* Actions: single "more" button */}
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          sx={{
            flexShrink: 0,
            opacity: 0.5,
            borderRadius: '8px',
            transition: 'all 0.15s ease',
            '&:hover': {
              opacity: 1,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: (theme: Theme) => ({
              minWidth: 160,
              borderRadius: '10px',
              backdropFilter: 'blur(12px)',
              backgroundColor:
                theme.palette.mode === 'dark' ? 'rgba(20,20,30,0.92)' : 'rgba(255,255,255,0.94)',
              border: `1px solid ${
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
              }`,
            }),
          },
        }}
      >
        <MenuItem
          onClick={() => {
            onCopy(index);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onDuplicate(index);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <FileCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            onDelete(index);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

const BadgeBox: React.FC<{ selected: boolean; children: React.ReactNode }> = ({
  selected,
  children,
}) => (
  <Box
    sx={(theme: Theme) => ({
      width: 30,
      height: 30,
      borderRadius: '8px',
      display: 'flex',
      border: selected
        ? 'none'
        : `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.2)}`,
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: '0.75rem',
      letterSpacing: 0.4,
      flexShrink: 0,
      color: selected ? theme.palette.primary.contrastText : theme.palette.primary.main,
      backgroundColor: selected
        ? theme.palette.primary.main
        : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.25 : 0.12),
    })}
  >
    {children}
  </Box>
);

const SkillStrip: React.FC<{ bar?: SkillBar; label: string }> = ({ bar, label }) => (
  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        width: 14,
        flexShrink: 0,
        fontWeight: 700,
        fontSize: '0.6rem',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Typography>
    <Stack direction="row" spacing={0.4} useFlexGap alignItems="center">
      {SKILL_SLOTS.map((slot) => (
        <AbilityIcon key={slot} abilityId={bar?.[slot]} size={24} />
      ))}
      <DividerStub />
      <AbilityIcon abilityId={bar?.[ULTIMATE_SLOT]} size={24} highlight />
    </Stack>
  </Stack>
);

const DividerStub: React.FC = () => (
  <Box
    sx={{
      width: 1.5,
      height: 20,
      borderRadius: 1,
      backgroundColor: 'divider',
      opacity: 0.4,
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
        sx={(theme: Theme) => ({
          width: size,
          height: size,
          borderRadius: '6px',
          border: `1px solid ${highlight ? theme.palette.warning.main : theme.palette.divider}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: abilityId
            ? alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.75 : 1)
            : alpha(theme.palette.action.disabledBackground, 0.25),
        })}
      >
        {iconUrl && !loadFailed ? (
          <Box
            component={"img" as React.ElementType}
            src={iconUrl}
            alt={skill?.name ?? 'Empty slot'}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <Box
            sx={{
              width: '55%',
              height: 1.5,
              borderRadius: 1,
              backgroundColor: 'divider',
              opacity: 0.35,
            }}
          />
        )}
      </Box>
    </Tooltip>
  );
};

const ProgressBadge: React.FC<{ section: SetupProgressSection }> = ({ section }) => {
  const label = formatProgressSection(section);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const colorMap: Record<SetupProgressSection['type'], string> = {
    skills: theme.palette.primary.main,
    cp: theme.palette.secondary.main,
    food: theme.palette.success.main,
    gear: theme.palette.info.main,
  };
  const iconColor = colorMap[section.type] ?? theme.palette.text.secondary;

  const foodLabel =
    section.type === 'food' && section.label
      ? section.label.length > 14
        ? `${section.label.slice(0, 13)}…`
        : section.label
      : null;

  return (
    <Tooltip title={label} arrow>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.25,
          px: 0.5,
          py: 0.25,
          borderRadius: 999,
          fontSize: '0.6rem',
          fontWeight: 600,
          letterSpacing: 0.3,
          color: 'text.secondary',
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          '& .MuiSvgIcon-root': { color: iconColor },
        }}
      >
        {getProgressIcon(section.type)}
        {section.type === 'food' ? foodLabel : section.count}
      </Box>
    </Tooltip>
  );
};

const getProgressIcon = (type: SetupProgressSection['type']): React.ReactElement => {
  const sx = { fontSize: '0.7rem' };
  switch (type) {
    case 'skills':
      return <BoltIcon sx={sx} />;
    case 'cp':
      return <PsychologyIcon sx={sx} />;
    case 'food':
      return <RestaurantIcon sx={sx} />;
    case 'gear':
      return <CheckroomIcon sx={sx} />;
    default:
      return <HelpOutlineIcon sx={sx} />;
  }
};
