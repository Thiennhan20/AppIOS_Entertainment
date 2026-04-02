import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { searchHistoryApi, SearchHistoryEntry } from '../api/searchHistoryApi';

// ─── Constants ───────────────────────────────────────────────────
const DEBOUNCE_MS = 10_000; // 10 seconds
const DISPLAY_LIMIT = 15;

// ─── Helpers ─────────────────────────────────────────────────────
const normalize = (q: string) => q.toLowerCase().trim();

const sortDesc = (arr: SearchHistoryEntry[]) =>
  [...arr].sort(
    (a, b) => new Date(b.searched_at).getTime() - new Date(a.searched_at).getTime()
  );

// ═════════════════════════════════════════════════════════════════
// Hook — App only (always logged in, no guest mode)
// ═════════════════════════════════════════════════════════════════
export function useSearchHistory(isAuthenticated: boolean) {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for debounce & sync
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<SearchHistoryEntry[]>(history);
  const dirtyRef = useRef(false);
  const isAuthRef = useRef(isAuthenticated);

  // Keep refs in sync
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    isAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // ─── Sync to server ──────────────────────────────────────────
  const syncToServer = useCallback(async (data: SearchHistoryEntry[]) => {
    if (!isAuthRef.current) return;
    try {
      await searchHistoryApi.syncHistory(data);
      dirtyRef.current = false;
    } catch (err) {
      console.warn('Search history sync failed, will retry:', err);
    }
  }, []);

  const scheduleSyncDebounce = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (dirtyRef.current) {
        syncToServer(historyRef.current);
      }
    }, DEBOUNCE_MS);
  }, [syncToServer]);

  // ─── Flush pending sync immediately ──────────────────────────
  const flushSync = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (dirtyRef.current && isAuthRef.current) {
      syncToServer(historyRef.current);
    }
  }, [syncToServer]);

  // ─── Init: load from server on mount ──────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setHistory([]);
      return;
    }
    setIsLoading(true);
    searchHistoryApi
      .getHistory()
      .then((res) => {
        setHistory(sortDesc(res.history || []));
      })
      .catch((err) => {
        console.warn('Failed to load search history:', err);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  // ─── AppState: flush sync when app goes to background ─────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (dirtyRef.current && isAuthRef.current) {
          // Fire sync immediately before app suspends
          syncToServer(historyRef.current);
          if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = null;
          }
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [syncToServer]);

  // ─── addSearch ────────────────────────────────────────────────
  const addSearch = useCallback(
    (rawQuery: string) => {
      const normalized = normalize(rawQuery);
      if (!normalized) return;

      const now = new Date().toISOString();

      setHistory((prev) => {
        const filtered = prev.filter((e) => normalize(e.query) !== normalized);
        const updated = [{ query: normalized, searched_at: now }, ...filtered];

        dirtyRef.current = true;
        scheduleSyncDebounce();

        return updated;
      });
    },
    [scheduleSyncDebounce]
  );

  // ─── removeSearch ──────────────────────────────────────────────
  const removeSearch = useCallback(
    (rawQuery: string) => {
      const normalized = normalize(rawQuery);

      setHistory((prev) => {
        const updated = prev.filter((e) => normalize(e.query) !== normalized);
        dirtyRef.current = true;
        scheduleSyncDebounce();
        return updated;
      });
    },
    [scheduleSyncDebounce]
  );

  // ─── clearAll ──────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    setHistory([]);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    dirtyRef.current = false;
    searchHistoryApi.clearHistory().catch((err) => {
      console.warn('Failed to clear search history on server:', err);
    });
  }, []);

  // ─── Cleanup timer on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // ─── Computed display list (15 most recent) ────────────────────
  const displayHistory = sortDesc(history).slice(0, DISPLAY_LIMIT);

  return {
    displayHistory,
    fullHistory: history,
    addSearch,
    removeSearch,
    clearAll,
    flushSync,
    isLoading,
  };
}
