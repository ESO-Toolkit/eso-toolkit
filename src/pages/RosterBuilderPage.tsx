import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  PersonAdd as PersonAddIcon,
  Star as GearIcon,
} from '@mui/icons-material';
import {
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Autocomplete,
  Chip,
  Divider,
  Alert,
  Snackbar,
  FormControlLabel,
  Checkbox,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import React, { useState, useCallback } from 'react';

import { SetAssignmentManager } from '../components/SetAssignmentManager';
import {
  RaidRoster,
  TankSetup,
  HealerSetup,
  DDRequirement,
  DPSSlot,
  SupportUltimate,
  HealerBuff,
  CLASS_SKILL_LINES,
  SkillLineConfig,
  createDefaultRoster,
  defaultSkillLineConfig,
  RECOMMENDED_SETS,
  TANK_5PIECE_SETS,
  HEALER_5PIECE_SETS,
  FLEXIBLE_5PIECE_SETS,
  TANK_MONSTER_SETS,
  HEALER_MONSTER_SETS,
  FLEXIBLE_MONSTER_SETS,
  MONSTER_SETS,
  ALL_5PIECE_SETS,
  canAssignToFivePieceSlot,
  canAssignToMonsterSlot,
} from '../types/roster';

/**
 * Encode roster to base64 for URL sharing
 */
const encodeRosterToURL = (roster: RaidRoster): string => {
  try {
    const json = JSON.stringify(roster);
    const base64 = btoa(encodeURIComponent(json));
    return base64;
  } catch {
    // Failed to encode roster
    return '';
  }
};

/**
 * Decode roster from base64 URL
 */
const decodeRosterFromURL = (encoded: string): RaidRoster | null => {
  try {
    const json = decodeURIComponent(atob(encoded));
    const roster = JSON.parse(json) as RaidRoster;
    return roster;
  } catch {
    // Failed to decode roster
    return null;
  }
};

// Icon mappings for ESO abilities
const ULTIMATE_ICONS: Record<string, string> = {
  'Aggressive Warhorn': 'ability_ava_003_a',
  'Glacial Colossus': 'ability_necromancer_006_b',
  Barrier: 'ability_ava_006',
  'Greater Storm Atronach': 'ability_sorcerer_greater_storm_atronach',
};

const HEALER_BUFF_ICONS: Record<string, string> = {
  'Enlivening Overflow': 'ability_mage_065',
  'From the Brink': 'ability_mage_065',
};

const SKILL_LINE_ICONS: Record<string, string> = {
  // Dragonknight
  'Ardent Flame': 'ability_dragonknight_001', // Lava Whip
  'Draconic Power': 'ability_dragonknight_008', // Protective Scale
  'Earthen Heart': 'ability_dragonknight_007', // Spiked Armor

  // Sorcerer
  'Dark Magic': 'ability_sorcerer_mage_wraith', // Mages' Wrath
  'Daedric Summoning': 'ability_sorcerer_greater_storm_atronach',
  'Storm Calling': 'ability_sorcerer_endless_fury',

  // Nightblade
  Assassination: 'ability_nightblade_012', // Strife
  Shadow: 'ability_nightblade_012',
  Siphoning: 'ability_nightblade_012',

  // Templar
  'Aedric Spear': 'ability_templar_sun_fire',
  "Dawn's Wrath": 'ability_templar_sun_fire',
  'Restoring Light': 'ability_templar_sun_fire',

  // Warden
  'Animal Companions': 'ability_mage_065',
  'Green Balance': 'ability_mage_065',
  "Winter's Embrace": 'ability_mage_065',

  // Necromancer
  'Grave Lord': 'ability_necromancer_006_b', // Blastbones
  'Bone Tyrant': 'ability_necromancer_006_b',
  'Living Death': 'ability_necromancer_006_b',

  // Arcanist
  'Herald of the Tome': 'ability_mage_065',
  'Apocryphal Soldier': 'ability_mage_065',
  'Curative Runeforms': 'ability_mage_065',
};

/**
 * Get icon for ultimates
 */
const getUltimateIcon = (ultimate: string | undefined): React.ReactElement | null => {
  if (!ultimate) return null;
  const iconFile = ULTIMATE_ICONS[ultimate];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

/**
 * Get icon for healer buffs
 */
const getHealerBuffIcon = (buff: string | undefined): React.ReactElement | null => {
  if (!buff) return null;
  const iconFile = HEALER_BUFF_ICONS[buff];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

/**
 * Get icon for skill lines based on class
 */
const getSkillLineIcon = (skillLine: string): React.ReactElement | null => {
  const iconFile = SKILL_LINE_ICONS[skillLine];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

/**
 * Get 5-piece set options for tank role (set1/set2 slots only)
 */
const getTank5PieceSetOptions = (): readonly string[] => {
  const sets = new Set<string>();

  // Add recommended 5-piece sets (always run)
  (RECOMMENDED_SETS.filter(canAssignToFivePieceSlot) as readonly string[]).forEach((set) =>
    sets.add(set),
  );

  // Add tank-specific 5-piece sets
  TANK_5PIECE_SETS.forEach((set) => sets.add(set));

  // Add flexible 5-piece sets (can be run on tanks or healers)
  FLEXIBLE_5PIECE_SETS.forEach((set) => sets.add(set));

  return Array.from(sets).sort();
};

/**
 * Get monster set options for tank role (monsterSet slot only)
 */
const getTankMonsterSetOptions = (): readonly string[] => {
  const sets = new Set<string>();

  // Add recommended monster sets
  (RECOMMENDED_SETS.filter(canAssignToMonsterSlot) as readonly string[]).forEach((set) =>
    sets.add(set),
  );

  // Add tank-specific monster sets
  TANK_MONSTER_SETS.forEach((set) => sets.add(set));

  // Add flexible monster sets
  FLEXIBLE_MONSTER_SETS.forEach((set) => sets.add(set));

  return Array.from(sets).sort();
};

/**
 * Get 5-piece set options for healer role (set1/set2 slots only)
 */
const getHealer5PieceSetOptions = (): readonly string[] => {
  const sets = new Set<string>();

  // Add recommended 5-piece sets (always run)
  (RECOMMENDED_SETS.filter(canAssignToFivePieceSlot) as readonly string[]).forEach((set) =>
    sets.add(set),
  );

  // Add healer-specific 5-piece sets
  HEALER_5PIECE_SETS.forEach((set) => sets.add(set));

  // Add flexible 5-piece sets (can be run on tanks or healers)
  FLEXIBLE_5PIECE_SETS.forEach((set) => sets.add(set));

  return Array.from(sets).sort();
};

/**
 * Get monster set options for healer role (monsterSet slot only)
 */
const getHealerMonsterSetOptions = (): readonly string[] => {
  const sets = new Set<string>();

  // Add recommended monster sets
  (RECOMMENDED_SETS.filter(canAssignToMonsterSlot) as readonly string[]).forEach((set) =>
    sets.add(set),
  );

  // Add healer-specific monster sets
  HEALER_MONSTER_SETS.forEach((set) => sets.add(set));

  // Add flexible monster sets
  FLEXIBLE_MONSTER_SETS.forEach((set) => sets.add(set));

  return Array.from(sets).sort();
};

/**
 * Helper functions for type-safe set membership checks
 */
const isRecommendedSet = (setName: string): boolean => {
  return (RECOMMENDED_SETS as readonly string[]).includes(setName);
};

const isTank5PieceSet = (setName: string): boolean => {
  return (TANK_5PIECE_SETS as readonly string[]).includes(setName);
};

const isHealer5PieceSet = (setName: string): boolean => {
  return (HEALER_5PIECE_SETS as readonly string[]).includes(setName);
};

const isFlexible5PieceSet = (setName: string): boolean => {
  return (FLEXIBLE_5PIECE_SETS as readonly string[]).includes(setName);
};

const isMonsterSet = (setName: string): boolean => {
  return (MONSTER_SETS as readonly string[]).includes(setName);
};

/**
 * RosterBuilderPage - Allows raid leads to create and manage raid rosters
 * Includes tank/healer gear assignments, DD requirements, and ultimate assignments
 */
export const RosterBuilderPage: React.FC = () => {
  const [roster, setRoster] = useState<RaidRoster>(createDefaultRoster());
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [quickFillDialog, setQuickFillDialog] = useState(false);
  const [quickFillText, setQuickFillText] = useState('');

  // Load roster from URL on mount
  React.useEffect(() => {
    const hash = window.location.hash.substring(1); // Remove #
    if (hash) {
      const decoded = decodeRosterFromURL(hash);
      if (decoded) {
        setRoster(decoded);
        setSnackbar({
          open: true,
          message: 'Roster loaded from shared link!',
          severity: 'success',
        });
      }
    }
  }, []);

  // Generate shareable link
  const handleCopyLink = useCallback(() => {
    const encoded = encodeRosterToURL(roster);
    if (encoded) {
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setSnackbar({
            open: true,
            message: 'Shareable link copied to clipboard!',
            severity: 'success',
          });
        })
        .catch(() => {
          setSnackbar({ open: true, message: 'Failed to copy link', severity: 'error' });
        });
    }
  }, [roster]);

  // Update roster name
  const handleRosterNameChange = (name: string): void => {
    setRoster((prev) => ({
      ...prev,
      rosterName: name,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Update tank setup
  const handleTankChange = (tankNum: 1 | 2, updates: Partial<TankSetup>): void => {
    setRoster((prev) => ({
      ...prev,
      [`tank${tankNum}`]: {
        ...prev[`tank${tankNum}` as 'tank1' | 'tank2'],
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  // Update healer setup
  const handleHealerChange = (healerNum: 1 | 2, updates: Partial<HealerSetup>): void => {
    setRoster((prev) => ({
      ...prev,
      [`healer${healerNum}`]: {
        ...prev[`healer${healerNum}` as 'healer1' | 'healer2'],
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  // Add DD requirement - replaces the last available empty DPS slot
  const handleAddDDRequirement = (type: 'war-machine-mk' | 'zen-alkosh'): void => {
    setRoster((prev) => {
      // Find the last empty DPS slot (one without a player name)
      let emptySlotIndex = -1;
      for (let i = prev.dpsSlots.length - 1; i >= 0; i--) {
        const slot = prev.dpsSlots[i];
        if (slot && (!slot.playerName || slot.playerName.trim() === '')) {
          emptySlotIndex = i;
          break;
        }
      }

      // If we found an empty slot, replace it with a DD requirement
      if (emptySlotIndex !== -1) {
        const removedSlotNumber = prev.dpsSlots[emptySlotIndex].slotNumber;
        const updatedDpsSlots = [...prev.dpsSlots];
        updatedDpsSlots.splice(emptySlotIndex, 1); // Remove the empty slot

        return {
          ...prev,
          dpsSlots: updatedDpsSlots,
          ddRequirements: [
            ...prev.ddRequirements,
            {
              type,
              playerName: '',
              playerNumber: removedSlotNumber, // Assign the slot number from the removed slot
              skillLines: defaultSkillLineConfig(),
              notes: '',
            },
          ],
          updatedAt: new Date().toISOString(),
        };
      }

      // If no empty slots, find the next available number
      const usedNumbers = new Set([
        ...prev.dpsSlots.map((slot) => slot.slotNumber),
        ...prev.ddRequirements
          .map((req) => req.playerNumber)
          .filter((n): n is number => n !== undefined),
      ]);

      let nextNumber = 1;
      while (usedNumbers.has(nextNumber)) {
        nextNumber++;
      }

      return {
        ...prev,
        ddRequirements: [
          ...prev.ddRequirements,
          {
            type,
            playerName: '',
            playerNumber: nextNumber, // Assign the next available number
            skillLines: defaultSkillLineConfig(),
            notes: '',
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Update DD requirement
  const handleUpdateDDRequirement = (index: number, updates: Partial<DDRequirement>): void => {
    setRoster((prev) => ({
      ...prev,
      ddRequirements: prev.ddRequirements.map((req, i) =>
        i === index ? { ...req, ...updates } : req,
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Remove DD requirement - adds back an empty DPS slot
  const handleRemoveDDRequirement = (index: number): void => {
    setRoster((prev) => {
      // Calculate the next slot number based on existing DPS slots
      const maxSlotNumber = prev.dpsSlots.reduce((max, slot) => Math.max(max, slot.slotNumber), 0);
      const newSlot: DPSSlot = {
        slotNumber: maxSlotNumber + 1,
      };

      return {
        ...prev,
        dpsSlots: [...prev.dpsSlots, newSlot],
        ddRequirements: prev.ddRequirements.filter((_, i) => i !== index),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Export roster as JSON
  const handleExportJSON = useCallback(() => {
    const dataStr = JSON.stringify(roster, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `${roster.rosterName.replace(/\s+/g, '_')}_roster.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    setSnackbar({ open: true, message: 'Roster exported successfully!', severity: 'success' });
  }, [roster]);

  // Import roster from JSON
  const handleImportJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e): void => {
      try {
        const importedRoster = JSON.parse(e.target?.result as string) as RaidRoster;
        setRoster(importedRoster);
        setSnackbar({ open: true, message: 'Roster imported successfully!', severity: 'success' });
      } catch {
        setSnackbar({
          open: true,
          message: 'Failed to import roster. Invalid JSON file.',
          severity: 'error',
        });
      }
    };
    reader.readAsText(file);
  }, []);

  // Quick fill player names from text
  const handleQuickFill = useCallback((): void => {
    const lines = quickFillText
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    if (lines.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please enter at least one player name',
        severity: 'error',
      });
      return;
    }

    setRoster((prev) => {
      const updated = { ...prev };

      // Fill tanks first (up to 2)
      if (lines.length > 0 && lines[0]) updated.tank1.playerName = lines[0].trim();
      if (lines.length > 1 && lines[1]) updated.tank2.playerName = lines[1].trim();

      // Fill healers next (up to 2)
      if (lines.length > 2 && lines[2]) updated.healer1.playerName = lines[2].trim();
      if (lines.length > 3 && lines[3]) updated.healer2.playerName = lines[3].trim();

      // Fill DPS slots (up to 8)
      for (let i = 4; i < Math.min(lines.length, 12); i++) {
        const dpsIndex = i - 4;
        if (updated.dpsSlots[dpsIndex] && lines[i]) {
          updated.dpsSlots[dpsIndex].playerName = lines[i].trim();
        }
      }

      updated.updatedAt = new Date().toISOString();
      return updated;
    });

    setQuickFillDialog(false);
    setQuickFillText('');
    setSnackbar({
      open: true,
      message: `Filled ${Math.min(lines.length, 12)} player slots!`,
      severity: 'success',
    });
  }, [quickFillText]);

  // Copy Discord formatted roster to clipboard
  const handleCopyDiscordFormat = useCallback((): void => {
    const discordFormat = generateDiscordFormat(roster);
    navigator.clipboard
      .writeText(discordFormat)
      .then((): void => {
        setSnackbar({
          open: true,
          message: 'Discord format copied to clipboard!',
          severity: 'success',
        });
      })
      .catch((): void => {
        setSnackbar({ open: true, message: 'Failed to copy to clipboard.', severity: 'error' });
      });
  }, [roster]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Development Banner */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>🚧 Under Active Development</strong> - This Roster Builder tool is currently being
        developed and tested. Features may change, and some functionality may be incomplete. Please
        report any issues or suggestions!
      </Alert>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Roster Builder
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={() => setQuickFillDialog(true)}
            >
              Quick Fill
            </Button>
            <Button variant="outlined" startIcon={<UploadIcon />} component="label">
              Import
              <input type="file" hidden accept=".json" onChange={handleImportJSON} />
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportJSON}>
              Export JSON
            </Button>
            <Button variant="contained" startIcon={<CopyIcon />} onClick={handleCopyDiscordFormat}>
              Copy for Discord
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<LinkIcon />}
              onClick={handleCopyLink}
            >
              Copy Share Link
            </Button>
          </Stack>
        </Stack>

        <TextField
          fullWidth
          label="Roster Name"
          value={roster.rosterName}
          onChange={(e) => handleRosterNameChange(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Divider sx={{ my: 3 }} />

        {/* Player Groups Management */}
        <Typography variant="h5" gutterBottom>
          Player Groups
        </Typography>
        <Stack spacing={2} mb={3}>
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={roster.availableGroups}
            onChange={(_, value) =>
              setRoster((prev) => ({
                ...prev,
                availableGroups: value,
                updatedAt: new Date().toISOString(),
              }))
            }
            slotProps={{
              popper: {
                disablePortal: true,
              },
            }}
            ChipProps={{
              onMouseDown: (event) => {
                event.stopPropagation();
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Available Groups (e.g., Slayer Stack 1, Group A)"
                placeholder="Add group..."
                helperText="Create groups to organize players. Common examples: Slayer Stack 1, Slayer Stack 2, Group A, Group B"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...chipProps } = getTagProps({ index });
                return <Chip label={option} {...chipProps} key={key} />;
              })
            }
          />
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* Set Assignment Manager */}
        <SetAssignmentManager
          tank1={roster.tank1}
          tank2={roster.tank2}
          healer1={roster.healer1}
          healer2={roster.healer2}
          onAssignSet={(setName, role, slot) => {
            if (role === 'tank1' || role === 'tank2') {
              const tankNum = role === 'tank1' ? 1 : 2;
              const currentTank = roster[role];
              const slotKey = slot === 'set1' ? 'set1' : slot === 'set2' ? 'set2' : 'monsterSet';
              handleTankChange(tankNum, {
                gearSets: {
                  ...currentTank.gearSets,
                  [slotKey]: setName,
                },
              });
            } else if (role === 'healer1' || role === 'healer2') {
              const healerNum = role === 'healer1' ? 1 : 2;
              const slotKey = slot === 'set1' ? 'set1' : slot === 'set2' ? 'set2' : 'monsterSet';
              handleHealerChange(healerNum, {
                [slotKey]: setName,
              });
            }
          }}
        />

        {/* Tanks Section */}
        <Typography variant="h5" gutterBottom>
          Tanks
        </Typography>
        <Stack spacing={2} mb={3}>
          {[1, 2].map((num) => (
            <TankCard
              key={num}
              tankNum={num as 1 | 2}
              tank={roster[`tank${num}` as 'tank1' | 'tank2']}
              onChange={(updates) => handleTankChange(num as 1 | 2, updates)}
              availableGroups={roster.availableGroups}
            />
          ))}
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* Healers Section */}
        <Typography variant="h5" gutterBottom>
          Healers
        </Typography>
        <Stack spacing={2} mb={3}>
          {[1, 2].map((num) => (
            <HealerCard
              key={num}
              healerNum={num as 1 | 2}
              healer={roster[`healer${num}` as 'healer1' | 'healer2']}
              onChange={(updates) => handleHealerChange(num as 1 | 2, updates)}
              availableGroups={roster.availableGroups}
              usedBuffs={
                [roster.healer1.healerBuff, roster.healer2.healerBuff].filter(
                  Boolean,
                ) as HealerBuff[]
              }
            />
          ))}
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* DPS Slots Section */}
        <Typography variant="h5" gutterBottom>
          DPS Roster (8 Slots)
        </Typography>
        <Stack spacing={1.5} mb={3}>
          {roster.dpsSlots.map((slot, index) => (
            <DPSSlotCard
              key={slot.slotNumber}
              slot={slot}
              availableGroups={roster.availableGroups}
              onChange={(updates) => {
                const updatedSlots = [...roster.dpsSlots];
                updatedSlots[index] = { ...updatedSlots[index], ...updates };
                setRoster((prev) => ({
                  ...prev,
                  dpsSlots: updatedSlots,
                  updatedAt: new Date().toISOString(),
                }));
              }}
            />
          ))}
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* DD Requirements Section */}
        <Typography variant="h5" gutterBottom>
          Damage Dealer Requirements
        </Typography>
        <Stack spacing={2} mb={2}>
          {roster.ddRequirements.map((req, index) => (
            <DDRequirementCard
              key={index}
              requirement={req}
              availableGroups={roster.availableGroups}
              onChange={(updates) => handleUpdateDDRequirement(index, updates)}
              onRemove={() => handleRemoveDDRequirement(index)}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleAddDDRequirement('war-machine-mk')}
          >
            Add War Machine + MK DD
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleAddDDRequirement('zen-alkosh')}
          >
            Add Zen + Alkosh DD
          </Button>
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* General Notes */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="General Notes"
          value={roster.notes || ''}
          onChange={(e) =>
            setRoster((prev) => ({
              ...prev,
              notes: e.target.value,
              updatedAt: new Date().toISOString(),
            }))
          }
        />
      </Paper>

      {/* Quick Fill Dialog */}
      <Dialog
        open={quickFillDialog}
        onClose={() => setQuickFillDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Quick Fill Player Names</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter player names, one per line. The first 2 will fill tanks, next 2 will fill healers,
            and remaining will fill DPS slots (up to 8 total DPS).
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={12}
            fullWidth
            variant="outlined"
            placeholder={'Player1\nPlayer2\nPlayer3\n...'}
            value={quickFillText}
            onChange={(e) => setQuickFillText(e.target.value)}
            helperText={`${quickFillText.split('\n').filter((line) => line.trim()).length} players entered`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickFillDialog(false)}>Cancel</Button>
          <Button onClick={handleQuickFill} variant="contained">
            Fill Roster
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Tank Card Component
interface TankCardProps {
  tankNum: 1 | 2;
  tank: TankSetup;
  onChange: (updates: Partial<TankSetup>) => void;
  availableGroups: string[];
}

const TankCard: React.FC<TankCardProps> = ({ tankNum, tank, onChange, availableGroups }) => {
  const availableUltimates = Object.values(SupportUltimate);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tank {tankNum}
        </Typography>
        <Stack spacing={2}>
          {/* Essential Fields - Always Visible */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <TextField
                fullWidth
                label="Player Name"
                value={tank.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
                placeholder="Enter player name"
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 150 }}>
              <Autocomplete
                freeSolo
                options={availableGroups}
                value={tank.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="Group" placeholder="e.g., Left Stack" />
                )}
              />
            </Box>
          </Box>

          {/* Gear Sets */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getTank5PieceSetOptions()}
                value={tank.gearSets.set1}
                onChange={(_, value) =>
                  onChange({ gearSets: { ...tank.gearSets, set1: value || '' } })
                }
                groupBy={(option) => {
                  if (isRecommendedSet(option)) return '⭐ Recommended (Always Run)';
                  if (isTank5PieceSet(option)) return 'Tank Sets';
                  if (isFlexible5PieceSet(option)) return 'Flexible (Tank/Healer)';
                  return 'Other';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Set 1 (5-piece)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    {isRecommendedSet(option) && '⭐ '}
                    {option}
                  </li>
                )}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getTank5PieceSetOptions()}
                value={tank.gearSets.set2}
                onChange={(_, value) =>
                  onChange({ gearSets: { ...tank.gearSets, set2: value || '' } })
                }
                groupBy={(option) => {
                  if (isRecommendedSet(option)) return '⭐ Recommended (Always Run)';
                  if (isTank5PieceSet(option)) return 'Tank Sets';
                  if (isFlexible5PieceSet(option)) return 'Flexible (Tank/Healer)';
                  return 'Other';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Set 2 (5-piece)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    {isRecommendedSet(option) && '⭐ '}
                    {option}
                  </li>
                )}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getTankMonsterSetOptions()}
                value={tank.gearSets.monsterSet || ''}
                onChange={(_, value) =>
                  onChange({ gearSets: { ...tank.gearSets, monsterSet: value || '' } })
                }
                groupBy={(option) => {
                  if (isRecommendedSet(option)) return '⭐ Recommended (Always Run)';
                  return 'Monster Sets';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Monster/Mythic Set"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    {isRecommendedSet(option) && '⭐ '}
                    {option}
                  </li>
                )}
              />
            </Box>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Ultimate</InputLabel>
            <Select
              value={tank.ultimate || ''}
              onChange={(e) => onChange({ ultimate: (e.target.value as SupportUltimate) || null })}
              label="Ultimate"
              renderValue={(value) => (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getUltimateIcon(value)}
                  {value || <em>None</em>}
                </Box>
              )}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {availableUltimates.map((ult) => (
                <MenuItem key={ult} value={ult}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getUltimateIcon(ult)}
                    {ult}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Advanced Options - Collapsible */}
          <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" color="text.secondary">
                Advanced Options
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {/* Role Label and Notes */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 30%', minWidth: 120 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Label"
                      placeholder={tankNum === 1 ? 'MT' : 'OT'}
                      value={tank.roleLabel || ''}
                      onChange={(e) => onChange({ roleLabel: e.target.value })}
                      helperText="e.g., MT, OT"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 65%', minWidth: 200 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Notes"
                      placeholder="e.g., TOMB 1A, Portal Group"
                      value={tank.roleNotes || ''}
                      onChange={(e) => onChange({ roleNotes: e.target.value })}
                    />
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Player Number"
                  value={tank.playerNumber || ''}
                  onChange={(e) =>
                    onChange({
                      playerNumber: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  helperText="Optional identifier"
                />

                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[...ALL_5PIECE_SETS, ...MONSTER_SETS]}
                  value={tank.gearSets.additionalSets || []}
                  onChange={(_, value) =>
                    onChange({
                      gearSets: { ...tank.gearSets, additionalSets: value },
                    })
                  }
                  groupBy={(option) => {
                    if (isRecommendedSet(option)) return '⭐ Recommended';
                    if (isTank5PieceSet(option)) return 'Tank 5-Piece Sets';
                    if (isFlexible5PieceSet(option)) return 'Flexible 5-Piece';
                    if (isMonsterSet(option)) return 'Monster Sets';
                    return 'Other';
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Additional Sets"
                      helperText="e.g., monster sets, arena weapons"
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      {isRecommendedSet(option) && '⭐ '}
                      {option}
                    </li>
                  )}
                />

                {/* Skill Lines Section */}
                <Divider textAlign="left">
                  <Chip label="Skill Lines" size="small" />
                </Divider>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tank.skillLines.isFlex}
                      onChange={(e) =>
                        onChange({
                          skillLines: { ...tank.skillLines, isFlex: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Flexible (any skill lines)"
                />
                {!tank.skillLines.isFlex && (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES]}
                        value={tank.skillLines.line1}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...tank.skillLines, line1: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 1" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES]}
                        value={tank.skillLines.line2}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...tank.skillLines, line2: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 2" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES]}
                        value={tank.skillLines.line3}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...tank.skillLines, line3: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 3" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                  </Box>
                )}

                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[]}
                  value={tank.specificSkills}
                  onChange={(_, value) => onChange({ specificSkills: value })}
                  slotProps={{
                    popper: {
                      disablePortal: true,
                    },
                  }}
                  ChipProps={{
                    onMouseDown: (event) => {
                      event.stopPropagation();
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Specific Skills Required"
                      placeholder="Add skill..."
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...chipProps } = getTagProps({ index });
                      return <Chip label={option} {...chipProps} key={key} size="small" />;
                    })
                  }
                />

                <TextField
                  fullWidth
                  multiline
                  size="small"
                  rows={2}
                  label="Notes"
                  value={tank.notes || ''}
                  onChange={(e) => onChange({ notes: e.target.value })}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  );
};

// Healer Card Component
interface HealerCardProps {
  healerNum: 1 | 2;
  healer: HealerSetup;
  onChange: (updates: Partial<HealerSetup>) => void;
  availableGroups: string[];
  usedBuffs: HealerBuff[];
}

const HealerCard: React.FC<HealerCardProps> = ({
  healerNum,
  healer,
  onChange,
  availableGroups,
  usedBuffs,
}) => {
  const availableBuffs = Object.values(HealerBuff).filter(
    (buff) => !usedBuffs.includes(buff) || healer.healerBuff === buff,
  );
  const availableUltimates = Object.values(SupportUltimate);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Healer {healerNum}
        </Typography>
        <Stack spacing={2}>
          {/* Essential Fields - Always Visible */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <TextField
                fullWidth
                label="Player Name (Optional)"
                value={healer.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={availableGroups}
                value={healer.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => <TextField {...params} label="Group" />}
              />
            </Box>
          </Box>

          {/* Gear Sets */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getHealer5PieceSetOptions()}
                value={healer.set1}
                onChange={(_, value) => onChange({ set1: value || '' })}
                groupBy={(option) => {
                  if (isRecommendedSet(option)) return '⭐ Recommended (Always Run)';
                  if (isHealer5PieceSet(option)) return 'Healer Sets';
                  if (isFlexible5PieceSet(option)) return 'Flexible (Tank/Healer)';
                  return 'Other';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Set 1 (5-piece)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    {isRecommendedSet(option) && '⭐ '}
                    {option}
                  </li>
                )}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getHealer5PieceSetOptions()}
                value={healer.set2}
                onChange={(_, value) => onChange({ set2: value || '' })}
                groupBy={(option) => {
                  if (isRecommendedSet(option)) return '⭐ Recommended (Always Run)';
                  if (isHealer5PieceSet(option)) return 'Healer Sets';
                  if (isFlexible5PieceSet(option)) return 'Flexible (Tank/Healer)';
                  return 'Other';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Set 2 (5-piece)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    {isRecommendedSet(option) && '⭐ '}
                    {option}
                  </li>
                )}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getHealerMonsterSetOptions()}
                value={healer.monsterSet || ''}
                onChange={(_, value) => onChange({ monsterSet: value || '' })}
                groupBy={(option) => {
                  if (isRecommendedSet(option)) return '⭐ Recommended (Always Run)';
                  return 'Monster Sets';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Monster/Mythic Set"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    {isRecommendedSet(option) && '⭐ '}
                    {option}
                  </li>
                )}
              />
            </Box>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Champion Points</InputLabel>
            <Select
              value={healer.healerBuff || ''}
              onChange={(e) => onChange({ healerBuff: (e.target.value as HealerBuff) || null })}
              label="Champion Points"
              renderValue={(value) => (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getHealerBuffIcon(value)}
                  {value || <em>None</em>}
                </Box>
              )}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {availableBuffs.map((buff) => (
                <MenuItem key={buff} value={buff}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getHealerBuffIcon(buff)}
                    {buff}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Ultimate</InputLabel>
            <Select
              value={healer.ultimate || ''}
              onChange={(e) => onChange({ ultimate: (e.target.value as SupportUltimate) || null })}
              label="Ultimate"
              renderValue={(value) => (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getUltimateIcon(value)}
                  {value || <em>None</em>}
                </Box>
              )}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {availableUltimates.map((ult) => (
                <MenuItem key={ult} value={ult}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getUltimateIcon(ult)}
                    {ult}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Advanced Options - Collapsible */}
          <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" color="text.secondary">
                Advanced Options
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {/* Role Label and Notes */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 30%', minWidth: 120 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Label"
                      placeholder={`H${healerNum}`}
                      value={healer.roleLabel || ''}
                      onChange={(e) => onChange({ roleLabel: e.target.value })}
                      helperText="e.g., H1, H2"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 65%', minWidth: 200 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Notes"
                      placeholder="e.g., TOMB HEALER, TOMB 1B"
                      value={healer.roleNotes || ''}
                      onChange={(e) => onChange({ roleNotes: e.target.value })}
                    />
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Player Number"
                  value={healer.playerNumber || ''}
                  onChange={(e) =>
                    onChange({
                      playerNumber: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  helperText="Optional identifier"
                />

                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[...ALL_5PIECE_SETS, ...MONSTER_SETS]}
                  value={healer.additionalSets || []}
                  onChange={(_, value) => onChange({ additionalSets: value })}
                  groupBy={(option) => {
                    if (isRecommendedSet(option)) return '⭐ Recommended';
                    if (isHealer5PieceSet(option)) return 'Healer 5-Piece Sets';
                    if (isFlexible5PieceSet(option)) return 'Flexible 5-Piece';
                    if (isMonsterSet(option)) return 'Monster Sets';
                    return 'Other';
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Additional Sets"
                      helperText="e.g., monster sets, mythics"
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      {isRecommendedSet(option) && '⭐ '}
                      {option}
                    </li>
                  )}
                />

                {/* Skill Lines Section */}
                <Divider textAlign="left">
                  <Chip label="Skill Lines" size="small" />
                </Divider>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={healer.skillLines.isFlex}
                      onChange={(e) =>
                        onChange({
                          skillLines: { ...healer.skillLines, isFlex: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Flexible (any skill lines)"
                />
                {!healer.skillLines.isFlex && (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES]}
                        value={healer.skillLines.line1}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...healer.skillLines, line1: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 1" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES]}
                        value={healer.skillLines.line2}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...healer.skillLines, line2: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 2" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES]}
                        value={healer.skillLines.line3}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...healer.skillLines, line3: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 3" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                  </Box>
                )}

                <TextField
                  fullWidth
                  multiline
                  size="small"
                  rows={2}
                  label="Notes"
                  value={healer.notes || ''}
                  onChange={(e) => onChange({ notes: e.target.value })}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  );
};

// DPS Slot Card Component
interface DPSSlotCardProps {
  slot: DPSSlot;
  availableGroups: string[];
  onChange: (updates: Partial<DPSSlot>) => void;
}

const DPSSlotCard: React.FC<DPSSlotCardProps> = ({ slot, availableGroups, onChange }) => {
  return (
    <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          DPS {slot.slotNumber}
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 40%', minWidth: 180 }}>
              <TextField
                fullWidth
                size="small"
                label="Player Name"
                value={slot.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 25%', minWidth: 150 }}>
              <TextField
                fullWidth
                size="small"
                label="Role Notes"
                placeholder="e.g., Portal L, Z'en"
                value={slot.roleNotes || ''}
                onChange={(e) => onChange({ roleNotes: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 25%', minWidth: 120 }}>
              <Autocomplete
                freeSolo
                size="small"
                options={availableGroups}
                value={slot.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => <TextField {...params} label="Group" />}
              />
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

// DD Requirement Card Component
interface DDRequirementCardProps {
  requirement: DDRequirement;
  availableGroups: string[];
  onChange: (updates: Partial<DDRequirement>) => void;
  onRemove: () => void;
}

const DDRequirementCard: React.FC<DDRequirementCardProps> = ({
  requirement,
  availableGroups,
  onChange,
  onRemove,
}) => {
  const title =
    requirement.type === 'war-machine-mk'
      ? 'War Machine + Martial Knowledge DD'
      : "Zen's Redress + Alkosh DD";

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onRemove} color="error">
            <DeleteIcon />
          </IconButton>
        </Stack>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <TextField
                fullWidth
                label="Player Name (Optional)"
                value={requirement.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 20%', minWidth: 100 }}>
              <TextField
                fullWidth
                type="number"
                label="Player #"
                value={requirement.playerNumber || ''}
                onChange={(e) =>
                  onChange({
                    playerNumber: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                helperText="Optional ID"
              />
            </Box>
            <Box sx={{ flex: '1 1 25%', minWidth: 150 }}>
              <Autocomplete
                freeSolo
                options={availableGroups}
                value={requirement.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => <TextField {...params} label="Group" />}
              />
            </Box>
          </Box>

          {/* Skill Lines Section */}
          <Divider textAlign="left">
            <Chip label="Skill Lines" size="small" />
          </Divider>
          <FormControlLabel
            control={
              <Checkbox
                checked={requirement.skillLines.isFlex}
                onChange={(e) =>
                  onChange({
                    skillLines: { ...requirement.skillLines, isFlex: e.target.checked },
                  })
                }
              />
            }
            label="Flexible (any skill lines)"
          />
          {!requirement.skillLines.isFlex && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                <Autocomplete
                  freeSolo
                  options={[...CLASS_SKILL_LINES]}
                  value={requirement.skillLines.line1}
                  onChange={(_, value) =>
                    onChange({
                      skillLines: { ...requirement.skillLines, line1: value || '' },
                    })
                  }
                  renderInput={(params) => <TextField {...params} label="Skill Line 1" required />}
                />
              </Box>
              <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                <Autocomplete
                  freeSolo
                  options={[...CLASS_SKILL_LINES]}
                  value={requirement.skillLines.line2}
                  onChange={(_, value) =>
                    onChange({
                      skillLines: { ...requirement.skillLines, line2: value || '' },
                    })
                  }
                  renderInput={(params) => <TextField {...params} label="Skill Line 2" required />}
                />
              </Box>
              <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                <Autocomplete
                  freeSolo
                  options={[...CLASS_SKILL_LINES]}
                  value={requirement.skillLines.line3}
                  onChange={(_, value) =>
                    onChange({
                      skillLines: { ...requirement.skillLines, line3: value || '' },
                    })
                  }
                  renderInput={(params) => <TextField {...params} label="Skill Line 3" required />}
                />
              </Box>
            </Box>
          )}

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Notes"
            value={requirement.notes || ''}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

// Generate Discord formatted text
const generateDiscordFormat = (roster: RaidRoster): string => {
  const lines: string[] = [];

  lines.push(`**${roster.rosterName}**`);
  lines.push('');

  // Helper to format ultimate in brackets
  const formatUlt = (ult: SupportUltimate | null): string => {
    if (!ult) return '';
    const names: Record<SupportUltimate, string> = {
      [SupportUltimate.WARHORN]: 'Aggressive Warhorn',
      [SupportUltimate.COLOSSUS]: 'Glacial Colossus',
      [SupportUltimate.BARRIER]: 'Barrier',
      [SupportUltimate.ATRONACH]: 'Greater Storm Atronach',
    };
    return ` [${names[ult]}]`;
  };

  // Helper to format healer buff
  const formatBuff = (buff: HealerBuff | null): string => {
    if (!buff) return '';
    const names: Record<HealerBuff, string> = {
      [HealerBuff.ENLIVENING_OVERFLOW]: 'Enlivening Overflow',
      [HealerBuff.FROM_THE_BRINK]: 'From the Brink',
    };
    return names[buff];
  };

  // Helper to format skill lines compactly (returns empty string if nothing)
  const formatSkillLines = (skillLines: SkillLineConfig): string => {
    if (skillLines.isFlex) return 'Flexible';
    const lines = [skillLines.line1, skillLines.line2, skillLines.line3].filter(Boolean);
    return lines.join('/');
  };

  // Helper to format gear sets (returns empty string if no sets)
  const formatGearSets = (
    tank?: { set1: string; set2: string; monsterSet?: string; additionalSets?: string[] },
    healer?: { set1: string; set2: string; monsterSet?: string; additionalSets?: string[] },
  ): string => {
    const sets: string[] = [];
    if (tank) {
      if (tank.set1) sets.push(tank.set1);
      if (tank.set2) sets.push(tank.set2);
      if (tank.monsterSet) sets.push(tank.monsterSet);
      if (tank.additionalSets) sets.push(...tank.additionalSets.filter(Boolean));
    }
    if (healer) {
      if (healer.set1) sets.push(healer.set1);
      if (healer.set2) sets.push(healer.set2);
      if (healer.monsterSet) sets.push(healer.monsterSet);
      if (healer.additionalSets) sets.push(...healer.additionalSets.filter(Boolean));
    }
    return sets.filter(Boolean).join('/');
  };

  // Tanks - always MT/OT
  [1, 2].forEach((num) => {
    const tank = roster[`tank${num}` as 'tank1' | 'tank2'];
    const label = num === 1 ? 'MT' : 'OT';
    const roleNote = tank.roleNotes ? ` [${tank.roleNotes}]` : '';
    const playerName = tank.playerName ? ` ${tank.playerName}` : '';

    lines.push(`${label}${roleNote}:${playerName}`);
    const gearSets = formatGearSets(tank.gearSets);
    if (gearSets) lines.push(gearSets);
    const skillLines = formatSkillLines(tank.skillLines);
    const ult = formatUlt(tank.ultimate);
    if (skillLines || ult) lines.push(`${skillLines}${ult}`);
    if (tank.notes) lines.push(`Notes: ${tank.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // Healers
  [roster.healer1, roster.healer2].forEach((h, index) => {
    const label = h.roleLabel || (index === 0 ? 'H1' : 'H2');
    const roleNote = h.roleNotes ? ` [${h.roleNotes}]` : '';
    const playerName = h.playerName ? ` ${h.playerName}` : '';
    const groupName = h.group?.groupName ? ` (${h.group.groupName})` : '';

    lines.push(`${label}${roleNote}:${playerName}${groupName}`);
    const gearSets = formatGearSets(undefined, h);
    if (gearSets) lines.push(gearSets);
    const buff = formatBuff(h.healerBuff);
    if (buff) lines.push(buff);
    const skillLines = formatSkillLines(h.skillLines);
    const ult = formatUlt(h.ultimate);
    if (skillLines || ult) lines.push(`${skillLines}${ult}`);
    if (h.notes) lines.push(`Notes: ${h.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // DPS - combine regular slots and DD requirements
  interface DDEntry {
    number: number;
    playerName?: string;
    roleNotes?: string;
    groupName?: string;
    type?: 'war-machine-mk' | 'zen-alkosh';
    skillLines?: SkillLineConfig;
  }

  const allDDs: DDEntry[] = [];

  // Add regular DPS slots
  roster.dpsSlots.forEach((slot) => {
    allDDs.push({
      number: slot.slotNumber,
      playerName: slot.playerName,
      roleNotes: slot.roleNotes,
      groupName: slot.group?.groupName,
    });
  });

  // Track used slot numbers from regular DPS slots and DD requirements
  const usedNumbers = new Set(roster.dpsSlots.map((slot) => slot.slotNumber));

  // Add DD requirements with proper numbering
  roster.ddRequirements.forEach((req) => {
    // Use the explicitly set playerNumber if available
    let ddNumber = req.playerNumber;

    // If no playerNumber is set, find the next available slot
    if (!ddNumber) {
      ddNumber = 1;
      while (usedNumbers.has(ddNumber)) {
        ddNumber++;
      }
    }

    usedNumbers.add(ddNumber);

    allDDs.push({
      number: ddNumber,
      playerName: req.playerName,
      roleNotes: req.notes,
      groupName: req.group?.groupName,
      type: req.type,
      skillLines: req.skillLines,
    });
  });

  // Check if any DDs have groups assigned
  const hasGroups = allDDs.some((dd) => dd.groupName);

  if (hasGroups) {
    // Group DDs by their group
    const groupedDDs = new Map<string, DDEntry[]>();

    allDDs.forEach((dd) => {
      const group = dd.groupName || 'Unassigned';
      if (!groupedDDs.has(group)) {
        groupedDDs.set(group, []);
      }
      groupedDDs.get(group)!.push(dd);
    });

    // Print each group
    groupedDDs.forEach((dds, groupName) => {
      lines.push(groupName);
      dds.forEach((dd) => {
        const roleNote = dd.roleNotes ? ` [${dd.roleNotes}]` : '';
        const playerName = dd.playerName ? ` ${dd.playerName}` : '';
        const typeLabel = dd.type
          ? ` [${dd.type === 'war-machine-mk' ? 'MK/WM DK' : 'ZenKosh DK'}]`
          : '';
        lines.push(`${dd.number}${typeLabel}${roleNote}:${playerName}`);
        if (dd.skillLines) {
          const skillLines = formatSkillLines(dd.skillLines);
          if (skillLines) lines.push(skillLines);
        }
      });
      lines.push('');
    });
  } else {
    // No groups - print DDs sequentially
    allDDs.forEach((dd) => {
      const roleNote = dd.roleNotes ? ` [${dd.roleNotes}]` : '';
      const playerName = dd.playerName ? ` ${dd.playerName}` : '';
      const typeLabel = dd.type
        ? ` [${dd.type === 'war-machine-mk' ? 'MK/WM DK' : 'ZenKosh DK'}]`
        : '';
      lines.push(`${dd.number}${typeLabel}${roleNote}:${playerName}`);
      if (dd.skillLines) {
        const skillLines = formatSkillLines(dd.skillLines);
        if (skillLines) lines.push(skillLines);
      }
    });
    lines.push('');
  }

  // General Notes
  if (roster.notes) {
    lines.push('**General Notes:**');
    lines.push(roster.notes);
    lines.push('');
  }

  return lines.join('\n');
};
