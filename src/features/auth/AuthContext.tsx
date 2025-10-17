import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';

import { useEsoLogsClientContext } from '../../EsoLogsClientContext';
import { GetCurrentUserQuery, GetCurrentUserDocument } from '../../graphql/gql/graphql';
import { Logger, LogLevel } from '../../utils/logger';

import { LOCAL_STORAGE_ACCESS_TOKEN_KEY } from './auth';

const logger = new Logger({
  level: LogLevel.ERROR,
  contextPrefix: 'AuthContext',
});

type CurrentUser = NonNullable<NonNullable<GetCurrentUserQuery['userData']>['currentUser']>;

interface AuthContextType {
  accessToken: string;
  isLoggedIn: boolean;
  currentUser: CurrentUser | null;
  userLoading: boolean;
  userError: string | null;
  setAccessToken: (token: string) => void;
  rebindAccessToken: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string>(
    () => localStorage.getItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY) || '',
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState<boolean>(false);
  const [userError, setUserError] = useState<string | null>(null);

  const { client: esoLogsClient, setAuthToken } = useEsoLogsClientContext();

  // Re-bind access token from localStorage
  const rebindAccessToken = useCallback(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY) || '';
    setAccessToken(token);
    setAuthToken(token);
  }, [setAuthToken]);

  // Update access token and notify EsoLogsClient
  const updateAccessToken = useCallback(
    (token: string) => {
      setAccessToken(token);
      setAuthToken(token);
    },
    [setAuthToken],
  );

  // Fetch current user data
  const refetchUser = useCallback(async () => {
    if (!esoLogsClient || !accessToken) {
      setCurrentUser(null);
      setUserError(null);
      return;
    }

    setUserLoading(true);
    setUserError(null);

    try {
      const result = await esoLogsClient.query<GetCurrentUserQuery>({
        query: GetCurrentUserDocument,
      });

      if (result?.userData?.currentUser) {
        setCurrentUser(result.userData.currentUser);
        setUserError(null);
      } else {
        setUserError('No user data received');
        setCurrentUser(null);
      }
    } catch (error) {
      logger.error('Failed to fetch current user', error instanceof Error ? error : undefined);
      setUserError(error instanceof Error ? error.message : 'Failed to fetch user data');
      setCurrentUser(null);
    } finally {
      setUserLoading(false);
    }
  }, [esoLogsClient, accessToken]);

  useEffect(() => {
    // Listen for changes to localStorage (e.g., from OAuthRedirect)
    const handler = (): void => {
      const token = localStorage.getItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY) || '';
      setAccessToken(token);
      setAuthToken(token);
    };
    window.addEventListener('storage', handler);

    // Initialize token on mount
    const initialToken = localStorage.getItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY) || '';
    setAccessToken(initialToken);
    setAuthToken(initialToken);

    return () => window.removeEventListener('storage', handler);
  }, [setAuthToken]);

  function isTokenExpired(token: string): boolean {
    if (!token) return true;
    try {
      const [, payload] = token.split('.');
      if (!payload) return false;
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (!decoded.exp) return false;
      return Date.now() / 1000 > decoded.exp;
    } catch {
      return false;
    }
  }

  const isLoggedIn = !!accessToken && !isTokenExpired(accessToken);

  // Fetch user data when logged in state changes
  useEffect(() => {
    if (isLoggedIn && esoLogsClient) {
      refetchUser();
    } else {
      setCurrentUser(null);
      setUserError(null);
      setUserLoading(false);
    }
  }, [isLoggedIn, esoLogsClient, refetchUser]);

  const contextValue = React.useMemo(
    () => ({
      accessToken,
      isLoggedIn,
      currentUser,
      userLoading,
      userError,
      setAccessToken: updateAccessToken,
      rebindAccessToken,
      refetchUser,
    }),
    [
      accessToken,
      isLoggedIn,
      currentUser,
      userLoading,
      userError,
      updateAccessToken,
      rebindAccessToken,
      refetchUser,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
