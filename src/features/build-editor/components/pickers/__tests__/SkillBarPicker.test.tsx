/**
 * Tests for the SkillBarPicker skill-selection UX.
 *
 * The picker's core requirement is that users can identify a skill/morph
 * without relying on the icon image alone — every option must surface its
 * name, a BASE/MORPH label, and a readable description.
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';

import { SkillBarPicker } from '../SkillBarPicker';
import { searchSkills } from '../../../../loadout-manager/data/skillLineSkills';
import type { SkillsConfig } from '../../../../loadout-manager/types/loadout.types';

const emptySkills: SkillsConfig = { 0: {}, 1: {} };

/** Stateful wrapper so selections actually update the controlled `skills` prop. */
const Harness: React.FC<{ initial?: SkillsConfig; onChange?: (s: SkillsConfig) => void }> = ({
  initial = emptySkills,
  onChange,
}) => {
  const [skills, setSkills] = useState<SkillsConfig>(initial);
  return (
    <ThemeProvider theme={createTheme()}>
      <SkillBarPicker
        skills={skills}
        selectedClassLineIds={[]}
        onChange={(updated) => {
          setSkills(updated);
          onChange?.(updated);
        }}
      />
    </ThemeProvider>
  );
};

/** Open the front-bar slot-1 picker (both bars expose a "Skill slot 1" tile). */
const openFirstSlotPicker = (): void => {
  const tiles = screen.getAllByRole('button', { name: /Skill slot 1\b/i });
  fireEvent.click(tiles[0]);
};

const search = (value: string): void => {
  fireEvent.change(screen.getByPlaceholderText('Search skills...'), { target: { value } });
};

describe('SkillBarPicker', () => {
  it('renders search results with a name, BASE/MORPH label and description (not icon-only)', () => {
    render(<Harness />);
    openFirstSlotPicker();
    search('Searing');

    // The skill name is shown as text — users never have to decode the icon.
    expect(screen.getByText('Searing Strike')).toBeInTheDocument();
    // The base/morph classification is labeled.
    expect(screen.getAllByText('BASE').length).toBeGreaterThan(0);
    // An info affordance exists so the full description is reachable on touch.
    expect(screen.getByRole('button', { name: /More about Searing Strike/i })).toBeInTheDocument();
  });

  it('opens a description popover when the info button is clicked', () => {
    render(<Harness />);
    openFirstSlotPicker();
    search('Searing');

    fireEvent.click(screen.getByRole('button', { name: /More about Searing Strike/i }));

    // The popover surfaces the full ability description text.
    const popover = document.querySelector('.MuiPopover-paper') as HTMLElement;
    expect(popover).toBeInTheDocument();
    expect(within(popover).getByText(/Flame Damage/i)).toBeInTheDocument();
  });

  it('calls onChange with the selected skill when a result row is clicked', () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    openFirstSlotPicker();
    search('Searing');

    fireEvent.click(screen.getByRole('button', { name: /Searing Strike \(base ability\)/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as SkillsConfig;
    // Front bar (0), slot 3 ("Slot 1") now holds an ability id.
    expect(updated[0][3]).toEqual(expect.any(Number));
  });

  it('marks the currently slotted skill so the active morph is obvious', () => {
    const searingStrike = searchSkills('Searing Strike', 10).find(
      (s) => s.name === 'Searing Strike',
    );
    expect(searingStrike).toBeDefined();

    render(<Harness initial={{ 0: { 3: searingStrike!.id }, 1: {} }} />);
    openFirstSlotPicker();
    search('Searing');

    // The currently slotted skill is flagged in the list.
    expect(screen.getAllByText('SLOTTED').length).toBeGreaterThan(0);
  });

  it('reveals labeled morph names when a class skill line is expanded', () => {
    render(<Harness />);
    openFirstSlotPicker();

    // Class tab is the default. Expand the Ardent Flame line.
    fireEvent.click(screen.getByText('Ardent Flame'));

    // Morphs of Searing Strike are shown by name, with a MORPH label.
    expect(screen.getByText('Searing Claw')).toBeInTheDocument();
    expect(screen.getByText('Burning Embers')).toBeInTheDocument();
    expect(screen.getAllByText('MORPH').length).toBeGreaterThan(0);

    // Each morph row carries the morph annotation in its accessible label.
    expect(
      within(screen.getByRole('button', { name: /Searing Claw \(morph\)/i })).getByText(
        'Searing Claw',
      ),
    ).toBeInTheDocument();
  });
});
