/**
 * Focused on the three terminal states and what each one tells a crawler.
 *
 * The page had no tests at all, and its SEO-relevant behaviour was invisible:
 * a nonexistent player left `document.title` at the shell's generic
 * "ESO Toolkit", which is also what a still-loading page shows, so nothing in
 * the document distinguished a soft 404 from a working profile.
 */

import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';

import { useAuth } from '../../features/auth/AuthContext';
import { rosterHubApi } from '../../features/roster-hub/api/roster-hub-api';
import type { UserProfile } from '../../features/roster-hub/types/roster-hub.types';
import { PublicProfilePage } from '../PublicProfilePage';

jest.mock('../../features/auth/AuthContext', () => ({ useAuth: jest.fn() }));
// Fetches ESO Logs reports through a proxy; irrelevant to what is asserted here
// and would leave pending requests after every test.
jest.mock('../../features/profile_logs/ProfileLogsPanel', () => ({
  ProfileLogsPanel: () => null,
}));

// Pulls in `import.meta.env`, which Jest cannot parse. Only the three trial
// lookup tables are used by this page, and every profile rendered here has an
// empty roster list, so they are never read.
jest.mock('../../features/roster-hub/components/RosterCard', () => ({
  TRIAL_ACCENT: {},
  TRIAL_LABELS: {},
  TRIAL_SHORT: {},
}));

const mockUseAuth = useAuth as unknown as jest.MockedFunction<typeof useAuth>;

const PROFILE: UserProfile = {
  username: 'Bob',
  bio: '',
  avatar_url: null,
  avatar_thumb_url: null,
  build_count: 0,
  roster_count: 0,
  builds: [],
  rosters: [],
  eso_logs_user_id: null,
  na_display_name: null,
  eu_display_name: null,
};

const robotsContent = (): string | null =>
  document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null;

const canonicalHref = (): string | null =>
  document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;

function renderAt(username: string) {
  return render(
    <ThemeProvider theme={createTheme()}>
      <MemoryRouter initialEntries={[`/u/${username}`]}>
        <Routes>
          <Route path="/u/:username" element={<PublicProfilePage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    accessToken: null,
    isLoggedIn: false,
    isBanned: false,
    banReason: null,
    currentUser: null,
    userLoading: false,
    userError: null,
    setAccessToken: jest.fn(),
    rebindAccessToken: jest.fn(),
    refetchUser: jest.fn(),
  } as unknown as ReturnType<typeof useAuth>);
});

afterEach(() => {
  jest.restoreAllMocks();
  document.head.querySelectorAll('meta[name="robots"]').forEach((el) => el.remove());
  document.head.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
  document.title = 'ESO Toolkit';
});

describe('PublicProfilePage indexability', () => {
  it('is indexable and self-canonical when the profile resolves', async () => {
    jest.spyOn(rosterHubApi, 'getUserProfile').mockResolvedValue({ profile: PROFILE });

    // Requested with the wrong casing on purpose: the canonical must name the
    // casing the API returned, so /u/bob and /u/Bob consolidate onto one page.
    renderAt('bob');

    await waitFor(() => expect(document.title).toBe('Bob | ESO Toolkit'));
    expect(canonicalHref()).toBe('https://esotk.com/u/Bob/');
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('noindexes and retitles a player that does not exist', async () => {
    jest.spyOn(rosterHubApi, 'getUserProfile').mockRejectedValue(new Error('404 Not Found'));

    renderAt('ghost');

    await waitFor(() => expect(screen.getByText('Player not found')).toBeInTheDocument());
    expect(document.title).toBe('Player not found | ESO Toolkit');
    expect(robotsContent()).toBe('noindex, nofollow');
    // Nothing to point at, so the shell's canonical is left alone rather than
    // aimed at a URL that renders a soft 404.
    expect(canonicalHref()).toBeNull();
  });

  it('does not report a network failure as a missing player', async () => {
    jest
      .spyOn(rosterHubApi, 'getUserProfile')
      .mockRejectedValue(new Error('Request timed out. Check your connection and try again.'));

    renderAt('bob');

    await waitFor(() =>
      expect(screen.getByText('Could not load this profile')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Player not found')).not.toBeInTheDocument();
    expect(document.title).toBe('Profile unavailable | ESO Toolkit');
    expect(robotsContent()).toBe('noindex, nofollow');
  });

  it('percent-encodes the username in the canonical', async () => {
    // Author names in this system are not guaranteed plain ASCII (see #1314,
    // where they were HTML-escaped on store). An unencoded space or non-ASCII
    // character produces an href crawlers discard.
    jest
      .spyOn(rosterHubApi, 'getUserProfile')
      .mockResolvedValue({ profile: { ...PROFILE, username: 'Bob the Bosmer' } });

    renderAt('Bob%20the%20Bosmer');

    await waitFor(() => expect(document.title).toBe('Bob the Bosmer | ESO Toolkit'));
    expect(canonicalHref()).toBe('https://esotk.com/u/Bob%20the%20Bosmer/');
  });

  it('leaves the loading state indexable', async () => {
    // `!profile` is true for the whole fetch window. Noindexing it would let a
    // crawler that renders during a slow lookup drop a real profile.
    let resolve: (value: { profile: UserProfile }) => void = () => undefined;
    jest.spyOn(rosterHubApi, 'getUserProfile').mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    renderAt('bob');

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    await act(async () => {
      resolve({ profile: PROFILE });
    });
    await waitFor(() => expect(document.title).toBe('Bob | ESO Toolkit'));
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('recovers when the retry succeeds', async () => {
    const getUserProfile = jest
      .spyOn(rosterHubApi, 'getUserProfile')
      .mockRejectedValueOnce(new Error('Request timed out. Check your connection and try again.'))
      .mockResolvedValueOnce({ profile: PROFILE });

    renderAt('bob');

    await waitFor(() =>
      expect(screen.getByText('Could not load this profile')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(document.title).toBe('Bob | ESO Toolkit'));
    expect(getUserProfile).toHaveBeenCalledTimes(2);
    // The state-based noindex must lift once there is something worth indexing.
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});
