import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import buildEditorReducer, { duplicateSetup, setActiveSetupIndex } from '../store/buildEditorSlice';

import { BUILD_EDITOR_SETUP_PANEL_ID, getBuildSetupTabId, SetupTabBar } from './SetupTabBar';

const renderTabBar = () => {
  const store = configureStore({ reducer: { buildEditor: buildEditorReducer } });
  store.dispatch(duplicateSetup(0));
  store.dispatch(setActiveSetupIndex(0));
  const activeSetup = store.getState().buildEditor.build.setups[0];

  if (!activeSetup) {
    throw new Error('Expected the build editor to have an active setup');
  }

  return {
    store,
    ...render(
      <Provider store={store}>
        <>
          <SetupTabBar />
          <div
            id={BUILD_EDITOR_SETUP_PANEL_ID}
            role="tabpanel"
            aria-labelledby={getBuildSetupTabId(activeSetup.id)}
          >
            Setup content
          </div>
        </>
      </Provider>,
    ),
  };
};

describe('SetupTabBar keyboard interaction', () => {
  it('gives each tab a stable id and associates it with the setup panel', () => {
    renderTabBar();

    const tabs = screen.getAllByRole('tab');
    const initialIds = tabs.map((tab) => tab.id);

    expect(new Set(initialIds)).toHaveProperty('size', tabs.length);
    for (const tab of tabs) {
      expect(tab.id).toMatch(/^build-editor-setup-tab-/);
      expect(tab).toHaveAttribute('aria-controls', 'build-editor-setup-panel');
    }

    fireEvent.click(tabs[1]);
    expect(screen.getAllByRole('tab').map((tab) => tab.id)).toEqual(initialIds);
  });

  it('uses a roving tab stop and activates the next setup with ArrowRight', async () => {
    renderTabBar();

    const [firstTab, secondTab] = screen.getAllByRole('tab');
    expect(firstTab).toHaveAttribute('tabindex', '0');
    expect(secondTab).toHaveAttribute('tabindex', '-1');

    act(() => firstTab.focus());
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(secondTab).toHaveAttribute('aria-selected', 'true');
      expect(secondTab).toHaveAttribute('tabindex', '0');
      expect(secondTab).toHaveFocus();
    });
  });

  it('supports F2 rename and restores focus after committing', async () => {
    renderTabBar();

    const firstTab = screen.getAllByRole('tab')[0];
    act(() => firstTab.focus());
    fireEvent.keyDown(firstTab, { key: 'F2' });

    const input = await screen.findByRole('textbox', { name: 'Rename setup' });
    fireEvent.change(input, { target: { value: 'Trial setup' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const renamedTab = await screen.findByRole('tab', { name: 'Setup: Trial setup' });
    await waitFor(() => expect(renamedTab).toHaveFocus());
  });

  it('preserves the selected tab and tabpanel relationship throughout inline rename', async () => {
    renderTabBar();

    const tab = screen.getByRole('tab', { name: 'Setup: Default' });
    const tabId = tab.id;
    const panel = screen.getByRole('tabpanel', { name: 'Setup: Default' });

    expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', tabId);

    fireEvent.keyDown(tab, { key: 'F2' });
    const input = await screen.findByRole('textbox', { name: 'Rename setup' });
    const tabDuringRename = screen.getByRole('tab', { name: 'Setup: Default' });

    expect(tabDuringRename).toBe(tab);
    expect(tabDuringRename).toHaveAttribute('id', tabId);
    expect(tabDuringRename).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', tabId);

    fireEvent.change(input, { target: { value: 'Trial setup' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const renamedTab = await screen.findByRole('tab', { name: 'Setup: Trial setup' });

    expect(renamedTab).toBe(tab);
    expect(renamedTab).toHaveAttribute('id', tabId);
    expect(renamedTab).toHaveAttribute('aria-controls', panel.id);
    expect(screen.getByRole('tabpanel', { name: 'Setup: Trial setup' })).toBe(panel);
    expect(panel).toHaveAttribute('aria-labelledby', tabId);
  });

  it('exposes a visible rename action for the active setup', async () => {
    renderTabBar();

    fireEvent.click(screen.getByRole('button', { name: 'Rename Default' }));

    const input = await screen.findByRole('textbox', { name: 'Rename setup' });
    fireEvent.keyDown(input, { key: 'Escape' });

    const activeTab = await screen.findByRole('tab', { name: 'Setup: Default' });
    await waitFor(() => expect(activeTab).toHaveFocus());
  });
});
