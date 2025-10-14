import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

import { SkillTooltip } from './SkillTooltip';
import type { SkillTooltipProps } from './SkillTooltip';

// Mock the useSkillScribingData hook
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

describe("SkillTooltip - Ulfsild's Contingency (Fight 11, Player 7)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Ulfsild's Contingency with Gladiator's Tenacity and Damage Shield", () => {
    it("should render Ulfsild's Contingency tooltip with Gladiator's Tenacity signature script", () => {
      // Mock scribing data for Ulfsild's Contingency with detected scripts
      // Based on Fight 11 analysis:
      // - Cast ID: 240150 (Healing Contingency transformation)
      // - Signature Script: Gladiator's Tenacity (ID 217654) - "Tenacious Contingency"
      // - Focus Script: Damage Shield (ID 20) - "Warding Contingency" (ID 217608)
      const mockScribingData = {
        grimoireName: "Ulfsild's Contingency",
        effects: [
          {
            abilityId: 217654,
            abilityName: 'Tenacious Contingency',
            type: 'buff' as const,
            count: 24, // Appeared in all 6 casts
          },
          {
            abilityId: 217608,
            abilityName: 'Warding Contingency',
            type: 'buff' as const,
            count: 24, // Appeared in 4 out of 6 casts
          },
          {
            abilityId: 222285,
            abilityName: "Ulfsild's Contingency",
            type: 'buff' as const,
            count: 5,
          },
        ],
        wasCastInFight: true,
        recipe: {
          grimoire: "Ulfsild's Contingency",
          focusScript: 'Damage Shield',
          focusScriptKey: 'damage-shield',
          signatureScript: "Gladiator's Tenacity",
          signatureScriptKey: 'gladiators-tenacity',
          transformation: 'Healing Contingency',
          transformationType: 'focus',
          confidence: 1.0,
          matchMethod: 'combat-analysis',
          recipeSummary:
            "Ulfsild's Contingency + Damage Shield (Focus) + Gladiator's Tenacity (Signature)",
          tooltipInfo: 'Detected from Player 7 combat data in Fight 11 with high confidence',
        },
        signatureScript: {
          name: "Gladiator's Tenacity",
          confidence: 1.0,
          detectionMethod: 'Post-Cast Pattern Analysis',
          evidence: [
            'Analyzed 6 casts',
            'Found 1 consistent effects',
            'Top effect: buff ID 217654 (24/6 casts)',
            'buff 217654: 24 occurrences',
          ],
        },
        focusScript: {
          name: 'Damage Shield',
          scriptId: 20,
          transformation: 'Warding Contingency',
          transformationAbilityId: 217608,
          confidence: 0.67,
          detectionMethod: 'Name Transformation Analysis',
          evidence: [
            'Analyzed 6 casts',
            'Warding Contingency appeared in 4 casts (66.7%)',
            'Focus script: Damage Shield (ID: 20)',
            'Transforms core effect to provide damage shields',
          ],
        },
        affixScripts: [], // No affix scripts detected in this build
      };

      // Mock the hook to return our test data
      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: mockScribingData,
        loading: false,
        error: null,
      });

      // Props for Ulfsild's Contingency tooltip
      const tooltipProps: SkillTooltipProps = {
        name: "Ulfsild's Contingency",
        abilityId: 240150,
        description: (
          <>
            Create a magical contingency that activates when you take damage, applying a powerful
            effect. The nature of the contingency depends on the focus script selected.
          </>
        ),
        headerBadge: 'Active',
        lineText: 'Scribing — Soul Magic',
        iconSlug: 'ability_grimoire_ulfsilds_contingency',
        stats: [
          { label: 'Cost', value: '4320 Magicka' },
          { label: 'Target', value: 'Self' },
          { label: 'Duration', value: 'Conditional' },
        ],
        fightId: '11',
        playerId: 7,
      };

      // Render the component
      const { container, getByText } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      // Verify the component rendered
      expect(container.firstChild).toBeTruthy();

      // Verify signature script is displayed (text may be split across elements)
      expect(container.textContent).toContain("Gladiator's Tenacity");

      // Verify focus script transformation is displayed
      expect(container.textContent).toContain('Healing Contingency');

      // Verify Warding Contingency (damage shield effect) is shown in effects
      expect(container.textContent).toContain('Warding Contingency');

      // Create snapshot
      expect(container.firstChild).toMatchSnapshot();
    });

    it("should render Ulfsild's Contingency with only signature script (no focus detection)", () => {
      // Test case where only signature script is detected
      const mockScribingData = {
        grimoireName: "Ulfsild's Contingency",
        effects: [
          {
            abilityId: 217654,
            abilityName: 'Tenacious Contingency',
            type: 'buff' as const,
            count: 24,
          },
        ],
        wasCastInFight: true,
        recipe: {
          grimoire: "Ulfsild's Contingency",
          transformation: "Gladiator's Tenacity",
          transformationType: 'signature',
          signatureScript: "Gladiator's Tenacity",
          signatureScriptKey: 'gladiators-tenacity',
          confidence: 1.0,
          matchMethod: 'combat-analysis',
          recipeSummary: "Ulfsild's Contingency + Gladiator's Tenacity (Signature)",
          tooltipInfo: 'Signature script detected, focus script unknown',
        },
        signatureScript: {
          name: "Gladiator's Tenacity",
          confidence: 1.0,
          detectionMethod: 'Post-Cast Pattern Analysis',
          evidence: ['Analyzed 6 casts', 'Top effect: buff ID 217654 (24/6 casts)'],
        },
        affixScripts: [],
      };

      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: mockScribingData,
        loading: false,
        error: null,
      });

      const tooltipProps: SkillTooltipProps = {
        name: "Ulfsild's Contingency",
        abilityId: 240150,
        description: <>A contingency effect that activates under certain conditions.</>,
        headerBadge: 'Active',
        lineText: 'Scribing — Soul Magic',
        iconSlug: 'ability_grimoire_ulfsilds_contingency',
        stats: [{ label: 'Cost', value: '4320 Magicka' }],
        fightId: '11',
        playerId: 7,
      };

      const { container, getByText } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      // Verify signature script is displayed
      expect(container.textContent).toContain("Gladiator's Tenacity");

      // Create snapshot
      expect(container.firstChild).toMatchSnapshot();
    });

    it("should handle loading state for Ulfsild's Contingency", () => {
      // Mock loading state
      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: null,
        loading: true,
        error: null,
      });

      const tooltipProps: SkillTooltipProps = {
        name: "Ulfsild's Contingency",
        abilityId: 240150,
        description: <>Loading scribing data...</>,
        headerBadge: 'Active',
        lineText: 'Scribing — Soul Magic',
        iconSlug: 'ability_grimoire_ulfsilds_contingency',
        stats: [],
        fightId: '11',
        playerId: 7,
      };

      const { container } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      expect(container.firstChild).toBeTruthy();
      expect(container.firstChild).toMatchSnapshot();
    });

    it("should handle error state for Ulfsild's Contingency", () => {
      // Mock error state
      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: null,
        loading: false,
        error: 'Failed to detect scribing data',
      });

      const tooltipProps: SkillTooltipProps = {
        name: "Ulfsild's Contingency",
        abilityId: 240150,
        description: <>Error loading scribing data.</>,
        headerBadge: 'Active',
        lineText: 'Scribing — Soul Magic',
        iconSlug: 'ability_grimoire_ulfsilds_contingency',
        stats: [],
        fightId: '11',
        playerId: 7,
      };

      const { container } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      expect(container.firstChild).toBeTruthy();
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe("Edge Cases for Ulfsild's Contingency", () => {
    it("should handle Ulfsild's Contingency with no detected scripts", () => {
      // Mock case where grimoire is cast but no scripts detected
      const mockScribingData = {
        grimoireName: "Ulfsild's Contingency",
        effects: [],
        wasCastInFight: true,
        recipe: {
          grimoire: "Ulfsild's Contingency",
          transformation: 'Unknown',
          transformationType: 'unknown',
          confidence: 0.5,
          matchMethod: 'grimoire-only',
          recipeSummary: "Ulfsild's Contingency (scripts not detected)",
          tooltipInfo: 'Grimoire detected but scripts could not be identified',
        },
        affixScripts: [],
      };

      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: mockScribingData,
        loading: false,
        error: null,
      });

      const tooltipProps: SkillTooltipProps = {
        name: "Ulfsild's Contingency",
        abilityId: 222678, // Base grimoire ID
        description: <>A contingency effect.</>,
        headerBadge: 'Active',
        lineText: 'Scribing — Soul Magic',
        iconSlug: 'ability_grimoire_ulfsilds_contingency',
        stats: [],
        fightId: '11',
        playerId: 7,
      };

      const { container } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      expect(container.firstChild).toBeTruthy();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should handle different focus script (Healing instead of Damage Shield)', () => {
      // Test with Healing focus script instead of Damage Shield
      const mockScribingData = {
        grimoireName: "Ulfsild's Contingency",
        effects: [
          {
            abilityId: 217654,
            abilityName: 'Tenacious Contingency',
            type: 'buff' as const,
            count: 12,
          },
        ],
        wasCastInFight: true,
        recipe: {
          grimoire: "Ulfsild's Contingency",
          focusScript: 'Healing',
          focusScriptKey: 'healing',
          signatureScript: "Gladiator's Tenacity",
          signatureScriptKey: 'gladiators-tenacity',
          transformation: 'Healing Contingency',
          transformationType: 'focus',
          confidence: 0.95,
          matchMethod: 'combat-analysis',
          recipeSummary:
            "Ulfsild's Contingency + Healing (Focus) + Gladiator's Tenacity (Signature)",
          tooltipInfo: 'Healing variant detected',
        },
        signatureScript: {
          name: "Gladiator's Tenacity",
          confidence: 1.0,
          detectionMethod: 'Post-Cast Pattern Analysis',
          evidence: ['Consistent healing pattern detected'],
        },
        focusScript: {
          name: 'Healing',
          scriptId: 16, // Healing focus script ID
          transformation: 'Healing Contingency',
          confidence: 0.95,
          detectionMethod: 'Name Transformation Analysis',
          evidence: ['Healing effects detected after casts'],
        },
        affixScripts: [],
      };

      mockUseSkillScribingData.mockReturnValue({
        scribedSkillData: mockScribingData,
        loading: false,
        error: null,
      });

      const tooltipProps: SkillTooltipProps = {
        name: "Ulfsild's Contingency",
        abilityId: 240150,
        description: <>A healing contingency effect.</>,
        headerBadge: 'Active',
        lineText: 'Scribing — Soul Magic',
        iconSlug: 'ability_grimoire_ulfsilds_contingency',
        stats: [],
        fightId: '11',
        playerId: 7,
      };

      const { container, getByText } = render(
        <TestWrapper>
          <SkillTooltip {...tooltipProps} />
        </TestWrapper>,
      );

      expect(container.textContent).toContain("Gladiator's Tenacity");
      expect(container.textContent).toContain('Healing');
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
