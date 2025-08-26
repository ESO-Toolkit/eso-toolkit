import { ApolloClient } from '@apollo/client';
import { DocumentNode } from 'graphql';

import { EsoLogsClient, createEsoLogsClient } from './esologsClient';

describe('EsoLogsClient', () => {
  const mockAccessToken = 'mock-access-token';
  const newMockAccessToken = 'new-mock-access-token';

  describe('Class-based implementation with composition', () => {
    it('should create an instance with access token', () => {
      const client = new EsoLogsClient(mockAccessToken);
      expect(client).toBeInstanceOf(EsoLogsClient);
      expect(client.getAccessToken()).toBe(mockAccessToken);
    });

    it('should contain an Apollo client instance', () => {
      const client = new EsoLogsClient(mockAccessToken);
      const apolloClient = client.getClient();
      expect(apolloClient).toBeInstanceOf(ApolloClient);
    });

    it('should update access token and recreate internal client', () => {
      const client = new EsoLogsClient(mockAccessToken);
      expect(client.getAccessToken()).toBe(mockAccessToken);
      const originalClient = client.getClient();

      client.updateAccessToken(newMockAccessToken);
      expect(client.getAccessToken()).toBe(newMockAccessToken);
      const newClient = client.getClient();

      // Should have a new Apollo client instance after token update
      expect(newClient).not.toBe(originalClient);
    });

    it('should delegate Apollo client methods', () => {
      const client = new EsoLogsClient(mockAccessToken);
      const apolloClient = client.getClient();

      // Mock the Apollo client methods with proper types
      const mockQuery = {} as DocumentNode;
      const querySpy = jest.spyOn(apolloClient, 'query').mockResolvedValue({
        data: {},
        loading: false,
        networkStatus: 7,
      });
      const mutateSpy = jest.spyOn(apolloClient, 'mutate').mockResolvedValue({
        data: {},
      });
      const watchQuerySpy = jest.spyOn(apolloClient, 'watchQuery').mockReturnValue({
        subscribe: jest.fn(),
      } as never);
      const subscribeSpy = jest.spyOn(apolloClient, 'subscribe').mockReturnValue({
        subscribe: jest.fn(),
      } as never);
      const resetStoreSpy = jest.spyOn(apolloClient, 'resetStore').mockResolvedValue([]);
      const clearStoreSpy = jest.spyOn(apolloClient, 'clearStore').mockResolvedValue([]);
      const stopSpy = jest.spyOn(apolloClient, 'stop').mockImplementation(() => {
        // Stop implementation
      });

      // Test delegation
      expect(typeof client.query).toBe('function');
      expect(typeof client.mutate).toBe('function');
      expect(typeof client.watchQuery).toBe('function');
      expect(typeof client.subscribe).toBe('function');
      expect(typeof client.resetStore).toBe('function');
      expect(typeof client.clearStore).toBe('function');
      expect(typeof client.stop).toBe('function');

      // Test that methods are properly delegated
      client.query({ query: mockQuery });
      client.mutate({ mutation: mockQuery });
      client.watchQuery({ query: mockQuery });
      client.subscribe({ query: mockQuery });
      client.resetStore();
      client.clearStore();
      client.stop();

      expect(querySpy).toHaveBeenCalled();
      expect(mutateSpy).toHaveBeenCalled();
      expect(watchQuerySpy).toHaveBeenCalled();
      expect(subscribeSpy).toHaveBeenCalled();
      expect(resetStoreSpy).toHaveBeenCalled();
      expect(clearStoreSpy).toHaveBeenCalled();
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Backward compatibility', () => {
    it('should work with factory function', () => {
      const client = createEsoLogsClient(mockAccessToken);
      expect(client).toBeInstanceOf(EsoLogsClient);
      expect(client.getAccessToken()).toBe(mockAccessToken);
    });

    it('should return same type from factory function', () => {
      const client1 = new EsoLogsClient(mockAccessToken);
      const client2 = createEsoLogsClient(mockAccessToken);

      // Both should be instances of EsoLogsClient
      expect(client1.constructor).toBe(client2.constructor);
      expect(client1).toBeInstanceOf(EsoLogsClient);
      expect(client2).toBeInstanceOf(EsoLogsClient);
    });

    it('should maintain same public interface', () => {
      const client = createEsoLogsClient(mockAccessToken);

      // Should have access token management
      expect(typeof client.getAccessToken).toBe('function');
      expect(typeof client.updateAccessToken).toBe('function');

      // Should have Apollo client methods via delegation
      expect(typeof client.query).toBe('function');
      expect(typeof client.mutate).toBe('function');
      expect(typeof client.watchQuery).toBe('function');
      expect(typeof client.subscribe).toBe('function');
      expect(typeof client.resetStore).toBe('function');
      expect(typeof client.clearStore).toBe('function');
      expect(typeof client.stop).toBe('function');
    });
  });
});
