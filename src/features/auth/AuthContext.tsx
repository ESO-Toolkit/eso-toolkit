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
import { checkUserBan, DEFAULT_BAN_REASON } from '../../utils/banlist';
import { isDevelopment } from '../../utils/envUtils';
import { Logger, LogLevel } from '../../utils/logger';
import { addBreadcrumb, setUserContext } from '../../utils/sentryUtils';

import { LOCAL_STORAGE_ACCESS_TOKEN_KEY } from './auth';
import { getAccessTokenExpiry, isAccessTokenExpired, tokenHasUserSubject } from './tokenUtils';

const logger = new Logger({
  level: LogLevel.ERROR,
  contextPrefix: 'AuthContext',
});

type CurrentUser = NonNullable<NonNullable<GetCurrentUserQuery['userData']>['currentUser']>;

interface AuthContextType {
  accessToken: string;
  isLoggedIn: boolean;
  isBanned: boolean;
  banReason: string | null;
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
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState<boolean>(false);
  const [userError, setUserError] = useState<string | null>(null);

  const { client: esoLogsClient, setAuthToken, clearAuthToken } = useEsoLogsClientContext();

  const accessTokenHasUser = React.useMemo(() => tokenHasUserSubject(accessToken), [accessToken]);
  const accessTokenExpiry = React.useMemo(() => getAccessTokenExpiry(accessToken), [accessToken]);
  const accessTokenExpired = React.useMemo(() => isAccessTokenExpired(accessToken), [accessToken]);

  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.log('[AuthContext] render', {
      hasToken: !!accessToken,
      tokenHasUserSubject: accessTokenHasUser,
      tokenExpiresAt: accessTokenExpiry,
      isLoggedInSnapshot: !!accessToken && accessTokenHasUser && !accessTokenExpired && !isBanned,
      isBannedSnapshot: isBanned,
      currentUser,
      userLoading,
      userError,
    });
  }

  // Re-bind access token from localStorage
  const rebindAccessToken = useCallback(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY) || '';
    setAccessToken(token);
    setAuthToken(token);
    addBreadcrumb('Auth: Rebound access token from storage', 'auth', {
      tokenPresent: Boolean(token),
    });
    if (token) {
      setIsBanned(false);
      setBanReason(null);
    }
  }, [setAuthToken]);

  // Update access token and notify EsoLogsClient
  const updateAccessToken = useCallback(
    (token: string) => {
      setAccessToken(token);
      setAuthToken(token);
      addBreadcrumb('Auth: Access token updated', 'auth', {
        tokenPresent: Boolean(token),
      });
    },
    [setAuthToken],
  );

  // Fetch current user data
  const refetchUser = useCallback(async () => {
    if (!esoLogsClient || !accessToken || !accessTokenHasUser || accessTokenExpired) {
      setCurrentUser(null);
      setUserError(null);
      setIsBanned(false);
      setBanReason(null);
      setUserLoading(false);
      addBreadcrumb('Auth: Skipping user fetch', 'auth', {
        hasClient: Boolean(esoLogsClient),
        tokenPresent: Boolean(accessToken),
        tokenHasUser: accessTokenHasUser,
        tokenExpired: accessTokenExpired,
      });
      return;
    }

    setUserLoading(true);
    setUserError(null);
    addBreadcrumb('Auth: Fetching current user', 'auth', {
      tokenHasUser: accessTokenHasUser,
      tokenExpired: accessTokenExpired,
    });

    try {
      const result = await esoLogsClient.query<GetCurrentUserQuery>({
        query: GetCurrentUserDocument,
      });

      const fetchedUser = result?.userData?.currentUser ?? null;

      if (isDevelopment()) {
        // eslint-disable-next-line no-console
        console.log('[AuthContext] Fetched current user', {
          hasUser: !!fetchedUser,
          result,
        });
      }

      if (fetchedUser) {
        const banCheck = await checkUserBan(fetchedUser);
        if (banCheck.isBanned) {
          const reason = banCheck.reason || DEFAULT_BAN_REASON;
          setIsBanned(true);
          setBanReason(reason);
          setUserError(reason);
          setCurrentUser(null);
          localStorage.removeItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY);
          updateAccessToken('');
          addBreadcrumb('Auth: Banned user detected', 'auth', {
            userId: fetchedUser.id,
            reason,
          });
          clearAuthToken();
          return;
        }

        setIsBanned(false);
        setBanReason(null);
        setCurrentUser(fetchedUser);
        setUserError(null);
        if (fetchedUser.id) {
          setUserContext(String(fetchedUser.id), undefined, fetchedUser.name || undefined);
        }
        addBreadcrumb('Auth: User data loaded', 'auth', {
          userId: fetchedUser.id,
          displayNameNA: fetchedUser.naDisplayName || undefined,
          displayNameEU: fetchedUser.euDisplayName || undefined,
        });
      } else {
        setIsBanned(false);
        setBanReason(null);
        setUserError('No user data received');
        setCurrentUser(null);
        addBreadcrumb('Auth: No user data returned', 'auth');
      }
    } catch (error) {
      logger.error('Failed to fetch current user', error instanceof Error ? error : undefined);
      setUserError(error instanceof Error ? error.message : 'Failed to fetch user data');
      setIsBanned(false);
      setBanReason(null);
      setCurrentUser(null);
      addBreadcrumb('Auth: Failed to fetch current user', 'error', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setUserLoading(false);
    }
  }, [
    esoLogsClient,
    accessToken,
    accessTokenHasUser,
    accessTokenExpired,
    clearAuthToken,
    updateAccessToken,
  ]);

  useEffect(() => {
    // Listen for changes to localStorage (e.g., from OAuthRedirect)
    const handler = (): void => {
      const token = localStorage.getItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY) || '';
      setAccessToken(token);
      setAuthToken(token);
      addBreadcrumb('Auth: Access token updated via storage event', 'auth', {
        tokenPresent: Boolean(token),
      });
    };
    window.addEventListener('storage', handler);

    // Initialize token on mount
    const initialToken = localStorage.getItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY) || '';
    setAccessToken(initialToken);
    setAuthToken(initialToken);

    return () => window.removeEventListener('storage', handler);
  }, [setAuthToken]);

  const isLoggedIn = !!accessToken && accessTokenHasUser && !accessTokenExpired && !isBanned;

  useEffect(() => {
    if (isDevelopment()) {
      // eslint-disable-next-line no-console
      console.log('[AuthContext] state changed', {
        hasToken: !!accessToken,
        tokenHasUserSubject: accessTokenHasUser,
        tokenExpiresAt: accessTokenExpiry,
        isLoggedIn,
        isBanned,
        userLoading,
        userError,
      });
    }
  }, [
    accessToken,
    accessTokenHasUser,
    accessTokenExpiry,
    isLoggedIn,
    isBanned,
    userLoading,
    userError,
  ]);

  // Fetch user data when logged in state changes
  useEffect(() => {
    if (isLoggedIn && esoLogsClient) {
      refetchUser();
    } else if (!isBanned) {
      setCurrentUser(null);
      setUserError(null);
      setUserLoading(false);
    } else {
      setUserLoading(false);
    }
  }, [isLoggedIn, esoLogsClient, refetchUser, isBanned]);

  const contextValue = React.useMemo(
    () => ({
      accessToken,
      isLoggedIn,
      currentUser,
      isBanned,
      banReason,
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
      isBanned,
      banReason,
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
