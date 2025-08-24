import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  accessToken: string;
  isLoggedIn: boolean;
  setAccessToken: (token: string) => void;
  rebindAccessToken: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string>(
    () => localStorage.getItem('access_token') || ''
  );

  // Re-bind access token from localStorage
  const rebindAccessToken = React.useCallback(() => {
    setAccessToken(localStorage.getItem('access_token') || '');
  }, [setAccessToken]);

  useEffect(() => {
    // Listen for changes to localStorage (e.g., from OAuthRedirect)
    const handler = () => {
      setAccessToken(localStorage.getItem('access_token') || '');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

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

  const contextValue = React.useMemo(
    () => ({ accessToken, isLoggedIn, setAccessToken, rebindAccessToken }),
    [accessToken, isLoggedIn, rebindAccessToken]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

