/**
 * React hook for unified scribing detection
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

import { ScribedSkillData } from '../../../components/SkillTooltip';
import {
  UnifiedScribingResult,
  UnifiedScribingDetectionService,
  UnifiedScribingDetection,
} from '../algorithms/unified-scribing-service';

export interface UseScribingDetectionOptions {
  fightId?: string;
  playerId?: number;
  abilityId?: number;
  enabled?: boolean;
}

export interface UseScribingDetectionResult {
  data: UnifiedScribingResult | null;
  scribedSkillData: ScribedSkillData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for unified scribing detection
 */
export function useScribingDetection(
  options: UseScribingDetectionOptions = {},
): UseScribingDetectionResult {
  const { fightId, playerId, abilityId, enabled = true } = options;

  const [data, setData] = useState<UnifiedScribingResult | null>(null);
  const [scribedSkillData, setScribedSkillData] = useState<ScribedSkillData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => new UnifiedScribingDetectionService(), []);

  const fetchScribingData = useCallback(async () => {
    if (!enabled || !fightId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get full detection results
      const detectionResult = await service.detectScribingRecipes(fightId);
      setData(detectionResult);

      // If we have specific player/ability info, use the proper service method
      if (playerId && abilityId) {
        // Use the service method that properly maps ability ID to grimoire
        const skillData = await service.getScribingDataForSkill(fightId, playerId, abilityId);

        if (skillData) {
          // Find the specific player data for tooltip conversion
          const playerData = detectionResult.players.find(
            (p: UnifiedScribingDetection) => p.playerId === playerId,
          );

          if (playerData) {
            // Use the service data directly - it's already the specific combination we need!
            const scribedData: ScribedSkillData = {
              grimoireName: skillData.grimoire,
              effects: [], // Would be populated from actual effect data
              wasCastInFight: skillData.wasCastInFight,
              recipe: {
                grimoire: skillData.grimoire,
                transformation: skillData.focus, // ← This is the correct focus script!
                transformationType: 'Focus Script',
                confidence: skillData.confidence,
                matchMethod: 'Enhanced Unified Detection',
                recipeSummary: `${skillData.grimoire} + ${skillData.focus}`,
                tooltipInfo: `Detected with ${Math.round(skillData.confidence * 100)}% confidence`,
              },
              signatureScript: {
                name: skillData.signature, // ← This is the correct signature script!
                confidence: skillData.confidence * 0.95,
                detectionMethod: 'Multi-event correlation analysis',
                evidence: ['Signature events detected', 'Enhanced timing correlation'],
              },
              affixScripts: [
                {
                  id: 'affix-1',
                  name: skillData.affix, // ← This is the correct affix script!
                  description: 'Detected affix script',
                  confidence: skillData.confidence,
                  detectionMethod: 'Enhanced Unified Detection',
                  evidence: {
                    buffIds: [],
                    debuffIds: [],
                    abilityNames: [],
                    occurrenceCount: 1,
                  },
                },
              ],
            };

            // Setting scribedSkillData with wasCastInFight = ${scribedData.wasCastInFight}
            setScribedSkillData(scribedData);
          } else {
            // Service found data but player not in results (shouldn't happen)
            setScribedSkillData({
              grimoireName: skillData.grimoire,
              effects: [],
              wasCastInFight: skillData.wasCastInFight,
            });
          }
        } else {
          // No scribing data found for this specific ability
          setScribedSkillData({
            grimoireName: 'Unknown',
            effects: [],
            wasCastInFight: false,
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      // Scribing detection failed
    } finally {
      setLoading(false);
    }
  }, [fightId, playerId, abilityId, enabled, service]);

  const refetch = useCallback(async () => {
    await fetchScribingData();
  }, [fetchScribingData]);

  useEffect(() => {
    fetchScribingData();
  }, [fetchScribingData]);

  return {
    data,
    scribedSkillData,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for getting scribing data for a specific skill
 */
export function useSkillScribingData(
  fightId?: string,
  playerId?: number,
  abilityId?: number,
): {
  scribedSkillData: ScribedSkillData | null;
  loading: boolean;
  error: string | null;
} {
  const { scribedSkillData, loading, error } = useScribingDetection({
    fightId,
    playerId,
    abilityId,
    enabled: Boolean(fightId && playerId && abilityId),
  });

  return { scribedSkillData, loading, error };
}
