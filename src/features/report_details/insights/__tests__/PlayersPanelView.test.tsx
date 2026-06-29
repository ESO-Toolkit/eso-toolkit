import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { CompanionBuildForPlayer } from '@/features/loadout-manager/utils/esotkCompanionReportAdapter';
import type { PlayerDetailsWithRole } from '@/store/player_data/playerDataSlice';

import { PlayersPanelView } from '../PlayersPanelView';

interface MockLazyPlayerCardProps {
  player: Pick<PlayerDetailsWithRole, 'id'>;
  companionBuild?: Pick<
    CompanionBuildForPlayer,
    'championPoints' | 'coaching' | 'stats' | 'effects' | 'scribing'
  >;
}

jest.mock('../LazyPlayerCard', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    LazyPlayerCard: ({ player, companionBuild }: MockLazyPlayerCardProps): React.ReactElement =>
      ReactActual.createElement(
        'div',
        { 'data-testid': `mock-player-card-${player.id}` },
        companionBuild?.stats?.physicalPen ?? 'no companion',
      ),
  };
});

type PlayersPanelViewProps = React.ComponentProps<typeof PlayersPanelView>;

function makePlayer(): PlayerDetailsWithRole {
  return {
    id: 1,
    guid: 1,
    name: 'Casts-A-Lot',
    displayName: 'Casts-A-Lot',
    type: 'Player',
    server: 'NA',
    anonymous: false,
    icon: '',
    specs: [],
    potionUse: 0,
    healthstoneUse: 0,
    combatantInfo: { stats: [], talents: [], gear: [] },
    role: 'dps',
  };
}

function makeProps(overrides: Partial<PlayersPanelViewProps> = {}): PlayersPanelViewProps {
  const player = makePlayer();
  return {
    playerActors: { 1: player },
    mundusBuffsByPlayer: {},
    championPointsByPlayer: {},
    aurasByPlayer: {},
    scribingSkillsByPlayer: {},
    buildIssuesByPlayer: {},
    classAnalysisByPlayer: {},
    deathsByPlayer: {},
    resurrectsByPlayer: {},
    cpmByPlayer: {},
    maxHealthByPlayer: {},
    maxStaminaByPlayer: {},
    maxMagickaByPlayer: {},
    distanceByPlayer: {},
    isLoading: false,
    playerGear: {},
    ...overrides,
  };
}

describe('PlayersPanelView companion builds', () => {
  it('passes parsed companion builds through to player cards', () => {
    render(
      <PlayersPanelView
        {...makeProps({
          companionBuildsByPlayer: {
            1: {
              championPoints: null,
              coaching: [],
              stats: { physicalPen: 12345 },
              effects: [],
              scribing: [],
            },
          },
          companionUpload: {
            fileName: 'ESOTKCompanion.lua',
            snapshotCount: 1,
            matchedCount: 1,
          },
          onCompanionFileSelected: jest.fn(async (_file: File): Promise<void> => {}),
        })}
      />,
    );

    expect(screen.getByTestId('mock-player-card-1')).toHaveTextContent('12345');
    expect(screen.getByText('Companion: 1 matched')).toBeInTheDocument();
  });

  it('invokes the companion file callback when a file is selected', () => {
    const onCompanionFileSelected = jest.fn(async (_file: File): Promise<void> => {});
    const { container } = render(
      <PlayersPanelView
        {...makeProps({
          onCompanionFileSelected,
        })}
      />,
    );

    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected companion file input');
    }

    const file = new File(['ESOTKCompanionSV = {}'], 'ESOTKCompanion.lua', {
      type: 'text/plain',
    });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onCompanionFileSelected).toHaveBeenCalledWith(file);
  });
});
