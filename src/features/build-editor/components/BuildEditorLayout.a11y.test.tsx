import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import buildEditorReducer from '../store/buildEditorSlice';

import { BuildEditorLayout } from './BuildEditorLayout';
import { BUILD_EDITOR_SETUP_PANEL_ID } from './SetupTabBar';

jest.mock('../hooks/useSaveBuild', () => ({
  useSaveBuild: () => jest.fn(),
}));

jest.mock('../hooks/useSaveShortcut', () => ({
  useSaveShortcut: () => undefined,
}));

jest.mock('../hooks/useSectionProgress', () => ({
  useSectionProgress: () => ({
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
    guide: false,
    settings: false,
  }),
}));

jest.mock('./BuildCompletionHeader', () => ({
  BuildCompletionHeader: () => <div data-testid="completion-header" />,
}));

jest.mock('./BuildNavRail', () => ({
  BuildNavRail: () => <nav aria-label="Build editor sections" />,
}));

jest.mock('./primitives/LazySection', () => ({
  LazySection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./primitives/SectionCard', () => ({
  SectionCard: ({ title }: { title: string }) => <section aria-label={title} />,
}));

describe('BuildEditorLayout accessibility structure', () => {
  it('has one meaningful page heading and labels the setup panel from its active tab', () => {
    const store = configureStore({ reducer: { buildEditor: buildEditorReducer } });

    render(
      <Provider store={store}>
        <BuildEditorLayout />
      </Provider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Build editor' })).toBeInTheDocument();

    const activeTab = screen.getByRole('tab', { name: 'Setup: Default' });
    const setupPanel = screen.getByRole('tabpanel', { name: 'Setup: Default' });

    expect(activeTab).toHaveAttribute('aria-controls', BUILD_EDITOR_SETUP_PANEL_ID);
    expect(setupPanel).toHaveAttribute('id', BUILD_EDITOR_SETUP_PANEL_ID);
    expect(setupPanel).toHaveAttribute('aria-labelledby', activeTab.id);
  });
});
