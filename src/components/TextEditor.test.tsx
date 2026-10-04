import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { TextEditor } from './TextEditor';

jest.mock('@/hooks/useDocumentTitle', () => ({ usePageTitle: jest.fn() }));
jest.mock('@/utils/envUtils', () => ({ getBaseUrl: () => '/' }));

const selectEditorText = (): HTMLElement => {
  const editor = screen.getByRole('textbox', { name: 'ESO formatted text' });
  const range = document.createRange();
  range.selectNodeContents(editor);
  window.getSelection()?.removeAllRanges();
  window.getSelection()?.addRange(range);
  return editor;
};

const openPicker = (): HTMLElement => {
  const trigger = screen.getAllByRole('button', { name: 'Choose custom color' })[0];
  fireEvent.click(trigger);
  return trigger;
};

describe('TextEditor color picker keyboard interaction', () => {
  const execCommand = jest.fn(() => true);

  beforeEach(() => {
    document.execCommand = execCommand;
    execCommand.mockClear();
  });

  afterEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  it('exposes the editable document as a named multiline textbox', () => {
    render(<TextEditor />);
    expect(screen.getByRole('textbox', { name: 'ESO formatted text' })).toHaveAttribute(
      'aria-multiline',
      'true',
    );
  });

  it('cancels with Enter without applying color or returning focus to selected content', async () => {
    const user = userEvent.setup();
    render(<TextEditor />);
    const editor = selectEditorText();
    const originalContent = editor.innerHTML;
    const trigger = openPicker();
    screen.getByRole('button', { name: 'Cancel' }).focus();

    await user.keyboard('{Enter}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(execCommand).not.toHaveBeenCalled();
    expect(editor.innerHTML).toBe(originalContent);
    expect(trigger).toHaveFocus();
    // A following Enter activates the trigger, never the selected document.
    await user.keyboard('{Enter}');
    expect(editor.innerHTML).toBe(originalContent);
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('supports Escape dismissal from the hex input without modifying content', () => {
    render(<TextEditor />);
    const editor = selectEditorText();
    const originalContent = editor.innerHTML;
    const trigger = openPicker();
    const input = screen.getByRole('textbox', { name: 'Hex color input' });
    input.focus();
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(execCommand).not.toHaveBeenCalled();
    expect(editor.innerHTML).toBe(originalContent);
    expect(trigger).toHaveFocus();
  });

  it('applies the entered color once and consumes Enter before the browser can edit text', () => {
    render(<TextEditor />);
    selectEditorText();
    const trigger = openPicker();
    const input = screen.getByRole('textbox', { name: 'Hex color input' });
    fireEvent.change(input, { target: { value: '#123456' } });
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    fireEvent(input, event);

    expect(event.defaultPrevented).toBe(true);
    expect(execCommand).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith('foreColor', false, '#123456');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('activates the Apply button once with Enter', async () => {
    const user = userEvent.setup();
    render(<TextEditor />);
    selectEditorText();
    const selectedText = window.getSelection()?.toString();
    let formattedSelection = '';
    execCommand.mockImplementationOnce(() => {
      formattedSelection = window.getSelection()?.toString() ?? '';
      return true;
    });
    openPicker();
    within(screen.getByRole('dialog')).getByRole('button', { name: /Apply/ }).focus();

    await user.keyboard('{Enter}');

    expect(execCommand).toHaveBeenCalledTimes(1);
    expect(formattedSelection).toBe(selectedText);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves Enter outside the non-modal picker alone', () => {
    render(<TextEditor />);
    const editor = selectEditorText();
    openPicker();
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(execCommand).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
