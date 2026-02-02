import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { HeaderBar } from './HeaderBar';
import { useAuth } from '../features/auth/AuthContext';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../features/auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../features/auth/auth', () => ({
  LOCAL_STORAGE_ACCESS_TOKEN_KEY: 'eso-access-token',
  startPKCEAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('HeaderBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isLoggedIn: false,
      currentUser: null,
      userLoading: false,
      userError: null,
      refetchUser: jest.fn(),
      rebindAccessToken: jest.fn(),
    } as ReturnType<typeof useAuth>);
  });

  it('navigates to the about page from the tools menu', async () => {
    render(
      <MemoryRouter>
        <HeaderBar />
      </MemoryRouter>,
    );

    const toolsButtons = screen.getAllByRole('button', { name: /tools/i });
    await userEvent.click(toolsButtons[0]);

    const aboutMenuItem = await screen.findByRole('menuitem', { name: /about/i });
    await userEvent.click(aboutMenuItem);

    expect(mockNavigate).toHaveBeenCalledWith('/about');
  });
});
