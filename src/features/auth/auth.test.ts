import {
  setPkceCodeVerifier,
  getPkceCodeVerifier,
  CLIENT_ID,
  PKCE_CODE_VERIFIER_KEY,
  LOCAL_STORAGE_ACCESS_TOKEN_KEY,
  LOCAL_STORAGE_REFRESH_TOKEN_KEY,
  getRedirectUri,
  DEV_PREVIEW_OAUTH_RETURN_KEY,
  refreshAccessToken,
  _resetRefreshState,
} from './auth';
import { getBaseUrl } from '../../utils/envUtils';

jest.mocked(getBaseUrl).mockReturnValue('https://esotk.com/');

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('OAuth Basic Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('PKCE Code Verifier Management', () => {
    it('should store and retrieve PKCE code verifier', () => {
      const testVerifier = 'test-verifier-123';

      setPkceCodeVerifier(testVerifier);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(PKCE_CODE_VERIFIER_KEY, testVerifier);

      mockLocalStorage.getItem.mockReturnValue(testVerifier);
      const retrieved = getPkceCodeVerifier();
      expect(retrieved).toBe(testVerifier);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(PKCE_CODE_VERIFIER_KEY);
    });

    it('should return empty string when no verifier is stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const retrieved = getPkceCodeVerifier();
      expect(retrieved).toBe('');
    });
  });

  describe('Constants', () => {
    it('should have proper CLIENT_ID', () => {
      expect(CLIENT_ID).toBe('9fd28ffc-300a-44ce-8a0e-6167db47a7e1');
    });

    it('should have proper storage keys', () => {
      expect(PKCE_CODE_VERIFIER_KEY).toBe('eso_code_verifier');
      expect(LOCAL_STORAGE_ACCESS_TOKEN_KEY).toBe('access_token');
    });
  });

  describe('getRedirectUri', () => {
    it('should return production redirect URI for standard deployment', () => {
      jest.mocked(getBaseUrl).mockReturnValue('https://esotk.com/');
      expect(getRedirectUri()).toBe('https://esotk.com/oauth-redirect');
    });

    it('should return shared redirect URI for dev-preview deployments', () => {
      jest.mocked(getBaseUrl).mockReturnValue('https://eso-toolkit.github.io/dev-previews/pr-790/');
      expect(getRedirectUri()).toBe('https://eso-toolkit.github.io/dev-previews/oauth-redirect');
    });

    it('should return shared redirect URI for any PR number', () => {
      jest
        .mocked(getBaseUrl)
        .mockReturnValue('https://eso-toolkit.github.io/dev-previews/pr-12345/');
      expect(getRedirectUri()).toBe('https://eso-toolkit.github.io/dev-previews/oauth-redirect');
    });

    it('should not affect non-dev-preview subpaths', () => {
      jest.mocked(getBaseUrl).mockReturnValue('https://example.com/some-other-path/');
      expect(getRedirectUri()).toBe('https://example.com/some-other-path/oauth-redirect');
    });
  });

  describe('DEV_PREVIEW_OAUTH_RETURN_KEY', () => {
    it('should have the expected key value', () => {
      expect(DEV_PREVIEW_OAUTH_RETURN_KEY).toBe('dev_preview_oauth_return_path');
    });
  });
});

describe('refreshAccessToken', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    global.fetch = mockFetch;
    _resetRefreshState();
  });

  it('should return null and warn when no refresh token is stored', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    const result = await refreshAccessToken();
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should exchange refresh token for a new access token', async () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === LOCAL_STORAGE_REFRESH_TOKEN_KEY) return 'old-refresh-token';
      return null;
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-access-token', refresh_token: 'new-refresh-token' }),
    });

    const result = await refreshAccessToken();

    expect(result).toBe('new-access-token');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      LOCAL_STORAGE_ACCESS_TOKEN_KEY,
      'new-access-token',
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      LOCAL_STORAGE_REFRESH_TOKEN_KEY,
      'new-refresh-token',
    );
  });

  it('should clear tokens and return null when the server rejects the refresh', async () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === LOCAL_STORAGE_REFRESH_TOKEN_KEY) return 'expired-refresh-token';
      return null;
    });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const result = await refreshAccessToken();

    expect(result).toBeNull();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(LOCAL_STORAGE_ACCESS_TOKEN_KEY);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(LOCAL_STORAGE_REFRESH_TOKEN_KEY);
  });

  it('should deduplicate concurrent calls — only one HTTP request for multiple simultaneous callers', async () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === LOCAL_STORAGE_REFRESH_TOKEN_KEY) return 'shared-refresh-token';
      return null;
    });

    let resolveRequest!: (value: Response) => void;
    const requestPromise = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    mockFetch.mockReturnValueOnce(requestPromise);

    // Fire two concurrent refresh calls
    const call1 = refreshAccessToken();
    const call2 = refreshAccessToken();

    // Resolve the single underlying HTTP request
    resolveRequest({
      ok: true,
      json: async () => ({ access_token: 'deduped-token', refresh_token: 'new-rt' }),
    } as Response);

    const [result1, result2] = await Promise.all([call1, call2]);

    expect(result1).toBe('deduped-token');
    expect(result2).toBe('deduped-token');
    // Only one network request was made despite two callers
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should return cached token within the cooldown window after a successful refresh', async () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === LOCAL_STORAGE_REFRESH_TOKEN_KEY) return 'refresh-token';
      return null;
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token-1' }),
    });

    const result1 = await refreshAccessToken();
    const result2 = await refreshAccessToken();

    expect(result1).toBe('token-1');
    expect(result2).toBe('token-1'); // cooldown returns cached token
    expect(mockFetch).toHaveBeenCalledTimes(1); // no second HTTP call
  });

  it('should allow a fresh call after the cooldown window expires', async () => {
    jest.useFakeTimers();
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === LOCAL_STORAGE_REFRESH_TOKEN_KEY) return 'refresh-token';
      return null;
    });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-2' }),
      });

    const result1 = await refreshAccessToken();

    // Advance past the 10 s cooldown
    jest.advanceTimersByTime(11_000);

    const result2 = await refreshAccessToken();

    expect(result1).toBe('token-1');
    expect(result2).toBe('token-2');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
