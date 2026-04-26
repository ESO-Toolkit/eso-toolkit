import {
  setPkceCodeVerifier,
  getPkceCodeVerifier,
  CLIENT_ID,
  PKCE_CODE_VERIFIER_KEY,
  INTENDED_DESTINATION_KEY,
  LOCAL_STORAGE_ACCESS_TOKEN_KEY,
  setIntendedDestination,
  setIntendedDestinationIfEmpty,
  getIntendedDestination,
  clearIntendedDestination,
} from './auth';

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
    it('should store and retrieve an intended destination', () => {
      setIntendedDestination('/report/123/fight/1');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        INTENDED_DESTINATION_KEY,
        '/report/123/fight/1',
      );

      mockLocalStorage.getItem.mockReturnValue('/report/123/fight/1');
      expect(getIntendedDestination()).toBe('/report/123/fight/1');
    });

    it('should return "/" when no destination is stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(getIntendedDestination()).toBe('/');
    });

    it('should clear the intended destination', () => {
      clearIntendedDestination();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(INTENDED_DESTINATION_KEY);
    });

    it('setIntendedDestinationIfEmpty should write when slot is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      setIntendedDestinationIfEmpty('/calculator');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        INTENDED_DESTINATION_KEY,
        '/calculator',
      );
    });

    it('setIntendedDestinationIfEmpty should NOT overwrite an existing destination', () => {
      mockLocalStorage.getItem.mockReturnValue('/report/123/fight/1');
      setIntendedDestinationIfEmpty('/');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('protected deep-link survives a public-page login attempt', () => {
      // Step 1: AuthenticatedRoute saves the deep link (unconditional write)
      setIntendedDestination('/report/99/fight/5?tab=stats#damage');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        INTENDED_DESTINATION_KEY,
        '/report/99/fight/5?tab=stats#damage',
      );

      // Step 2: User navigates to a public page and clicks login there
      // The public handler uses the non-clobbering variant
      mockLocalStorage.getItem.mockReturnValue('/report/99/fight/5?tab=stats#damage');
      jest.clearAllMocks();
      setIntendedDestinationIfEmpty('/');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      // Step 3: OAuthRedirect reads the original deep link
      expect(getIntendedDestination()).toBe('/report/99/fight/5?tab=stats#damage');
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
