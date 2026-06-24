import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { RosterBotDocsPage } from '../RosterBotDocsPage';

const renderPage = (): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <RosterBotDocsPage />
    </MemoryRouter>,
  );

describe('RosterBotDocsPage', () => {
  it('renders the hero and core calls to action', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: /Discord Roster Bot/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Invite the bot/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Configure on the web/i })).toBeInTheDocument();
  });

  it('documents the key roster commands', () => {
    renderPage();

    expect(screen.getByText('/roster link')).toBeInTheDocument();
    expect(screen.getByText('/roster publish')).toBeInTheDocument();
    expect(screen.getByText('/roster refresh')).toBeInTheDocument();
    expect(screen.getByText('/roster config set-role')).toBeInTheDocument();
  });

  it('explains the member sign-up buttons', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /How members sign up/i })).toBeInTheDocument();
    expect(screen.getByText(/A raid lead still confirms the slot/i)).toBeInTheDocument();
  });

  it('sets the document title', () => {
    renderPage();
    expect(document.title).toBe('Discord Roster Bot Guide | ESO Toolkit');
  });
});
