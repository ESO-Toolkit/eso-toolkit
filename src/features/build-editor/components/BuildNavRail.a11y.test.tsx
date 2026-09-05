import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { SectionProgressMap } from '../hooks/useSectionProgress';

import { BuildNavRail } from './BuildNavRail';

const progress: SectionProgressMap = {
  general: false,
  character: false,
  subclassing: false,
  'class-mastery': false,
  equipment: false,
  skills: false,
  consumables: false,
  champion: false,
  passives: false,
  stats: false,
  guide: true,
  settings: false,
};

describe('BuildNavRail mobile section menu accessibility', () => {
  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('names complete and incomplete status icons for their sections', async () => {
    render(<BuildNavRail progress={progress} />);

    fireEvent.click(screen.getByRole('button', { name: 'More sections' }));

    expect(await screen.findByRole('button', { name: /^Passives$/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Guide & Media section complete' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Character section incomplete' })).toBeInTheDocument();
  });
});
