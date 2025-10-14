/**
 * @file SkillTooltip.scribing-debug.test.tsx
 *
 * Debug test to investigate what scribing data is actually being returned
 * for Shattering Knife (Player 1, Fight 11)
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { SkillTooltip } from './SkillTooltip';
import type { SkillTooltipProps } from './SkillTooltip';
import { useSkillScribingData } from '../features/scribing/hooks/useScribingDetection';

// Mock the logger to avoid context issues
jest.mock('../hooks/useLogger', () => ({
  useLogger: () => ({
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock Redux store
const mockStore = configureStore({
  reducer: {
    ui: (state = {}) => state,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Mock theme
const mockTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

// Wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={mockStore}>
    <ThemeProvider theme={mockTheme}>{children}</ThemeProvider>
  </Provider>
);

// Create a separate component to test the hook directly
const ScribingDataInspector: React.FC<{
  fightId?: string;
  playerId?: number;
  abilityId?: number;
}> = ({ fightId, playerId, abilityId }) => {
  const scribingResult = useSkillScribingData(fightId, playerId, abilityId);

  // Log the result for inspection
  console.log('🔍 Scribing Data Debug:', {
    fightId,
    playerId,
    abilityId,
    result: scribingResult,
  });

  return (
    <div data-testid="scribing-data">
      <pre>{JSON.stringify(scribingResult, null, 2)}</pre>
    </div>
  );
};

describe('SkillTooltip Scribing Detection Debug', () => {
  describe('Shattering Knife Player 1 Investigation', () => {
    it('should investigate what scribing data is returned for Shattering Knife', () => {
      const fightId = 'm2Y9FqdpMjcaZh4R-11';
      const playerId = 1;
      const abilityId = 217340;

      console.log('\n🔍 DEBUGGING SHATTERING KNIFE SCRIBING DETECTION');
      console.log('==================================================');
      console.log(`Fight ID: ${fightId}`);
      console.log(`Player ID: ${playerId}`);
      console.log(`Ability ID: ${abilityId} (Shattering Knife)`);

      const { getByTestId } = render(
        <TestWrapper>
          <ScribingDataInspector fightId={fightId} playerId={playerId} abilityId={abilityId} />
        </TestWrapper>,
      );

      const scribingDataElement = getByTestId('scribing-data');
      expect(scribingDataElement).toBeInTheDocument();

      // The console.log in ScribingDataInspector will show us what's returned
    });

    it('should test SkillTooltip with Shattering Knife and log what gets rendered', () => {
      const shatteringKnifeProps: SkillTooltipProps = {
        abilityId: 217340,
        name: 'Shattering Knife',
        description: 'Launch a magical blade that pierces through enemies, dealing Magic Damage.',
        headerBadge: 'Ultimate',
        lineText: 'Scribing - Affix',
        iconSlug: 'ability_scribing_affix_001',
        fightId: 'm2Y9FqdpMjcaZh4R-11',
        playerId: 1,
      };

      console.log('\n🎯 TESTING SKILLTOOLTIP WITH SHATTERING KNIFE');
      console.log('=============================================');

      const { container } = render(
        <TestWrapper>
          <SkillTooltip {...shatteringKnifeProps} />
        </TestWrapper>,
      );

      // Check if any scribing-specific content is rendered
      const scribingContent = container.querySelector(
        '[data-testid*="scribing"], [class*="scribing"], [class*="Scribing"]',
      );
      console.log('Scribing content found:', !!scribingContent);

      if (scribingContent) {
        console.log('Scribing content:', scribingContent.textContent);
      } else {
        console.log('ℹ️  No scribing-specific content detected in rendered output');
      }

      expect(container).toBeTruthy();
    });

    it('should test with various ability IDs to see which ones return scribing data', () => {
      const testAbilities = [
        { id: 217340, name: 'Shattering Knife' },
        { id: 183006, name: "Cephaliarch's Flail" },
        { id: 183430, name: 'Runic Sunder' },
        { id: 21970, name: 'Bash (control - non-scribing)' },
      ];

      console.log('\n🔬 TESTING MULTIPLE ABILITIES FOR SCRIBING DETECTION');
      console.log('===================================================');

      testAbilities.forEach((ability) => {
        console.log(`\nTesting ${ability.name} (ID: ${ability.id})`);

        render(
          <TestWrapper>
            <ScribingDataInspector
              fightId="m2Y9FqdpMjcaZh4R-11"
              playerId={1}
              abilityId={ability.id}
            />
          </TestWrapper>,
        );
      });
    });
  });
});
