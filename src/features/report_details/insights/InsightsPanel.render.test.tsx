import { render, screen } from '@testing-library/react';

import type { FightFragment } from '../../../graphql/gql/graphql';

import { InsightsPanel } from './InsightsPanel';

const mockUseDamageEvents = jest.fn();
const mockUsePlayerData = jest.fn();
const mockUseCombatantInfoEvents = jest.fn();
const mockInsightsPanelView = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => null),
}));

jest.mock('../../../hooks', () => ({
  useCombatantInfoEvents: (...args: unknown[]) => mockUseCombatantInfoEvents(...args),
  useDamageEvents: (...args: unknown[]) => mockUseDamageEvents(...args),
  usePlayerData: (...args: unknown[]) => mockUsePlayerData(...args),
  useResolvedReportFightContext: (context: unknown) => context,
}));

jest.mock('./InsightsPanelView', () => ({
  InsightsPanelView: (props: {
    durationMs: number;
    fightInitiator: string | null;
    isLoading: boolean;
  }) => {
    mockInsightsPanelView(props);

    if (props.isLoading) {
      return <div data-testid="insights-skeleton-layout">Loading fight insights</div>;
    }

    return (
      <section data-testid="insights-panel">
        <h1>Fight Insights</h1>
        <span data-testid="fight-duration">{props.durationMs}</span>
        <span data-testid="fight-initiator">{props.fightInitiator ?? 'Unknown'}</span>
        <span data-testid="completed-empty-stream">Data sources completed</span>
      </section>
    );
  },
}));

const fight: FightFragment = {
  encounterID: 1,
  endTime: 120_000,
  friendlyPlayers: [7],
  id: 42,
  name: 'Trial target dummy',
  startTime: 0,
};

const setupLoadedStreams = (): void => {
  mockUseDamageEvents.mockReturnValue({
    damageEvents: [
      {
        amount: 100,
        sourceID: 7,
        sourceIsFriendly: true,
        timestamp: 1_000,
      },
    ],
    isDamageEventsLoading: false,
  });
  mockUsePlayerData.mockReturnValue({
    isPlayerDataLoading: false,
    playerData: {
      playersById: {
        7: { displayName: 'Aria' },
      },
    },
  });
  mockUseCombatantInfoEvents.mockReturnValue({
    combatantInfoEvents: [],
    isCombatantInfoEventsLoading: false,
  });
};

describe('InsightsPanel direct rendering states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupLoadedStreams();
  });

  it('renders populated fight content through the view instead of a skeleton', () => {
    render(<InsightsPanel fight={fight} />);

    expect(screen.getByTestId('insights-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fight Insights' })).toBeInTheDocument();
    expect(screen.getByTestId('fight-duration')).toHaveTextContent('120000');
    expect(screen.queryByTestId('insights-skeleton-layout')).not.toBeInTheDocument();

    expect(mockInsightsPanelView).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMs: 120_000,
        isLoading: false,
      }),
    );
  });

  it('renders a completed empty stream as a known panel state, not perpetual loading', () => {
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      isDamageEventsLoading: false,
    });
    mockUsePlayerData.mockReturnValue({
      isPlayerDataLoading: false,
      playerData: { playersById: {} },
    });
    mockUseCombatantInfoEvents.mockReturnValue({
      combatantInfoEvents: [],
      isCombatantInfoEventsLoading: false,
    });

    render(<InsightsPanel fight={fight} />);

    expect(screen.getByTestId('insights-panel')).toBeInTheDocument();
    expect(screen.getByTestId('completed-empty-stream')).toHaveTextContent(
      'Data sources completed',
    );
    expect(screen.queryByTestId('insights-skeleton-layout')).not.toBeInTheDocument();
    expect(mockInsightsPanelView).toHaveBeenCalledWith(
      expect.objectContaining({ isLoading: false }),
    );
  });

  it('keeps the loading state explicit while any required stream is pending', () => {
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      isDamageEventsLoading: true,
    });

    render(<InsightsPanel fight={fight} />);

    expect(screen.getByTestId('insights-skeleton-layout')).toHaveTextContent(
      'Loading fight insights',
    );
    expect(screen.queryByTestId('insights-panel')).not.toBeInTheDocument();
    expect(mockInsightsPanelView).toHaveBeenCalledWith(
      expect.objectContaining({ isLoading: true }),
    );
  });
});
