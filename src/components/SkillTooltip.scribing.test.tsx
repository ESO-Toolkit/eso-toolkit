import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

import { SkillTooltip } from './SkillTooltip';
import type { SkillTooltipProps } from './SkillTooltip';

// Mock the useSkillScribingData hook from the new location
jest.mock('../features/scribing/hooks/useScribingDetection', () => ({
  useSkillScribingData: jest.fn(),
}));

// Mock the useLogger hook
jest.mock('../hooks/useLogger', () => ({
  useLogger: () => ({
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  }),
}));

// Import the mocked hook
import { useSkillScribingData } from '../features/scribing/hooks/useScribingDetection';

const mockUseSkillScribingData = useSkillScribingData as jest.MockedFunction<
  typeof useSkillScribingData
>;

// Create a theme for consistent rendering
const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);

describe('SkillTooltip - Scribing Skills Snapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Shattering Knife (Player 1)', () => {
    it('should render Shattering Knife tooltip with complete scribing data', () => {
      // Mock scribing data for Shattering Knife (ID: 217340)
      const mockScribingData = {
        grimoireName: 'Traveling Knife',
        effects: [
          {
            abilityId: 217341,
            abilityName: 'Shattering Knife',
            type: 'damage' as const,
            count: 15,
          },
          {
            abilityId: 217342,
            abilityName: 'Armor Reduction',
            type: 'debuff' as const,
            count: 8,
          },
        ],
        wasCastInFight: true,
        recipe: {
          grimoire: 'Traveling Knife',
          transformation: 'Shattering Knife',
          transformationType: 'signature',
          confidence: 1.0,
          matchMethod: 'database',
          recipeSummary: 'Traveling Knife + Shattering Knife',
          tooltipInfo:
            'Detected from Player 1 combat data with 100% confidence via database lookup',
        },
        signatureScript: {
          name: 'Shattering Knife',
          confidence: 1.0,
          detectionMethod: 'database-lookup',
          evidence: ['Ability ID 217340 found in database'],
        },
        affixScripts: [
          {
            id: 'armor-breach',
            name: 'Armor Breach',
            description: 'Reduces target armor by a significant amount',
            confidence: 0.8,
            detectionMethod: 'effect-analysis',
            evidence: {
              buffIds: [],
              debuffIds: [217342],
              abilityNames: ['Armor Reduction'],
              occurrenceCount: 8,
            },
          },
        ],
      };

      // Mock the hook to return our test data
      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: mockScribingData,
        loading: false,
        error: null,
      });

      // Props for Shattering Knife tooltip
      const tooltipProps: SkillTooltipProps = {
        name: 'Shattering Knife',
        abilityId: 217340,
        description: (
          <>
            Twirl and throw an enchanted dagger at an enemy, which returns to you after a short
            delay and hits additional enemies in the path. The dagger shatters on impact, reducing
            the target's armor and dealing additional damage over time.
          </>
        ),
        headerBadge: 'Active',
        lineText: 'Scribing — Traveling Knife',
        iconSlug: 'ability_grimoire_dualwield',
        stats: [
          { label: 'Cost', value: '3240 Stamina' },
          { label: 'Target', value: 'Enemy' },
          { label: 'Range', value: '15 meters' },
          { label: 'Duration', value: 'Instant' },
        ],
        fightId: '11',
        playerId: 1,
      };

      // Render the component
      const { container } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      // Create snapshot
      expect(container.firstChild).toMatchSnapshot('shattering-knife-complete-scribing-data');
    });

    it('should render Shattering Knife tooltip with minimal scribing data', () => {
      // Mock minimal scribing data (detected but limited info)
      const mockMinimalScribingData = {
        grimoireName: 'Traveling Knife',
        effects: [],
        wasCastInFight: true,
        recipe: {
          grimoire: 'Traveling Knife',
          transformation: 'Shattering Knife',
          transformationType: 'signature',
          confidence: 1.0,
          matchMethod: 'database',
          recipeSummary: 'Traveling Knife + Shattering Knife',
          tooltipInfo: 'Basic detection via database lookup',
        },
        signatureScript: {
          name: 'No signature script detected',
          confidence: 0,
          detectionMethod: 'fallback',
          evidence: [],
        },
      };

      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: mockMinimalScribingData,
        loading: false,
        error: null,
      });

      const tooltipProps: SkillTooltipProps = {
        name: 'Shattering Knife',
        abilityId: 217340,
        description: 'A scribing skill that throws a shattering dagger at enemies.',
        headerBadge: 'Active',
        lineText: 'Scribing — Traveling Knife',
        iconSlug: 'ability_grimoire_dualwield',
        stats: [
          { label: 'Cost', value: '3240 Stamina' },
          { label: 'Target', value: 'Enemy' },
        ],
        fightId: '11',
        playerId: 1,
      };

      const { container } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      expect(container.firstChild).toMatchSnapshot('shattering-knife-minimal-scribing-data');
    });

    it('should render Shattering Knife tooltip without scribing data (fallback)', () => {
      // Mock no scribing data (fallback case)
      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: null,
        loading: false,
        error: null,
      });

      const tooltipProps: SkillTooltipProps = {
        name: 'Shattering Knife',
        abilityId: 217340,
        description: 'A mysterious skill with unknown scribing configuration.',
        headerBadge: 'Active',
        lineText: 'Unknown — Unknown Grimoire',
        iconSlug: 'ability_grimoire_dualwield',
        stats: [
          { label: 'Cost', value: 'Unknown' },
          { label: 'Target', value: 'Enemy' },
        ],
        fightId: '11',
        playerId: 1,
      };

      const { container } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      expect(container.firstChild).toMatchSnapshot('shattering-knife-no-scribing-data');
    });

    it('should render Shattering Knife tooltip while loading scribing data', () => {
      // Mock loading state
      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: null,
        loading: true,
        error: null,
      });

      const tooltipProps: SkillTooltipProps = {
        name: 'Shattering Knife',
        abilityId: 217340,
        description: 'A scribing skill being analyzed...',
        headerBadge: 'Active',
        lineText: 'Scribing — Analyzing...',
        iconSlug: 'ability_grimoire_dualwield',
        stats: [
          { label: 'Cost', value: '3240 Stamina' },
          { label: 'Target', value: 'Enemy' },
        ],
        fightId: '11',
        playerId: 1,
      };

      const { container } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      expect(container.firstChild).toMatchSnapshot('shattering-knife-loading-scribing-data');
    });
  });

  describe('Shattering Knife - Various Effect Types', () => {
    it('should render with mixed effect types (damage, debuff, buff)', () => {
      const mockMixedEffectsData = {
        grimoireName: 'Traveling Knife',
        effects: [
          {
            abilityId: 217340,
            abilityName: 'Shattering Strike',
            type: 'damage' as const,
            count: 12,
          },
          {
            abilityId: 217341,
            abilityName: 'Armor Shatter',
            type: 'debuff' as const,
            count: 8,
          },
          {
            abilityId: 217342,
            abilityName: 'Combat Stance',
            type: 'buff' as const,
            count: 5,
          },
          {
            abilityId: 217343,
            abilityName: 'Life Steal',
            type: 'heal' as const,
            count: 3,
          },
        ],
        wasCastInFight: true,
        recipe: {
          grimoire: 'Traveling Knife',
          transformation: 'Shattering Knife',
          transformationType: 'signature',
          confidence: 0.95,
          matchMethod: 'hybrid',
          recipeSummary: 'Traveling Knife + Shattering Knife + Enhanced Effects',
          tooltipInfo: 'Complex scribing configuration with multiple effect types',
        },
        signatureScript: {
          name: 'Shattering Knife',
          confidence: 0.95,
          detectionMethod: 'effect-pattern-analysis',
          evidence: ['Multiple damage instances', 'Armor reduction effects', 'Healing components'],
        },
      };

      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: mockMixedEffectsData,
        loading: false,
        error: null,
      });

      const tooltipProps: SkillTooltipProps = {
        name: 'Shattering Knife',
        abilityId: 217340,
        description:
          'A complex scribing skill that damages, debuffs enemies, buffs the caster, and provides healing.',
        headerBadge: 'Active',
        lineText: 'Scribing — Traveling Knife',
        iconSlug: 'ability_grimoire_dualwield',
        stats: [
          { label: 'Cost', value: '3240 Stamina' },
          { label: 'Target', value: 'Enemy' },
          { label: 'Range', value: '15 meters' },
          { label: 'Effects', value: '4 Types' },
        ],
        fightId: '11',
        playerId: 1,
      };

      const { container } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      expect(container.firstChild).toMatchSnapshot('shattering-knife-mixed-effects');
    });
  });
});
