/**
 * Roster Builder Page (Refactored)
 * Main orchestration page for roster management using extracted components and hooks
 */

import { useState, useEffect } from 'react';
import { Grid, Container, Paper, Stack, TextField, Autocomplete, Snackbar, Alert, Chip } from '@mui/material';

// Context imports
import { useEsoLogsClientContext } from '../../EsoLogsClientContext';
import { useAuth } from '../../features/auth/AuthContext';
import { gql } from '@apollo/client';

// Component imports
import { WorkInProgressDisclaimer } from '../components/WorkInProgressDisclaimer';
import { SetAssignmentManager } from '../components/SetAssignmentManager';

// Refactored components
import { RosterHeader } from './roster-builder/components/RosterHeader';
import { RosterSummary } from './roster-builder/components/RosterSummary';
import { SupportRolesSection } from './roster-builder/components/SupportRolesSection';
import { DPSSection } from './roster-builder/components/DPSSection';
import { ActionBar } from './roster-builder/components/ActionBar';

// Dialog components
import { QuickFillDialog } from './roster-builder/components/dialogs/QuickFillDialog';
import { ImportDialog } from './roster-builder/components/dialogs/ImportDialog';
import { PreviewDialog } from './roster-builder/components/dialogs/PreviewDialog';

// Hooks
import { useRosterState } from './roster-builder/hooks/useRosterState';
import { useRosterActions } from './roster-builder/hooks/useRosterActions';
import { useRosterImport } from './roster-builder/hooks/useRosterImport';
import { useRosterValidation } from './roster-builder/hooks/useRosterValidation';

// Types
import { RaidRoster, TankSetup, HealerSetup, HealerBuff, JailDDType } from '../../types/roster';
import { KnownSetIDs } from '../../types/abilities';

/**
 * GraphQL query for fetching player details from ESO Logs
 */
const GET_PLAYERS_FOR_REPORT = gql`
  query getPlayersForReport($code: String!, $fightIDs: [Int]) {
    reportData {
      report(code: $code) {
        playerDetails(includeCombatantInfo: true, fightIDs: $fightIDs)
        events(fightIDs: $fightIDs, dataType: CombatantInfo, useActorIDs: true, limit: 1000000) {
          data
        }
      }
    }
  }
}
`;

/**
 * RosterBuilderPage - Main page for roster management
 * Orchestrates all components and hooks
 */
export const RosterBuilderPage: React.FC = () => {
  // Use custom hooks
  const {
    roster,
    setRoster,
    updateRosterName,
    updateRosterNotes,
    addGroup,
    updateTank,
    updateHealer,
    convertDPSToJail,
    convertJailToDPS,
    showSuccess,
    showError,
    closeSnackbar,
    validateImportedRoster,
  } = useRosterState();

  const { isLoggedIn } = useAuth();
  const { client: esoLogsClient, isReady, isLoggedIn: clientLoggedIn } = useEsoLogsClientContext();

  // Client is only available when ready and logged in
  const client = isReady && clientLoggedIn ? esoLogsClient : null;

  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');

  // Use roster actions hook
  const { handleSetAssignment, handleUltimateUpdate, handleHealerCPUpdate, handleDPSDragEnd, handleQuickFill, updateAvailableGroups } =
    useRosterActions({
      roster,
      updateTank,
      updateHealer,
      convertDPSToJail,
      convertJailToDPS,
      showSuccess,
      showError,
    });

  // Use roster validation hook
  const { validation, filledSlots, isEmpty } = useRosterValidation(roster);

  // Use roster import/export hook
  const { handleExportJSON, handleImportJSON, handleImportFromUrl, handleCopyLink, handleCopyDiscordFormat } =
    useRosterImport({
      roster,
      setRoster,
      validateImportedRoster,
      showSuccess,
      showError,
    });

  // Dialog states
  const [quickFillDialog, setQuickFillDialog] = useState(false);
  const [quickFillText, setQuickFillText] = useState('');
  const [previewDialog, setPreviewDialog] = useState(false);
  const [importUrlDialog, setImportUrlDialog] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // Available groups for player assignment
  const usedBuffs = [roster.healer1?.healerBuff, roster.healer2?.healerBuff].filter(
    Boolean,
  ) as HealerBuff[];

  // Update DPS slot in roster
  const updateDPSSlotInRoster = (slotNumber: number, updates: Parameters<typeof setRoster>[0]['dpsSlots'][number]) => {
    setRoster((prev) => {
      const updatedDpsSlots = [...prev.dpsSlots];
      const slotIndex = updatedDpsSlots.findIndex((s) => s.slotNumber === slotNumber);
      if (slotIndex === -1) return prev;

      updatedDpsSlots[slotIndex] = {
        ...updatedDpsSlots[slotIndex],
        ...updates,
      };

      return {
        ...prev,
        dpsSlots: updatedDpsSlots,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Update roster on group changes from DPS cards
  const handleGroupChangeFromDPS = (groupName: string) => {
    if (!roster.availableGroups.includes(groupName)) {
      addGroup(groupName);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Development Banner */}
      <WorkInProgressDisclaimer featureName="Roster Builder" sx={{ mb: 3 }} />

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        {/* Header */}
        <RosterHeader
          mode={mode}
          onModeChange={setMode}
          rosterName={roster.rosterName}
          onRosterNameChange={updateRosterName}
        />

        {/* Action Bar */}
        <ActionBar
          onQuickFill={() => setQuickFillDialog(true)}
          onImportJSON={handleImportJSON}
          onExportJSON={handleExportJSON}
          onPreview={() => setPreviewDialog(true)}
          onCopyDiscordFormat={handleCopyDiscordFormat}
          onCopyLink={handleCopyLink}
          onImportFromUrl={() => setImportUrlDialog(true)}
          isImportLoading={importLoading}
        />

        <Divider sx={{ my: 3 }} />

        {/* Empty State */}
        {isEmpty ? (
          <RosterSummary
            validation={validation}
            filledSlots={filledSlots}
            isEmpty={isEmpty}
            onCreateNew={() => setRoster((prev) => ({ ...prev, rosterName: 'New Roster', updatedAt: new Date().toISOString() }))}
            onImportFromLogs={() => setImportUrlDialog(true)}
          />
        ) : (
          <>
            {/* Dashboard Layout for non-empty roster */}
            <Grid container spacing={3}>
              {/* Left Column: Support Roles */}
              <Grid item xs={12} md={5}>
                <SupportRolesSection
                  tank1={roster.tank1}
                  tank2={roster.tank2}
                  healer1={roster.healer1}
                  healer2={roster.healer2}
                  availableGroups={roster.availableGroups}
                  usedBuffs={usedBuffs}
                  onTankChange={updateTank}
                  onHealerChange={updateHealer}
                />
              </Grid>

              {/* Right Column: Summary + DPS */}
              <Grid item xs={12} md={7}>
                <Stack spacing={3}>
                  {/* Roster Summary */}
                  <RosterSummary
                    validation={validation}
                    filledSlots={filledSlots}
                    isEmpty={isEmpty}
                    onCreateNew={() => setRoster((prev) => ({ ...prev, rosterName: 'New Roster', updatedAt: new Date().toISOString() }))}
                    onImportFromLogs={() => setImportUrlDialog(true)}
                  />

                  {/* DPS Section */}
                  <DPSSection
                    dpsSlots={roster.dpsSlots}
                    availableGroups={roster.availableGroups}
                    onChangeDPSSlot={updateDPSSlotInRoster}
                    onConvertDPSToJail={convertDPSToJail}
                    onConvertJailToDPS={convertJailToDPS}
                    onDPSDragEnd={handleDPSDragEnd}
                  />
                </Stack>
              </Grid>
            </Grid>

            {/* Advanced Mode: General Notes */}
            {mode === 'advanced' && (
              <>
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
                        availableGroups: value || [],
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

                {/* General Notes */}
                <Typography variant="h5" gutterBottom>
                  General Notes
                </Typography>
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
              </>
            )}
          </>
        )}
      </Paper>

      {/* Quick Fill Dialog */}
      <QuickFillDialog
        open={quickFillDialog}
        onClose={() => setQuickFillDialog(false)}
        onFill={handleQuickFill}
        quickFillText={quickFillText}
        onTextChange={setQuickFillText}
      />

      {/* Discord Preview Dialog */}
      <PreviewDialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        onCopy={handleCopyDiscordFormat}
        roster={roster}
      />

      {/* Import from URL Dialog */}
      <ImportDialog
        open={importUrlDialog}
        onClose={() => {
          setImportUrlDialog(false);
          setImportUrl('');
        }}
        onImport={handleImportFromUrl}
        importUrl={importUrl}
        onUrlChange={setImportUrl}
        importLoading={importLoading}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={roster.snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
      >
        <Alert
          onClose={closeSnackbar}
          severity={roster.snackbar.severity}
        >
          {roster.snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
