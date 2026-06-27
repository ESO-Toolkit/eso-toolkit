import { render, screen } from '@testing-library/react';

import type { ClassAnalysisResult } from '@/utils/classDetectionUtils';

import { ClassMasteryCluster } from '../ClassMasteryCluster';

const NB_AN_EYE = 263604;
const NB_ABOVE_AND_BEYOND = 263605;
const SORC_CONSERVATION = 263870;
const SORC_FONT = 263871;
const SORC_STATIC = 263872;
const SORC_CALCULATED = 263873;
const NOISE_A = 264991;
const NOISE_B = 268274;

type SkillLineEntry = ClassAnalysisResult['skillLines'][number];

const cmEntry = (className: string, ids: number[]): SkillLineEntry => ({
  skillLine: 'Class Mastery',
  className,
  count: ids.length,
  skillIds: new Set(ids),
});

const analysis = (lines: SkillLineEntry[]): ClassAnalysisResult => ({
  primary: lines[0]?.skillLine ?? null,
  skillLines: lines,
});

const masteryIcons = (): HTMLElement[] => screen.queryAllByRole('img');

describe('ClassMasteryCluster', () => {
  it('renders the labelled cluster with two passive icons', () => {
    render(
      <ClassMasteryCluster
        classAnalysis={analysis([cmEntry('Nightblade', [NB_ABOVE_AND_BEYOND, NB_AN_EYE])])}
      />,
    );

    expect(screen.getByTestId('class-mastery-cluster')).toBeInTheDocument();
    expect(screen.getByText('Class Mastery')).toBeInTheDocument();
    expect(masteryIcons()).toHaveLength(2);
    expect(screen.getByLabelText('Above and Beyond — Class Mastery passive')).toBeInTheDocument();
    expect(
      screen.getByLabelText('An Eye for Exploitation — Class Mastery passive'),
    ).toBeInTheDocument();
  });

  it('renders a single icon when only one pick is surfaced', () => {
    render(<ClassMasteryCluster classAnalysis={analysis([cmEntry('Nightblade', [NB_AN_EYE])])} />);

    expect(screen.getByTestId('class-mastery-cluster')).toBeInTheDocument();
    expect(masteryIcons()).toHaveLength(1);
  });

  it('shows exactly two icons when detection over-detects three valid ids — never three', () => {
    render(
      <ClassMasteryCluster
        classAnalysis={analysis([cmEntry('Sorcerer', [SORC_CONSERVATION, SORC_FONT, SORC_STATIC])])}
      />,
    );

    expect(masteryIcons()).toHaveLength(2);
  });

  it('drops name-matched effect ids (Showers-in-Petals shape) and shows one icon', () => {
    render(
      <ClassMasteryCluster
        classAnalysis={analysis([cmEntry('Sorcerer', [SORC_CALCULATED, NOISE_A, NOISE_B])])}
      />,
    );

    expect(masteryIcons()).toHaveLength(1);
    expect(screen.getByLabelText('Calculated Defense — Class Mastery passive')).toBeInTheDocument();
  });

  it('renders nothing for a subclassed player (no Class Mastery line)', () => {
    render(
      <ClassMasteryCluster
        classAnalysis={analysis([
          { skillLine: 'Assassination', className: 'Nightblade', count: 4, skillIds: new Set([1]) },
        ])}
      />,
    );

    expect(screen.queryByTestId('class-mastery-cluster')).not.toBeInTheDocument();
    expect(masteryIcons()).toHaveLength(0);
  });

  it('renders nothing without analysis', () => {
    render(<ClassMasteryCluster classAnalysis={undefined} />);
    expect(screen.queryByTestId('class-mastery-cluster')).not.toBeInTheDocument();
  });
});
