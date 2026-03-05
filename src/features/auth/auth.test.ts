import {
  setPkceCodeVerifier,
  getPkceCodeVerifier,
  CLIENT_ID,
  PKCE_CODE_VERIFIER_KEY,
  LOCAL_STORAGE_ACCESS_TOKEN_KEY,
  getRedirectUri,
  DEV_PREVIEW_OAUTH_RETURN_KEY,
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
