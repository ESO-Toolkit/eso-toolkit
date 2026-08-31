import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { BuildChampionPoints, ChampionTree } from '../../../types/build.types';
import { ChampionPointsPicker } from '../ChampionPointsPicker';

const emptyTree = (): ChampionTree => ({
  slots: [null, null, null, null],
  passives: {},
});

const championPoints: BuildChampionPoints = {
  warfare: emptyTree(),
  fitness: emptyTree(),
  craft: emptyTree(),
};

const renderPicker = (): void => {
  render(
    <ThemeProvider theme={createTheme()}>
      <ChampionPointsPicker cp={championPoints} onChange={jest.fn()} />
    </ThemeProvider>,
  );
};

const expectActiveTab = (tab: HTMLElement): void => {
  expect(tab).toHaveAttribute('aria-selected', 'true');
  expect(tab).toHaveAttribute('tabindex', '0');
  expect(tab).toHaveFocus();
};

describe('ChampionPointsPicker tree tabs', () => {
  it('associates the roving tabs with the active tree panel', () => {
    renderPicker();

    const tabs = screen.getAllByRole('tab');
    const panel = screen.getByRole('tabpanel');

    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    expect(tabs[2]).toHaveAttribute('tabindex', '-1');

    for (const tab of tabs) {
      expect(tab).toHaveAttribute('id');
      expect(tab).toHaveAttribute('aria-controls', panel.id);
    }
    expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
  });

  it('moves focus and selection with arrows, Home, and End', () => {
    renderPicker();

    const [warfareTab, fitnessTab, craftTab] = screen.getAllByRole('tab');
    warfareTab.focus();

    fireEvent.keyDown(warfareTab, { key: 'ArrowRight' });
    expectActiveTab(fitnessTab);

    fireEvent.keyDown(fitnessTab, { key: 'End' });
    expectActiveTab(craftTab);

    fireEvent.keyDown(craftTab, { key: 'Home' });
    expectActiveTab(warfareTab);

    fireEvent.keyDown(warfareTab, { key: 'ArrowLeft' });
    expectActiveTab(craftTab);

    fireEvent.keyDown(craftTab, { key: 'ArrowRight' });
    expectActiveTab(warfareTab);
  });

  it('keeps the panel labelled by the newly selected tab after click selection', () => {
    renderPicker();

    const fitnessTab = screen.getByRole('tab', { name: /Fitness/ });
    fireEvent.click(fitnessTab);

    expect(fitnessTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', fitnessTab.id);
  });
});
