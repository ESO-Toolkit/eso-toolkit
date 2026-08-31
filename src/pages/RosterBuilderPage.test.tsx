import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { createDefaultRoster } from '../types/roster';
import type { RaidRoster, RoleComposition } from '../types/roster';

import { RosterBuilderPage } from './RosterBuilderPage';

const mockDispatch = jest.fn((action: unknown) => action);
const mockDecodeRosterFromURL = jest.fn<Promise<RaidRoster | null>, [string]>();
const mockEncodeRosterToURL = jest.fn<Promise<string>, [RaidRoster]>();

jest.mock('@/hooks/useDocumentTitle', () => ({ usePageTitle: jest.fn() }));
jest.mock('../store/useAppDispatch', () => ({ useAppDispatch: () => mockDispatch }));
jest.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: false, accessToken: null }),
}));
jest.mock('../EsoLogsClientContext', () => ({
  useEsoLogsClientContext: () => ({ client: null, isReady: false }),
}));
jest.mock('../utils/rosterEncoding', () => ({
  decodeRosterFromURL: (value: string) => mockDecodeRosterFromURL(value),
  encodeRosterToURL: (roster: RaidRoster) => mockEncodeRosterToURL(roster),
}));
jest.mock('../components/RoleCompositionPicker', () => ({
  RoleCompositionPicker: ({
    composition,
    onChange,
  }: {
    composition: RoleComposition;
    onChange: (composition: RoleComposition) => void;
  }) => (
    <div>
      <span data-testid="composition">
        {composition.tanks}-{composition.healers}-{composition.dps}
      </span>
      <button type="button" onClick={() => onChange({ tanks: 3, healers: 2, dps: 7 })}>
        Shrink DPS
      </button>
    </div>
  ),
}));
jest.mock('../components/roster/RosterCardSections', () => ({
  RosterCardSections: () => null,
}));
jest.mock('../components/PerFightBuilds', () => ({ PerFightBuilds: () => null }));
jest.mock('../components/SetAssignmentManager', () => ({ SetAssignmentManager: () => null }));
jest.mock('../components/WorkInProgressDisclaimer', () => ({
  WorkInProgressDisclaimer: () => null,
}));
jest.mock('../features/roster-hub/components/PublishRosterDialog', () => ({
  PublishRosterDialog: () => null,
}));
jest.mock('../features/roster-hub/components/ServerPickerDialog', () => ({
  ServerPickerDialog: () => null,
}));

function renderBuilder(roster: RaidRoster, search = '?r=incoming'): void {
  window.history.replaceState(null, '', `/roster-builder${search}`);
  mockDecodeRosterFromURL.mockResolvedValue(roster);
  mockEncodeRosterToURL.mockResolvedValue('synced-roster');
  render(
    <MemoryRouter initialEntries={[`/roster-builder${search}`]}>
      <RosterBuilderPage />
    </MemoryRouter>,
  );
}

describe('RosterBuilderPage safety and identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockImplementation((action: unknown) => action);
  });

  it('cancels or confirms a shrink that removes populated slots', async () => {
    const roster = createDefaultRoster();
    roster.dpsSlots[7] = { ...roster.dpsSlots[7], notes: 'Do not discard' };
    renderBuilder(roster);
    await screen.findByText('Roster loaded from shared link!');

    fireEvent.click(screen.getByRole('button', { name: 'Shrink DPS' }));
    expect(
      await screen.findByRole('dialog', { name: 'Remove populated roster slots?' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('composition')).toHaveTextContent('2-2-8');

    fireEvent.click(screen.getByRole('button', { name: 'Shrink DPS' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove slots' }));
    await waitFor(() => expect(screen.getByTestId('composition')).toHaveTextContent('3-2-7'));
  });

  it('shrinks empty removed slots without prompting', async () => {
    renderBuilder(createDefaultRoster());
    await screen.findByText('Roster loaded from shared link!');

    fireEvent.click(screen.getByRole('button', { name: 'Shrink DPS' }));

    await waitFor(() => expect(screen.getByTestId('composition')).toHaveTextContent('3-2-7'));
    expect(
      screen.queryByRole('dialog', { name: 'Remove populated roster slots?' }),
    ).not.toBeInTheDocument();
  });

  it('preserves the saved id and unrelated search params while syncing r', async () => {
    renderBuilder(createDefaultRoster(), '?r=incoming&id=saved-1&campaign=prog');
    await screen.findByText('Roster loaded for editing!');

    await waitFor(
      () => expect(new URL(window.location.href).searchParams.get('r')).toBe('synced-roster'),
      { timeout: 1500 },
    );
    const params = new URL(window.location.href).searchParams;
    expect(params.get('id')).toBe('saved-1');
    expect(params.get('campaign')).toBe('prog');
  });

  it('clears saved roster identity after a successful JSON import', async () => {
    renderBuilder(createDefaultRoster(), '?r=incoming&id=saved-1&campaign=prog');
    await screen.findByText('Roster loaded for editing!');

    const imported = createDefaultRoster();
    imported.rosterName = 'Imported roster';
    const file = new File([JSON.stringify(imported)], 'roster.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Upload roster JSON file'), {
      target: { files: [file] },
    });
    await screen.findByText('Roster imported successfully!');

    expect(new URL(window.location.href).searchParams.get('id')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Save roster to My Rosters (stored locally)' }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'savedRosters/saveRoster' }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'savedRosters/updateRoster' }),
    );
  });
});
