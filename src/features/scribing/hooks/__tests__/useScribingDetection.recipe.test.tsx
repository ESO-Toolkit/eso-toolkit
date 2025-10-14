/**
 * Debug Test: Verify useScribingDetection returns proper recipe data
 */

import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useScribingDetection } from '../useScribingDetection';

// Mock all event hooks with proper return values
jest.mock('../../../../hooks/events/useDamageEvents', () => ({
  useDamageEvents: () => ({
    damageEvents: [],
    isDamageEventsLoading: false,
    selectedFight: null,
  }),
}));

jest.mock('../../../../hooks/events/useHealingEvents', () => ({
  useHealingEvents: () => ({
    healingEvents: [],
    isHealingEventsLoading: false,
    selectedFight: null,
  }),
}));

jest.mock('../../../../hooks/events/useFriendlyBuffEvents', () => ({
  useFriendlyBuffEvents: () => ({
    friendlyBuffEvents: [],
    isFriendlyBuffEventsLoading: false,
    selectedFight: null,
  }),
}));

jest.mock('../../../../hooks/events/useHostileBuffEvents', () => ({
  useHostileBuffEvents: () => ({
    hostileBuffEvents: [],
    isHostileBuffEventsLoading: false,
    selectedFight: null,
  }),
}));

jest.mock('../../../../hooks/events/useDebuffEvents', () => ({
  useDebuffEvents: () => ({
    debuffEvents: [],
    isDebuffEventsLoading: false,
    selectedFight: null,
  }),
}));

jest.mock('../../../../hooks/events/useCastEvents', () => ({
  useCastEvents: () => ({
    castEvents: [],
    isCastEventsLoading: false,
    selectedFight: null,
  }),
}));

jest.mock('../../../../hooks/events/useResourceEvents', () => ({
  useResourceEvents: () => ({
    resourceEvents: [],
    isResourceEventsLoading: false,
    selectedFight: null,
  }),
}));

// Mock Redux store with sample events
const mockStore = configureStore({
  reducer: {
    filters: () => ({
      friendlyBuffEvents: [],
      hostileBuffEvents: [],
      debuffEvents: [],
      damageEvents: [],
      healingEvents: [],
      castEvents: [],
      resourceEvents: [],
    }),
  },
});

describe('useScribingDetection Recipe Data', () => {
  it("should return recipe data for Ulfsild's Contingency (240150)", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={mockStore}>{children}</Provider>
    );

    const { result } = renderHook(
      () =>
        useScribingDetection({
          fightId: '11',
          playerId: 7,
          abilityId: 240150, // Ulfsild's Contingency
          enabled: true,
        }),
      { wrapper },
    );

    // Wait for the hook to finish loading
    await waitFor(() => expect(result.current.loading).toBe(false));

    console.log('=== Hook Result ===');
    console.log('scribedSkillData:', JSON.stringify(result.current.scribedSkillData, null, 2));
    console.log('loading:', result.current.loading);
    console.log('error:', result.current.error);

    // Verify recipe data exists
    expect(result.current.scribedSkillData).not.toBeNull();
    expect(result.current.scribedSkillData?.recipe).toBeDefined();
    expect(result.current.scribedSkillData?.recipe?.grimoire).toBe("Ulfsild's Contingency");
    expect(result.current.scribedSkillData?.recipe?.transformation).toBe('Healing Contingency');
    expect(result.current.scribedSkillData?.recipe?.transformationType).toBe('Healing');
  });
});
