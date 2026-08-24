import { render, screen } from '@testing-library/react';
import React from 'react';

import { PlayerDisplayName } from '../PlayerDisplayName';

describe('PlayerDisplayName', () => {
  it('uses the self-hosted heading font at a readable supported weight', () => {
    render(<PlayerDisplayName displayName="@ForumReady" characterName="Tanky McTankface" />);

    const displayName = screen.getByText('@ForumReady');

    expect(displayName).toHaveStyle({
      fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
      fontWeight: '600',
    });
  });

  it('keeps the character name available as the account-name tooltip label', () => {
    render(<PlayerDisplayName displayName="@ForumReady" characterName=" Tanky McTankface " />);

    expect(screen.getByText('@ForumReady')).toHaveAccessibleName('Tanky McTankface');
  });
});
