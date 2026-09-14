import { useEffect, useRef, useState } from 'react';

const ONLINE_RECOVERY_DELAY_MS = 100;

/**
 * Returns a generation that advances once after each observed offline -> online
 * transition. Consumers can key their request-hook subtree with the generation
 * so failed or stale requests are retried through their existing cache and
 * in-flight suppression conditions.
 */
export function useAnalyzerOnlineRecovery(): number {
  const [recoveryGeneration, setRecoveryGeneration] = useState(0);
  const recoveryArmedRef = useRef(typeof navigator !== 'undefined' && navigator.onLine === false);
  const pendingRecoveryRef = useRef<number | null>(null);

  useEffect(() => {
    const cancelPendingRecovery = (): void => {
      if (pendingRecoveryRef.current !== null) {
        window.clearTimeout(pendingRecoveryRef.current);
        pendingRecoveryRef.current = null;
      }
    };

    const handleOffline = (): void => {
      cancelPendingRecovery();
      recoveryArmedRef.current = true;
    };

    const handleOnline = (): void => {
      if (!recoveryArmedRef.current || pendingRecoveryRef.current !== null) return;

      recoveryArmedRef.current = false;
      pendingRecoveryRef.current = window.setTimeout(() => {
        pendingRecoveryRef.current = null;
        setRecoveryGeneration((generation) => generation + 1);
      }, ONLINE_RECOVERY_DELAY_MS);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      cancelPendingRecovery();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return recoveryGeneration;
}
