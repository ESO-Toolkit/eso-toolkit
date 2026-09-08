import { ThemeProvider, createTheme } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { tempBuildApi } from '../api/temp-build-api';
import buildEditorReducer, { setBuildName } from '../store/buildEditorSlice';
import { exportBuildToCSPSLua } from '../utils/cspsExport';

import { BuildCompletionHeader } from './BuildCompletionHeader';

const mockEncodeBuildToURL = jest.fn();

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: false, accessToken: '' }),
}));

jest.mock('@/utils/buildEncoding', () => ({
  encodeBuildToURL: (...args: unknown[]) => mockEncodeBuildToURL(...args),
}));

jest.mock('@/utils/envUtils', () => ({
  getBaseUrl: () => 'https://example.test/',
}));

jest.mock('../api/temp-build-api', () => ({
  tempBuildApi: { create: jest.fn() },
}));

jest.mock('../hooks/useBuildCompleteness', () => ({
  useBuildCompleteness: () => 40,
}));

jest.mock('../hooks/useSaveBuild', () => ({
  useSaveBuild: () => jest.fn(),
}));

jest.mock('../utils/cspsExport', () => ({
  exportBuildToCSPSLua: jest.fn(),
}));

jest.mock('./AddToRosterDialog', () => ({
  AddToRosterDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="Add build to roster" /> : null,
}));

jest.mock('@/features/build-hub/components/PublishBuildDialog', () => ({
  PublishBuildDialog: () => null,
}));

jest.mock('./ImportBuildFilePanel', () => ({ ImportBuildFilePanel: () => null }));
jest.mock('./ImportBuildImagePanel', () => ({ ImportBuildImagePanel: () => null }));
jest.mock('./ImportBuildLinkPanel', () => ({ ImportBuildLinkPanel: () => null }));
jest.mock('./ImportBuildTextPanel', () => ({ ImportBuildTextPanel: () => null }));

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() }),
}));

const mockCreateTempBuild = tempBuildApi.create as jest.MockedFunction<typeof tempBuildApi.create>;
const mockExportBuildToCSPSLua = exportBuildToCSPSLua as jest.MockedFunction<
  typeof exportBuildToCSPSLua
>;

const renderMobileHeader = () => {
  const store = configureStore({
    reducer: {
      buildEditor: buildEditorReducer,
      savedRosters: (state = { rosters: [] }) => state,
    },
  });
  store.dispatch(setBuildName('Mobile test build'));

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={createTheme()}>
          <BuildCompletionHeader />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );
};

const openMoreMenu = async (): Promise<HTMLElement> => {
  const moreButton = screen.getByRole('button', { name: 'More actions' });
  fireEvent.click(moreButton);
  await screen.findByRole('menu');
  return moreButton;
};

describe('BuildCompletionHeader mobile actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    mockEncodeBuildToURL.mockResolvedValue('encoded-build');
    mockCreateTempBuild.mockResolvedValue({
      id: 'temporary-build-id',
      expires_at: '2026-09-05T12:00:00.000Z',
    });
    mockExportBuildToCSPSLua.mockReturnValue('CSPS export contents');
  });

  it('exposes popup state and creates a guest link from the More menu', async () => {
    renderMobileHeader();

    const moreButton = screen.getByRole('button', { name: 'More actions' });
    expect(moreButton).toHaveAttribute('aria-haspopup', 'menu');
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');
    expect(moreButton).not.toHaveAttribute('aria-controls');

    await openMoreMenu();
    expect(moreButton).toHaveAttribute('aria-expanded', 'true');
    expect(moreButton).toHaveAttribute('aria-controls', 'build-editor-more-actions-menu');
    expect(document.getElementById('build-editor-more-actions-menu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Get Link' }));

    await waitFor(() => expect(mockCreateTempBuild).toHaveBeenCalledWith('encoded-build'));
    const linkInput = await screen.findByRole<HTMLInputElement>('textbox', {
      name: 'Temporary build link',
    });
    expect(linkInput.value).toContain('/b/temporary-build-id');
    expect(screen.getByText(/September 5, 2026/)).toBeInTheDocument();
  });

  it('opens the roster workflow from the More menu', async () => {
    renderMobileHeader();

    await openMoreMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Roster' }));

    expect(await screen.findByRole('dialog', { name: 'Add build to roster' })).toBeInTheDocument();
  });

  it('names CSPS output and exposes all five reflowing import sources', async () => {
    renderMobileHeader();

    await openMoreMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSPS' }));
    expect(await screen.findByRole('textbox', { name: 'CSPS export data' })).toHaveValue(
      'CSPS export contents',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close CSPS export dialog' }));
    await openMoreMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Import' }));

    const sourcePicker = await screen.findByRole('group', { name: 'Import source' });
    for (const source of ['.esobuild', 'Addon code', 'Build text', 'Link', 'Image']) {
      expect(sourcePicker).toContainElement(screen.getByRole('button', { name: source }));
    }
  });
});
