import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { KnownSetIDs } from '../../../types/abilities';
import { getSetDisplayName } from '../../../utils/setNameUtils';

import { SetGearAutocomplete } from './SetGearAutocomplete';

/**
 * Regression for issue #1254 item 1: freeSolo gear pickers used to silently wipe
 * a stored set when the typed input didn't resolve (onChange stored `undefined`).
 * SetGearAutocomplete must instead KEEP the prior value and warn, while still
 * clearing on an empty input and resolving recognized names.
 */
describe('SetGearAutocomplete', () => {
  const OPTIONS = [
    getSetDisplayName(KnownSetIDs.CLAW_OF_YOLNAHKRIIN),
    getSetDisplayName(KnownSetIDs.LUCENT_ECHOES),
  ];

  it('resolves a recognized typed name to its set ID', async () => {
    const user = userEvent.setup();
    const onResolve = jest.fn();
    render(
      <SetGearAutocomplete value="" options={OPTIONS} label="Primary Set" onResolve={onResolve} />,
    );

    const input = screen.getByLabelText('Primary Set');
    await user.click(input);
    await user.type(input, 'Lucent Echoes');
    await user.keyboard('{Enter}');

    expect(onResolve).toHaveBeenLastCalledWith(KnownSetIDs.LUCENT_ECHOES);
  });

  it('does NOT wipe the stored set when the typed input is unrecognized — warns instead', async () => {
    const user = userEvent.setup();
    const onResolve = jest.fn();
    render(
      <SetGearAutocomplete
        value={getSetDisplayName(KnownSetIDs.CLAW_OF_YOLNAHKRIIN)}
        options={OPTIONS}
        label="Primary Set"
        onResolve={onResolve}
      />,
    );

    const input = screen.getByLabelText('Primary Set');
    // Type junk into the field and commit it as a free-typed entry.
    await user.click(input);
    await user.type(input, 'Zzzz Not A Set');
    await user.keyboard('{Enter}');

    // Prior value preserved: typing an unresolved name must NEVER call onResolve
    // (so the stored set is not wiped).
    expect(onResolve).not.toHaveBeenCalled();
    // Amber warning surfaces, telling the user the previous value was kept.
    expect(screen.getByText(/Unknown set .* — keeping previous/)).toBeInTheDocument();
  });

  it('clears the stale "unknown" warning when the bound value changes externally', async () => {
    const user = userEvent.setup();
    const onResolve = jest.fn();
    const { rerender } = render(
      <SetGearAutocomplete
        value={getSetDisplayName(KnownSetIDs.CLAW_OF_YOLNAHKRIIN)}
        options={OPTIONS}
        label="Primary Set"
        onResolve={onResolve}
      />,
    );

    const input = screen.getByLabelText('Primary Set');
    await user.click(input);
    await user.type(input, 'Zzzz Not A Set');
    await user.keyboard('{Enter}');
    expect(screen.getByText(/keeping previous/)).toBeInTheDocument();

    // The parent updates the bound set (e.g. Quick Assignment / import / undo).
    rerender(
      <SetGearAutocomplete
        value={getSetDisplayName(KnownSetIDs.LUCENT_ECHOES)}
        options={OPTIONS}
        label="Primary Set"
        onResolve={onResolve}
      />,
    );

    // The stale warning must disappear and the box reflect the new value.
    await waitFor(() => {
      expect(screen.queryByText(/keeping previous/)).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText('Primary Set')).toHaveValue('Lucent Echoes');
  });

  it('clears the set (reports undefined) when the field is emptied intentionally', async () => {
    const user = userEvent.setup();
    const onResolve = jest.fn();
    render(
      <SetGearAutocomplete
        value={getSetDisplayName(KnownSetIDs.CLAW_OF_YOLNAHKRIIN)}
        options={OPTIONS}
        label="Primary Set"
        onResolve={onResolve}
      />,
    );

    // The MUI Autocomplete clear button.
    const clearButton = screen.getByLabelText('Clear');
    await user.click(clearButton);

    expect(onResolve).toHaveBeenLastCalledWith(undefined);
  });
});
