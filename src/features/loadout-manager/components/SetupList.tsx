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
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* Compact header */}
      <Box
        sx={(theme) => ({
          px: 1.5,
          py: 0.75,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: alpha(
            theme.palette.background.paper,
            theme.palette.mode === 'dark' ? 0.6 : 0.9,
          ),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        })}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}
          color="text.secondary"
        >
          Setups
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {filtered.length}/{setups.length}
        </Typography>
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
              {i < filtered.length - 1 && <Divider />}
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
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 1.5,
          py: 1,
          cursor: 'pointer',
          transition: 'background-color 0.15s',
          opacity: setup.disabled ? 0.55 : 1,
          backgroundColor: selected
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1)
            : 'transparent',
          borderLeft: selected
            ? `3px solid ${theme.palette.primary.main}`
            : '3px solid transparent',
          '&:hover': {
            backgroundColor: selected
              ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.14)
              : alpha(theme.palette.action.hover, 0.06),
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
          sx={{ flexShrink: 0, opacity: 0.6, '&:hover': { opacity: 1 } }}
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
        slotProps={{ paper: { sx: { minWidth: 160 } } }}
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
    sx={(theme) => ({
      width: 30,
      height: 30,
      borderRadius: 1,
      display: 'flex',
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
        sx={(theme) => ({
          width: size,
          height: size,
          borderRadius: 1,
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
            component="img"
            src={iconUrl}
            alt={skill?.name ?? 'Empty slot'}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.55rem' }}>
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
            gap: 0.25,
            px: 0.5,
            py: 0.15,
            borderRadius: 999,
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            color,
            backgroundColor: alpha(color, theme.palette.mode === 'dark' ? 0.22 : 0.1),
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
