import { renderHook, waitFor } from '@testing-library/react';

import { useZoneOptions } from './useZoneOptions';

const mockClient = { query: jest.fn() };

jest.mock('../../../EsoLogsClientContext', () => ({
  useEsoLogsClientInstance: () => mockClient,
}));

describe('useZoneOptions', () => {
  it('caches zones only from a complete response', async () => {
    mockClient.query.mockResolvedValue({
      worldData: {
        zones: [
          { id: 2, name: 'Arenas' },
          { id: 1, name: 'Cloudrest' },
        ],
      },
    });

    const { result } = renderHook(() => useZoneOptions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.zones.map((zone) => zone.name)).toEqual(['Cloudrest', 'Arenas']);
    expect(mockClient.query).toHaveBeenCalledWith(expect.objectContaining({ errorPolicy: 'none' }));
  });
});
