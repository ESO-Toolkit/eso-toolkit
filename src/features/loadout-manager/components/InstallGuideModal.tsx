/**
 * Install guide — teaches a user how to get their loadouts into the game, and
 * hands new users a blank starter SavedVariables file keyed to their account.
 *
 * The headline message is BACK UP FIRST: dropping a file into SavedVariables
 * overwrites whatever the addon had there. The blank starter is explicitly for
 * users who don't have the addon's data yet (or want a clean reset).
 */

import { Download, FolderOpen, Warning } from '@mui/icons-material';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';

import { downloadTextFile } from '../utils/downloadFile';
import {
  generateBlankAlphaGearLua,
  generateBlankWizardWardrobeLua,
  normalizeAccountName,
  type LoadoutAddonFormat,
} from '../utils/loadoutLuaFiles';

interface InstallGuideModalProps {
  open: boolean;
  onClose: () => void;
  /** Prefill for the account-name field (the signed-in ESO Logs name, if any). */
  defaultAccountName?: string;
}

const SAVED_VARS_WINDOWS = 'Documents\\Elder Scrolls Online\\live\\SavedVariables\\';
const SAVED_VARS_MAC = '~/Documents/Elder Scrolls Online/live/SavedVariables/';

interface AddonGuide {
  key: LoadoutAddonFormat;
  label: string;
  filename: string;
  esouiUrl: string;
  /** Addon-specific final step (e.g. WW's account-wide toggle). */
  finalNote?: string;
  generateBlank: (accountName: string) => { filename: string; contents: string };
}

const ADDONS: AddonGuide[] = [
  {
    key: 'wizards-wardrobe',
    label: "Wizard's Wardrobe",
    filename: 'WizardsWardrobe.lua',
    esouiUrl: 'https://www.esoui.com/downloads/info2817-WizardsWardrobe.html',
    finalNote:
      'Open Wizard’s Wardrobe and switch the character/account selector to “Account-Wide” to see loadouts exported from here.',
    generateBlank: generateBlankWizardWardrobeLua,
  },
  {
    key: 'alphagear',
    label: 'AlphaGear 2',
    filename: 'AlphaGear.lua',
    esouiUrl:
      'https://www.esoui.com/downloads/info751-AlphaGear-2Setschangegearandskillswithsetnumbers.html',
    generateBlank: generateBlankAlphaGearLua,
  },
];

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  open,
  onClose,
  defaultAccountName,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [accountName, setAccountName] = useState(defaultAccountName ?? '');

  // Keep the prefill in sync if the signed-in user resolves after first render.
  React.useEffect(() => {
    if (defaultAccountName) setAccountName((prev) => prev || defaultAccountName);
  }, [defaultAccountName]);

  const addon = ADDONS[tab];
  const normalized = normalizeAccountName(accountName);

  const handleDownloadBlank = (): void => {
    const file = addon.generateBlank(normalized);
    downloadTextFile(file.filename, file.contents);
  };

  const codeStyle: React.CSSProperties = {
    fontSize: '0.85em',
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: 4,
    background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            backdropFilter: 'blur(20px)',
            backgroundColor: isDarkMode ? 'rgba(15,15,25,0.92)' : 'rgba(255,255,255,0.96)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Set up loadouts in-game</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            ESO loadout addons store their data in a <code style={codeStyle}>.lua</code> file inside
            your game folder. New here? Download a blank starter file below. Already have setups?
            Export them from the <strong>Export</strong> menu instead, then follow the same install
            steps.
          </Typography>

          {/* Back-up-first warning — overwriting is destructive. */}
          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{ borderRadius: '12px', alignItems: 'flex-start' }}
          >
            <AlertTitle sx={{ fontWeight: 700 }}>Back up before you overwrite</AlertTitle>
            Replacing an existing <code style={codeStyle}>{addon.filename}</code>{' '}
            <strong>erases the setups already in it</strong>. Copy the file somewhere safe first.
            Only overwrite if you want a clean slate or you’re sure you don’t need the old data.
            Always exit ESO (or at least log to the character screen) before editing the file — the
            game rewrites it on logout and will clobber your change.
          </Alert>

          {/* Account name — must match the in-game @UserID or the addon ignores it. */}
          <TextField
            label="Your ESO account name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="@YourAccount"
            size="small"
            fullWidth
            helperText={
              <>
                Use your in-game <strong>@UserID</strong> (the @ name shown in-game). The file is
                keyed to this — if it’s wrong the addon won’t load it. Will be saved as{' '}
                <code style={codeStyle}>{normalized}</code>.
              </>
            }
          />

          <Tabs
            value={tab}
            onChange={(_, v: number) => setTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {ADDONS.map((a) => (
              <Tab key={a.key} label={a.label} />
            ))}
          </Tabs>

          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownloadBlank}
            sx={{ borderRadius: '20px', alignSelf: 'flex-start' }}
          >
            Download blank {addon.label} starter
          </Button>

          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
              Where it goes
            </Typography>
            <Stack spacing={0.5} sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <FolderOpen sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                Windows:{' '}
                <code style={codeStyle}>
                  {SAVED_VARS_WINDOWS}
                  {addon.filename}
                </code>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <FolderOpen sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                Mac:{' '}
                <code style={codeStyle}>
                  {SAVED_VARS_MAC}
                  {addon.filename}
                </code>
              </Typography>
            </Stack>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
              Steps
            </Typography>
            <Box component="ol" sx={{ pl: 3, m: 0, '& li': { mb: 0.75 } }}>
              <Typography component="li" variant="body2">
                Install the <strong>{addon.label}</strong> addon (via{' '}
                <Link href={addon.esouiUrl} target="_blank" rel="noopener noreferrer">
                  ESOUI
                </Link>{' '}
                or Minion) and run the game once so the addon is active.
              </Typography>
              <Typography component="li" variant="body2">
                Fully quit ESO (close to desktop, or log out to the login screen).
              </Typography>
              <Typography component="li" variant="body2">
                Back up the existing <code style={codeStyle}>{addon.filename}</code> in the folder
                above, if there is one.
              </Typography>
              <Typography component="li" variant="body2">
                Copy the downloaded <code style={codeStyle}>{addon.filename}</code> into that
                folder, replacing the old file.
              </Typography>
              <Typography component="li" variant="body2">
                Launch ESO and log in. The addon loads your file automatically; type{' '}
                <code style={codeStyle}>/reloadui</code> if it doesn’t appear.
              </Typography>
              {addon.finalNote && (
                <Typography component="li" variant="body2">
                  {addon.finalNote}
                </Typography>
              )}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: '20px' }}>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};
