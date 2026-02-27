/**
 * Roster Builder Module
 * Exports all refactored components, hooks, and utilities
 */

// Main page
export { RosterBuilderPage } from '../RosterBuilderPage';

// Components
export { RosterHeader } from './components/RosterHeader';
export { RosterSummary } from './components/RosterSummary';
export { SupportRolesSection } from './components/SupportRolesSection';
export { DPSSection } from './components/DPSSection';
export { ActionBar } from './components/ActionBar';

// Dialog components
export { QuickFillDialog } from './components/dialogs/QuickFillDialog';
export { ImportDialog } from './components/dialogs/ImportDialog';
export { PreviewDialog } from './components/dialogs/PreviewDialog';

// Card components
export { TankCard } from './components/cards/TankCard';
export { HealerCard } from './components/cards/HealerCard';
export { DPSSlotCard } from './components/cards/DPSSlotCard';

// Hooks
export { useRosterState, type UseRosterStateReturn } from './hooks/useRosterState';
export { useRosterActions, type UseRosterActionsReturn } from './hooks/useRosterActions';
export { useRosterImport, type UseRosterImportReturn } from './hooks/useRosterImport';
export { useRosterValidation, type UseRosterValidationReturn } from './hooks/useRosterValidation';

// Utils
export { QUICK_ASSIGN_PRESETS, getJailDDTitle, formatJailDDType, applyGearPreset } from './utils/constants';
export {
  validateRoster,
  validateTank,
  validateHealer,
  type RosterValidationResult,
  type ValidationResult,
  type ValidationSeverity,
  getAssignedSets,
  isSetAssigned,
  getSetAvailability,
} from './utils/rosterValidation';
export { generateDiscordFormat } from './utils/discordFormatter';
export { getUltimateIcon, getHealerBuffIcon, getSkillLineIcon } from './utils/iconHelpers';
