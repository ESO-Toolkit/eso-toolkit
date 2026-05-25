/**
 * Hook that fetches the current user's roster-hub profile avatar
 * and syncs their ESO display names on login.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../features/auth/AuthContext';
import { rosterHubApi } from '../features/roster-hub/api/roster-hub-api';

interface CurrentUserAvatar {
  avatarUrl: string | null;
  avatarThumbUrl: string | null;
  /** Call after uploading/removing avatar to refresh the cached URL */
  refresh: () => void;
}

export function useCurrentUserAvatar(): CurrentUserAvatar {
  const { isLoggedIn, currentUser, accessToken } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarThumbUrl, setAvatarThumbUrl] = useState<string | null>(null);
  const hasSyncedRef = useRef(false);
  const lastUsernameRef = useRef<string>('');

  // ESO Logs username (author_name in the DB) — NOT the in-game @displayName
  const username = currentUser?.name || '';

  const fetchAvatar = useCallback(() => {
    if (!username) return;
    rosterHubApi
      .getUserProfile(username)
      .then((res) => {
        setAvatarUrl(res.profile.avatar_url);
        setAvatarThumbUrl(res.profile.avatar_thumb_url);
      })
      .catch(() => {
        // Profile may not exist yet — that's fine
        setAvatarUrl(null);
        setAvatarThumbUrl(null);
      });
  }, [username]);

  // Fetch avatar and sync display names when user logs in
  useEffect(() => {
    if (!isLoggedIn || !currentUser || !accessToken || !username) {
      setAvatarUrl(null);
      setAvatarThumbUrl(null);
      hasSyncedRef.current = false;
      lastUsernameRef.current = '';
      return;
    }

    // Only fetch/sync once per username
    if (lastUsernameRef.current === username) return;
    lastUsernameRef.current = username;

    fetchAvatar();

    // Sync display names (fire-and-forget)
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      rosterHubApi
        .syncDisplayNames(
          currentUser.naDisplayName || null,
          currentUser.euDisplayName || null,
          accessToken,
        )
        .catch(() => {
          // Non-critical — silent fail
        });
    }
  }, [isLoggedIn, currentUser, accessToken, username, fetchAvatar]);

  return { avatarUrl, avatarThumbUrl, refresh: fetchAvatar };
}
