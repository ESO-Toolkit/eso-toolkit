/**
 * PublishBuildDialog — create-mode pre-fill + publish-time blob re-sync.
 *
 * Create mode seeds Title/Description from the build's own name/shortDescription
 * (via defaultTitle/defaultDescription) so the author doesn't retype them, and
 * on publish the encoded build_data is re-encoded so its embedded name/
 * description match what's actually published. Edit mode keeps pre-filling from
 * the already-published build and ignores the defaults.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { PublishBuildDialog } from '../PublishBuildDialog';
import type { HubBuild } from '../../types/build-hub.types';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('../../api/build-hub-api', () => ({
  buildHubApi: {
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

const mockDecode = jest.fn();
const mockEncode = jest.fn();
jest.mock('../../../../utils/buildEncoding', () => ({
  decodeBuildFromURL: (...args: unknown[]) => mockDecode(...args),
  encodeBuildToURL: (...args: unknown[]) => mockEncode(...args),
}));

const baseProps = {
  open: true,
  buildData: 'ENCODED_ORIGINAL',
  esoClass: 'sorcerer',
  role: 'magicka-dps',
  gameMode: 'pve',
  token: 'tok',
  onClose: jest.fn(),
  onPublished: jest.fn(),
};

const titleInput = (): HTMLInputElement =>
  screen.getByRole('textbox', { name: /title/i }) as HTMLInputElement;
const descInput = (): HTMLInputElement =>
  screen.getByRole('textbox', { name: /description/i }) as HTMLInputElement;

beforeEach(() => {
  mockCreate.mockReset().mockResolvedValue(undefined);
  mockUpdate.mockReset().mockResolvedValue(undefined);
  // A minimal decoded build the component can spread + re-encode.
  mockDecode.mockReset().mockResolvedValue({
    name: 'Lightning Sorc',
    shortDescription: 'A tagline',
    settings: { visibility: 'public', dlc: 'Base Game', setupOrder: [0] },
  });
  mockEncode.mockReset().mockResolvedValue('ENCODED_SYNCED');
});

describe('PublishBuildDialog pre-fill', () => {
  it('seeds Title and Description from the build in create mode', () => {
    render(
      <PublishBuildDialog
        {...baseProps}
        defaultTitle="Lightning Sorc"
        defaultDescription="Pew pew lightning build"
      />,
    );
    expect(titleInput().value).toBe('Lightning Sorc');
    expect(descInput().value).toBe('Pew pew lightning build');
  });

  it('starts blank when the build has no name/description', () => {
    render(<PublishBuildDialog {...baseProps} />);
    expect(titleInput().value).toBe('');
    expect(descInput().value).toBe('');
  });

  it('ignores defaults in edit mode and uses the published title/description', () => {
    const editingBuild = {
      id: 'b1',
      title: 'Published Title',
      description: 'Published description',
      tags: ['meta'],
      is_anonymous: false,
      visibility: 'public',
    } as unknown as HubBuild;
    render(
      <PublishBuildDialog
        {...baseProps}
        editingBuild={editingBuild}
        defaultTitle="IGNORED"
        defaultDescription="IGNORED"
      />,
    );
    expect(titleInput().value).toBe('Published Title');
    expect(descInput().value).toBe('Published description');
  });
});

describe('PublishBuildDialog publish-time sync', () => {
  it('re-encodes the blob with the edited title/description and creates with synced data', async () => {
    render(
      <PublishBuildDialog
        {...baseProps}
        defaultTitle="Lightning Sorc"
        defaultDescription="A tagline"
      />,
    );

    // Author refines the public-facing title before publishing.
    fireEvent.change(titleInput(), { target: { value: 'Endgame Lightning Sorc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));

    // Re-encoded with the new identity (name + shortDescription).
    expect(mockEncode).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Endgame Lightning Sorc',
        shortDescription: 'A tagline',
      }),
    );
    const [payload] = mockCreate.mock.calls[0];
    expect(payload).toMatchObject({
      title: 'Endgame Lightning Sorc',
      description: 'A tagline',
      build_data: 'ENCODED_SYNCED',
    });
  });

  it('keeps the original blob when nothing diverges (no re-encode needed)', async () => {
    render(
      <PublishBuildDialog
        {...baseProps}
        defaultTitle="Lightning Sorc"
        defaultDescription="A tagline"
      />,
    );
    // Publish without editing — decoded name/desc/visibility already match.
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockEncode).not.toHaveBeenCalled();
    const [payload] = mockCreate.mock.calls[0];
    expect(payload.build_data).toBe('ENCODED_ORIGINAL');
  });

  it('fails closed: switching visibility with a failed re-encode aborts publish (no stale blob sent)', async () => {
    // Decoded blob is Public; the author switches to Private but the re-encode
    // fails. The dialog must NOT publish a Public self-contained blob tagged
    // Private — it surfaces an error and never calls the API.
    mockEncode.mockResolvedValue(''); // re-encode fails

    render(
      <PublishBuildDialog
        {...baseProps}
        visibility="public"
        defaultTitle="Lightning Sorc"
        defaultDescription="A tagline"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /private/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() =>
      expect(screen.getByText(/could not apply the selected visibility/i)).toBeInTheDocument(),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('still publishes when only title/description drift and re-encode fails (keeps original blob)', async () => {
    // Title changed but visibility unchanged; re-encode fails. Title/description
    // drift is cosmetic, never a privacy leak, so the publish proceeds with the
    // original blob rather than failing closed.
    mockEncode.mockResolvedValue(''); // re-encode fails

    render(
      <PublishBuildDialog
        {...baseProps}
        visibility="public"
        defaultTitle="Lightning Sorc"
        defaultDescription="A tagline"
      />,
    );

    fireEvent.change(titleInput(), { target: { value: 'Renamed Build' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const [payload] = mockCreate.mock.calls[0];
    expect(payload).toMatchObject({ title: 'Renamed Build', build_data: 'ENCODED_ORIGINAL' });
  });

  it('blocks publishing with an empty title', () => {
    render(<PublishBuildDialog {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(screen.getByText(/please enter a title/i)).toBeInTheDocument();
  });
});
