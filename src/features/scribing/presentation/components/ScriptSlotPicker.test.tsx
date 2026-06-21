/**
 * Focused tests for ScriptSlotPicker — specifically that a stale search query
 * cannot keep filtering (and hiding valid options) once the search box is hidden
 * for a shorter script list.
 */

import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import type { FocusScript } from '../../shared/types';

import { ScriptSlotPicker } from './ScribingSimulatorComponents';

const makeScripts = (n: number): FocusScript[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    name: `Script ${i}`,
    type: 'Focus',
    icon: '',
    compatibleGrimoires: [],
    description: `Description ${i}`,
  }));

const renderPicker = (scripts: FocusScript[]): ReturnType<typeof render> =>
  render(
    <ThemeProvider theme={createTheme()}>
      <ScriptSlotPicker slot="focus" scripts={scripts} onSelect={() => {}} />
    </ThemeProvider>,
  );

describe('ScriptSlotPicker', () => {
  it('shows the search box only for longer lists and filters by query', () => {
    renderPicker(makeScripts(8));
    const search = screen.getByLabelText('Search Focus scripts');
    fireEvent.change(search, { target: { value: 'Script 3' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('clears a stale query when the list shrinks below the search threshold', () => {
    const { rerender } = renderPicker(makeScripts(8));
    fireEvent.change(screen.getByLabelText('Search Focus scripts'), {
      target: { value: 'no-such-script' },
    });
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByText(/No matching scripts/)).toBeInTheDocument();

    // Switch to a grimoire whose focus list is short — the search box disappears.
    rerender(
      <ThemeProvider theme={createTheme()}>
        <ScriptSlotPicker slot="focus" scripts={makeScripts(3)} onSelect={() => {}} />
      </ThemeProvider>,
    );

    expect(screen.queryByLabelText('Search Focus scripts')).toBeNull();
    // The stale query is cleared, so every available option is visible.
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });
});
