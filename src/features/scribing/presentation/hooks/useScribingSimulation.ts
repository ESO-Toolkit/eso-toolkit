/**
 * Custom hook for scribing simulation business logic
 */

import { useState, useEffect } from 'react';

import { ScribingSimulatorService } from '../../application/simulators/ScribingSimulatorService';
import { JsonScribingDataRepository } from '../../infrastructure/data/JsonScribingDataRepository';
import {
  ScribingSimulationRequest,
  ScribingSimulationResponse,
  Grimoire,
  FocusScript,
  SignatureScript,
  AffixScript,
} from '../../shared/types';

export interface UseScribingSimulationOptions {
  autoSimulate?: boolean;
  defaultGrimoire?: string;
}

export interface UseScribingSimulationResult {
  // Data
  grimoires: Grimoire[];
  availableFocusScripts: FocusScript[];
  availableSignatureScripts: SignatureScript[];
  availableAffixScripts: AffixScript[];

  // Current selection
  selectedGrimoire: string;
  selectedFocusScript: string;
  selectedSignatureScript: string;
  selectedAffixScript: string;

  // Selection methods
  setSelectedGrimoire: (id: string) => void;
  setSelectedFocusScript: (id: string) => void;
  setSelectedSignatureScript: (id: string) => void;
  setSelectedAffixScript: (id: string) => void;

  // Simulation
  simulationResult: ScribingSimulationResponse | null;
  isSimulating: boolean;
  simulationError: string | null;
  simulate: () => Promise<void>;

  // State
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
}

export function useScribingSimulation(
  options: UseScribingSimulationOptions = {},
): UseScribingSimulationResult {
  // Services
  const [repository] = useState(() => new JsonScribingDataRepository());
  const [simulatorService] = useState(() => new ScribingSimulatorService(repository));

  // Data state
  const [grimoires, setGrimoires] = useState<Grimoire[]>([]);
  const [availableFocusScripts, setAvailableFocusScripts] = useState<FocusScript[]>([]);
  const [availableSignatureScripts, setAvailableSignatureScripts] = useState<SignatureScript[]>([]);
  const [availableAffixScripts, setAvailableAffixScripts] = useState<AffixScript[]>([]);

  // Selection state
  const [selectedGrimoire, setSelectedGrimoire] = useState<string>(options.defaultGrimoire || '');
  const [selectedFocusScript, setSelectedFocusScript] = useState<string>('');
  const [selectedSignatureScript, setSelectedSignatureScript] = useState<string>('');
  const [selectedAffixScript, setSelectedAffixScript] = useState<string>('');

  // Simulation state
  const [simulationResult, setSimulationResult] = useState<ScribingSimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const [grimoireList] = await Promise.all([repository.getAllGrimoires()]);

        setGrimoires(grimoireList);

        // Set default grimoire if not already set
        if (!selectedGrimoire && grimoireList.length > 0) {
          setSelectedGrimoire(grimoireList[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scribing data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [repository, selectedGrimoire]);

  // Load compatible scripts when grimoire changes
  useEffect(() => {
    const loadCompatibleScripts = async (): Promise<void> => {
      if (!selectedGrimoire) {
        setAvailableFocusScripts([]);
        setAvailableSignatureScripts([]);
        setAvailableAffixScripts([]);
        return;
      }

      try {
        const compatibleScripts = await simulatorService.getAvailableCombinations(selectedGrimoire);

        setAvailableFocusScripts(compatibleScripts.focusScripts);
        setAvailableSignatureScripts(compatibleScripts.signatureScripts);
        setAvailableAffixScripts(compatibleScripts.affixScripts);

        // Reset script selections when grimoire changes
        setSelectedFocusScript('');
        setSelectedSignatureScript('');
        setSelectedAffixScript('');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load compatible scripts:', err);
      }
    };

    loadCompatibleScripts();
  }, [selectedGrimoire, simulatorService]);

  // Auto-simulate when selections change (if enabled)
  useEffect(() => {
    if (options.autoSimulate && selectedGrimoire) {
      simulate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedGrimoire,
    selectedFocusScript,
    selectedSignatureScript,
    selectedAffixScript,
    options.autoSimulate,
  ]);

  const simulate = async (): Promise<void> => {
    if (!selectedGrimoire) {
      setSimulationError('Please select a grimoire');
      return;
    }

    try {
      setIsSimulating(true);
      setSimulationError(null);

      const request: ScribingSimulationRequest = {
        grimoireId: selectedGrimoire,
        focusScriptId: selectedFocusScript || undefined,
        signatureScriptId: selectedSignatureScript || undefined,
        affixScriptId: selectedAffixScript || undefined,
        characterLevel: 160,
      };

      const result = await simulatorService.simulate(request);
      setSimulationResult(result);

      if (!result.isValid && result.errors?.length) {
        setSimulationError(result.errors.join(', '));
      }
    } catch (err) {
      setSimulationError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const isReady = !isLoading && !error && grimoires.length > 0;

  return {
    // Data
    grimoires,
    availableFocusScripts,
    availableSignatureScripts,
    availableAffixScripts,

    // Current selection
    selectedGrimoire,
    selectedFocusScript,
    selectedSignatureScript,
    selectedAffixScript,

    // Selection methods
    setSelectedGrimoire,
    setSelectedFocusScript,
    setSelectedSignatureScript,
    setSelectedAffixScript,

    // Simulation
    simulationResult,
    isSimulating,
    simulationError,
    simulate,

    // State
    isLoading,
    error,
    isReady,
  };
}
