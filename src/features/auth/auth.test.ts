import {
  setPkceCodeVerifier,
  getPkceCodeVerifier,
  CLIENT_ID,
  PKCE_CODE_VERIFIER_KEY,
  INTENDED_DESTINATION_KEY,
  LOCAL_STORAGE_ACCESS_TOKEN_KEY,
  setIntendedDestination,
  setFallbackDestination,
  getIntendedDestination,
  clearIntendedDestination,
} from './auth';

const PROTECTED_KEY = 'eso_intended_destination_protected';

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

  describe('Intended Destination Management', () => {
    it('should store destination and mark it as protected', () => {
      setIntendedDestination('/report/123/fight/1');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        INTENDED_DESTINATION_KEY,
        '/report/123/fight/1',
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(PROTECTED_KEY, '1');
    });

    it('should return "/" when no destination is stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(getIntendedDestination()).toBe('/');
    });

    it('should clear both destination and protected flag', () => {
      clearIntendedDestination();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(INTENDED_DESTINATION_KEY);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(PROTECTED_KEY);
    });

    it('setFallbackDestination should write when no destination exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      setFallbackDestination('/calculator');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        INTENDED_DESTINATION_KEY,
        '/calculator',
      );
    });

    it('setFallbackDestination should NOT overwrite a protected destination', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === PROTECTED_KEY) return '1';
        if (key === INTENDED_DESTINATION_KEY) return '/report/123/fight/1';
        return null;
      });
      setFallbackDestination('/');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('setFallbackDestination should overwrite a non-protected destination (abandoned OAuth)', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === PROTECTED_KEY) return null;
        if (key === INTENDED_DESTINATION_KEY) return '/calculator';
        return null;
      });
      setFallbackDestination('/leaderboards');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        INTENDED_DESTINATION_KEY,
        '/leaderboards',
      );
    });

    it('protected deep-link survives a public-page login attempt', () => {
      // Step 1: AuthenticatedRoute saves the deep link (sets protected flag)
      setIntendedDestination('/report/99/fight/5?tab=stats#damage');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        INTENDED_DESTINATION_KEY,
        '/report/99/fight/5?tab=stats#damage',
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(PROTECTED_KEY, '1');

      // Step 2: User navigates to a public page and clicks login there
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === PROTECTED_KEY) return '1';
        if (key === INTENDED_DESTINATION_KEY) return '/report/99/fight/5?tab=stats#damage';
        return null;
      });
      jest.clearAllMocks();
      setFallbackDestination('/');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      // Step 3: OAuthRedirect reads the original deep link
      expect(getIntendedDestination()).toBe('/report/99/fight/5?tab=stats#damage');
    });

    it('abandoned OAuth from page A then login from page B redirects to page B', () => {
      // Step 1: User on /calculator clicks login (fallback, no protected flag)
      mockLocalStorage.getItem.mockReturnValue(null);
      setFallbackDestination('/calculator');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        INTENDED_DESTINATION_KEY,
        '/calculator',
      );

      // Step 2: OAuth is abandoned. User navigates to /leaderboards and clicks login
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === PROTECTED_KEY) return null;
        if (key === INTENDED_DESTINATION_KEY) return '/calculator';
        return null;
      });
      jest.clearAllMocks();
      setFallbackDestination('/leaderboards');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        INTENDED_DESTINATION_KEY,
        '/leaderboards',
      );
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
});
