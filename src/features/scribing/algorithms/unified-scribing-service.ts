/**
 * Unified Scribing Detection Service
 * Service layer for integrating unified scribing detection with React components
 */

// Import the actual algorithm results
// TODO: Re-create missing fight88 results file or load from data-downloads
// import fight88Results from '../../unified-scribing-analysis-fight-88.json';
interface RawPlayerData {
  playerId?: number;
  playerName?: string;
  playerClass?: string;
  playerRole?: string;
  playerInfo?: {
    name?: string;
    class?: string;
    role?: string;
  };
  detectedCombinations?: RawCombinationData[];
}

interface RawCombinationData {
  grimoire?: string;
  casts?: number;
  focus?: string;
  signature?: string;
  affix?: string;
  confidence?: {
    focus?: number;
    signature?: number;
    affix?: number;
    overall?: number;
  };
  events?: unknown;
}

interface RawScribingResults {
  players?: RawPlayerData[];
}

const fight88Results: RawScribingResults[] = []; // Placeholder - TODO: Load real data

export interface ScribingCombination {
  grimoire: string;
  grimoireKey: string;
  casts: number;
  focus: string;
  focusKey?: string;
  signature: string;
  signatureKey?: string;
  affix: string;
  affixKey?: string;
  confidence?: {
    focus?: number;
    signature?: number;
    affix?: number;
    overall?: number;
  };
  events?: {
    focusEvents?: number;
    signatureEvents?: number;
    affixEvents?: number;
  };
}

export interface UnifiedScribingDetection {
  playerId: number;
  playerName: string;
  playerClass: string;
  playerRole: string;
  detectedCombinations: ScribingCombination[];
}

export interface UnifiedScribingAnalysisResult {
  metadata: {
    fightId: string;
    duration: number;
    playerCount: number;
    algorithm: {
      name: string;
      version: string;
      timestamp: string;
    };
    detectionStats: {
      totalCombinations: number;
      totalCasts: number;
      confidenceDistribution: Record<string, number>;
    };
  };
  players: UnifiedScribingDetection[];
  summary: {
    totalCombinations: number;
    totalCasts: number;
    uniqueGrimoires: number;
    uniqueFocusScripts: number;
    uniqueSignatureScripts: number;
    uniqueAffixScripts: number;
  };
}

export interface UnifiedScribingResult {
  players: UnifiedScribingDetection[];
  summary: {
    totalCombinations: number;
    totalCasts: number;
    uniqueGrimoires: number;
    uniqueFocusScripts: number;
    uniqueSignatureScripts: number;
    uniqueAffixScripts: number;
  };
}

/**
 * Unified Scribing Detection Service
 */
export class UnifiedScribingDetectionService {
  /**
   * Run unified scribing detection on fight data
   */
  async detectScribingRecipes(fightId: string): Promise<UnifiedScribingResult> {
    // For Fight 88, return the REAL algorithm results!
    if (fightId === '88') {
      return this.convertRealResultsToServiceFormat(fight88Results[0] || { players: [] });
    }

    // For other fights, return empty data
    return {
      players: [],
      summary: {
        totalCombinations: 0,
        totalCasts: 0,
        uniqueGrimoires: 0,
        uniqueFocusScripts: 0,
        uniqueSignatureScripts: 0,
        uniqueAffixScripts: 0,
      },
    };
  }

  /**
   * Convert real algorithm results to our service format
   */
  private convertRealResultsToServiceFormat(
    realResults: RawScribingResults,
  ): UnifiedScribingResult {
    const players: UnifiedScribingDetection[] = (realResults.players || []).map(
      (player: RawPlayerData) => ({
        playerId: player.playerId || 0,
        playerName: player.playerInfo?.name || `Player ${player.playerId}`,
        playerClass: player.playerInfo?.class || 'Unknown',
        playerRole: player.playerInfo?.role || 'Unknown',
        detectedCombinations: (player.detectedCombinations || []).map(
          (combo: RawCombinationData) => ({
            grimoire: combo.grimoire || 'Unknown Grimoire',
            grimoireKey: this.generateKey(combo.grimoire || 'Unknown Grimoire'),
            casts: combo.casts || 0,
            focus: combo.focus || 'Unknown Focus',
            focusKey: this.generateKey(combo.focus || 'Unknown Focus'),
            signature: combo.signature || 'Unknown Signature',
            signatureKey: this.generateKey(combo.signature || 'Unknown Signature'),
            affix: combo.affix || 'Unknown Affix',
            affixKey: this.generateKey(combo.affix || 'Unknown Affix'),
            confidence: combo.confidence || {
              focus: 1.0,
              signature: 1.0,
              affix: 1.0,
              overall: 1.0,
            },
            events: combo.events || {
              focusEvents: 0,
              signatureEvents: 0,
              affixEvents: 0,
            },
          }),
        ),
      }),
    );

    const totalCombinations = players.reduce(
      (sum: number, p: UnifiedScribingDetection) => sum + p.detectedCombinations.length,
      0,
    );
    const totalCasts = players.reduce(
      (sum: number, p: UnifiedScribingDetection) =>
        sum +
        p.detectedCombinations.reduce((cSum: number, c: ScribingCombination) => cSum + c.casts, 0),
      0,
    );

    const result = {
      players,
      summary: {
        totalCombinations,
        totalCasts,
        uniqueGrimoires: new Set(
          players.flatMap((p: UnifiedScribingDetection) =>
            p.detectedCombinations.map((c: ScribingCombination) => c.grimoire),
          ),
        ).size,
        uniqueFocusScripts: new Set(
          players.flatMap((p: UnifiedScribingDetection) =>
            p.detectedCombinations.map((c: ScribingCombination) => c.focus),
          ),
        ).size,
        uniqueSignatureScripts: new Set(
          players.flatMap((p: UnifiedScribingDetection) =>
            p.detectedCombinations.map((c: ScribingCombination) => c.signature),
          ),
        ).size,
        uniqueAffixScripts: new Set(
          players.flatMap((p: UnifiedScribingDetection) =>
            p.detectedCombinations.map((c: ScribingCombination) => c.affix),
          ),
        ).size,
      },
    };

    // Converted to service format successfully
    return result;
  }

  /**
   * Generate a key from a script name
   */
  private generateKey(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .trim();
  }

  /**
   * Mock fight data for testing
   */
  getMockFightData(): UnifiedScribingResult {
    return {
      players: [
        {
          playerId: 6,
          playerName: "Grappa'Ko'Laid",
          playerClass: 'Nightblade',
          playerRole: 'Healer',
          detectedCombinations: [
            {
              grimoire: "Ulfsild's Contingency",
              grimoireKey: 'ulfsilds-contingency',
              casts: 6,
              focus: 'Healing Contingency',
              focusKey: 'healing-contingency',
              signature: "Gladiator's Tenacity",
              signatureKey: 'gladiators-tenacity',
              affix: 'Taunt',
              affixKey: 'taunt',
              confidence: {
                focus: 1.0,
                signature: 1.0,
                affix: 0.95,
                overall: 0.98,
              },
              events: {
                focusEvents: 12,
                signatureEvents: 6,
                affixEvents: 6,
              },
            },
          ],
        },
        {
          playerId: 12,
          playerName: 'Tzu',
          playerClass: 'Nightblade',
          playerRole: 'DD',
          detectedCombinations: [
            {
              grimoire: 'Traveling Knife',
              grimoireKey: 'traveling-knife',
              casts: 7,
              focus: 'Magical Trample',
              focusKey: 'magical-trample',
              signature: 'Frost Clench',
              signatureKey: 'frost-clench',
              affix: 'Immobilize',
              affixKey: 'immobilize',
              confidence: {
                focus: 1.0,
                signature: 1.0,
                affix: 1.0,
                overall: 1.0,
              },
              events: {
                focusEvents: 7,
                signatureEvents: 7,
                affixEvents: 7,
              },
            },
          ],
        },
      ],
      summary: {
        totalCombinations: 2,
        totalCasts: 13,
        uniqueGrimoires: 2,
        uniqueFocusScripts: 2,
        uniqueSignatureScripts: 2,
        uniqueAffixScripts: 2,
      },
    };
  }

  /**
   * Get analysis result with metadata
   */
  getAnalysisResult(): UnifiedScribingAnalysisResult {
    const result = this.getMockFightData();

    return {
      metadata: {
        fightId: '88',
        duration: 645000,
        playerCount: 2,
        algorithm: {
          name: 'Enhanced Unified Scribing Detection v2.0',
          version: '2.0.0',
          timestamp: '2024-10-02T10:15:30Z',
        },
        detectionStats: {
          totalCombinations: result.summary.totalCombinations,
          totalCasts: result.summary.totalCasts,
          confidenceDistribution: {
            high: 2,
            medium: 0,
            low: 0,
          },
        },
      },
      players: result.players,
      summary: result.summary,
    };
  }

  /**
   * Get scribing data for a specific skill
   */
  async getScribingDataForSkill(
    _fightId: string,
    playerId: number,
    abilityId: number,
  ): Promise<{
    grimoire: string;
    focus: string;
    signature: string;
    affix: string;
    confidence: number;
    wasCastInFight: boolean;
  } | null> {
    try {
      // Ability ID to specific combination mapping
      // Each ability ID corresponds to a specific grimoire + focus script combination
      const abilityToCombination: Record<number, { grimoireKey: string; focusKey: string }> = {
        // Ulfsild's Contingency + Healing Contingency + Gladiator's Tenacity
        240150: { grimoireKey: 'ulfsilds-contingency', focusKey: 'healing-contingency' },

        // Wield Soul + Leashing Soul combinations
        217784: { grimoireKey: 'wield-soul', focusKey: 'leashing-soul' },
        219837: { grimoireKey: 'wield-soul', focusKey: 'leashing-soul' },
        219838: { grimoireKey: 'wield-soul', focusKey: 'leashing-soul' },

        // Traveling Knife + Magical Trample combinations
        220115: { grimoireKey: 'traveling-knife', focusKey: 'magical-trample' },
        220117: { grimoireKey: 'traveling-knife', focusKey: 'magical-trample' },
        220118: { grimoireKey: 'traveling-knife', focusKey: 'magical-trample' },
      };

      const combinationMapping = abilityToCombination[abilityId];
      if (!combinationMapping) {
        return null;
      }

      // Get the detection results for Fight 88
      const results = await this.detectScribingRecipes('88');

      const player = results.players.find((p) => p.playerId === playerId);
      if (!player) {
        return null;
      }

      // Find the specific combination for this ability
      // Match both grimoireKey and focusKey for specificity
      const combination = player.detectedCombinations.find((combo) => {
        const comboFocusKey = combo.focusKey || this.generateKey(combo.focus);
        return (
          combo.grimoireKey === combinationMapping.grimoireKey &&
          comboFocusKey === combinationMapping.focusKey
        );
      });

      if (combination) {
        const result = {
          grimoire: combination.grimoire,
          focus: combination.focus,
          signature: combination.signature,
          affix: combination.affix,
          confidence: combination.confidence?.overall || 1.0,
          wasCastInFight: combination.casts > 0,
        };
        return result;
      }

      return null;
    } catch {
      // Failed to get scribing data for skill
      return null;
    }
  }
}

// Export a singleton instance
export const unifiedScribingService = new UnifiedScribingDetectionService();
