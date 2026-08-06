import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';

import { useSkillScribingData } from '../features/scribing/hooks/useScribingDetection';

import { SkillTooltip } from './SkillTooltip';
import type { SkillTooltipProps } from './SkillTooltip';

jest.mock('../features/scribing/hooks/useScribingDetection', () => ({
  useSkillScribingData: jest.fn(),
}));

jest.mock('../hooks/useLogger', () => ({
  useLogger: () => ({ warn: jest.fn(), info: jest.fn(), error: jest.fn() }),
}));

const mockUseSkillScribingData = useSkillScribingData as jest.MockedFunction<
  typeof useSkillScribingData
>;

const theme = createTheme({ palette: { mode: 'dark' } });
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);

const baseProps: SkillTooltipProps = {
  name: 'Leashing Soul',
  abilityId: 217784,
  iconSlug: 'ability_grimoire_soulmagic1',
  lineText: 'Scribing — Wield Soul',
  description: '',
};

describe('SkillTooltip - Kalpa ground-truth scripts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('overrides inferred signature/affix with ground truth even when the skill was cast', () => {
    // Inference DID run (wasCastInFight: true) and normally wins — but ground truth must
    // still take precedence, since it is exact.
    mockUseSkillScribingData.mockReturnValue({
      scribedSkillData: {
        grimoireName: 'Wield Soul',
        effects: [],
        wasCastInFight: true,
        signatureScript: {
          name: 'Inferred Signature',
          confidence: 0.6,
          detectionMethod: 'effect-analysis',
          evidence: ['guessed'],
        },
        affixScripts: [
          {
            id: 'inferred',
            name: 'Inferred Affix',
            description: '',
            confidence: 0.5,
            detectionMethod: 'effect-analysis',
            evidence: { buffIds: [], debuffIds: [], abilityNames: [], occurrenceCount: 3 },
          },
        ],
      },
      loading: false,
      error: null,
    });

    const { container } = render(
      <TestWrapper>
        <SkillTooltip
          {...baseProps}
          groundTruthScripts={{
            focusScript: 'Pull',
            signatureScript: 'Lingering Torment',
            affixScript: 'Defile',
          }}
        />
      </TestWrapper>,
    );

    const text = container.textContent ?? '';
    // Ground-truth values render...
    expect(text).toContain('Lingering Torment');
    expect(text).toContain('Defile');
    expect(text).toContain('via Kalpa native evidence');
    // ...and the inferred guesses are replaced, not shown.
    expect(text).not.toContain('Inferred Signature');
    expect(text).not.toContain('Inferred Affix');
  });

  it('renders ground-truth scripts even when the skill was never cast (no inference)', () => {
    mockUseSkillScribingData.mockReturnValue({
      scribedSkillData: null,
      loading: false,
      error: null,
    });

    const { container } = render(
      <TestWrapper>
        <SkillTooltip
          {...baseProps}
          groundTruthScripts={{
            focusScript: 'Pull',
            signatureScript: 'Lingering Torment',
            affixScript: 'Defile',
          }}
        />
      </TestWrapper>,
    );

    const text = container.textContent ?? '';
    expect(text).toContain('Lingering Torment');
    expect(text).toContain('Defile');
    expect(text).toContain('via Kalpa native evidence');
  });

  it('leaves the inferred display untouched when there is no ground truth', () => {
    mockUseSkillScribingData.mockReturnValue({
      scribedSkillData: {
        grimoireName: 'Wield Soul',
        effects: [],
        wasCastInFight: true,
        signatureScript: {
          name: 'Inferred Signature',
          confidence: 0.6,
          detectionMethod: 'effect-analysis',
          evidence: ['guessed'],
        },
      },
      loading: false,
      error: null,
    });

    const { container } = render(
      <TestWrapper>
        <SkillTooltip {...baseProps} />
      </TestWrapper>,
    );

    const text = container.textContent ?? '';
    expect(text).toContain('Inferred Signature');
    expect(text).not.toContain('via Kalpa native evidence');
  });
});
