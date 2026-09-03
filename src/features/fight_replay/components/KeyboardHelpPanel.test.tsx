/**
 * KeyboardHelpPanel: renders its sections FROM the shared REPLAY_SHORTCUTS registry now (see that
 * module's doc) instead of a private hardcoded table. This test is the thing that keeps that
 * honest — it asserts every registered shortcut's key chip and description actually appear in the
 * rendered panel, so a row added to the registry without a corresponding render (or vice versa)
 * fails here instead of silently drifting, which is exactly the bug class this refactor closes.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

import { REPLAY_SHORTCUTS } from '../constants/replayShortcuts';

import { KeyboardHelpPanel } from './KeyboardHelpPanel';

describe('KeyboardHelpPanel', () => {
  it('renders every registered shortcut key + description', () => {
    render(<KeyboardHelpPanel open onClose={jest.fn()} />);

    for (const shortcut of REPLAY_SHORTCUTS) {
      expect(screen.getByText(shortcut.keys)).toBeInTheDocument();
      expect(screen.getByText(shortcut.description)).toBeInTheDocument();
    }
  });

  it('renders the three section headers in Camera → Playback → View order', () => {
    render(<KeyboardHelpPanel open onClose={jest.fn()} />);

    const headers = ['Camera', 'Playback', 'View'].map((title) => screen.getByText(title));
    // getBoundingClientRect/DOM order isn't meaningful in jsdom, but document position (compareDocumentPosition)
    // reflects render order, which is what we actually care about here.
    for (let i = 1; i < headers.length; i++) {
      const relative = headers[i - 1].compareDocumentPosition(headers[i]);
      expect(relative & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('shows the close button and calls onClose when clicked', async () => {
    const onClose = jest.fn();
    render(<KeyboardHelpPanel open onClose={onClose} />);

    screen.getByLabelText('Hide keyboard controls').click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
