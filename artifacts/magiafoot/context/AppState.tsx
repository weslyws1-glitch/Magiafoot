import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'magiafoot.preferences.v1';

interface PersistedPreferences {
  followedTeamIds: string[];
  savedMatchIds: string[];
}

interface AppStateValue extends PersistedPreferences {
  isReady: boolean;
  toggleFollowedTeam: (teamId: string) => void;
  toggleSavedMatch: (matchId: string) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [followedTeamIds, setFollowedTeamIds] = useState<string[]>([]);
  const [savedMatchIds, setSavedMatchIds] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedValue) => {
        if (!active || !storedValue) return;
        const parsed: unknown = JSON.parse(storedValue);
        if (typeof parsed !== 'object' || parsed === null) return;
        const preferences = parsed as Record<string, unknown>;
        setFollowedTeamIds(asStringArray(preferences.followedTeamIds));
        setSavedMatchIds(asStringArray(preferences.savedMatchIds));
      })
      .catch(() => {
        // A malformed or unavailable local cache should not block the app.
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const preferences: PersistedPreferences = { followedTeamIds, savedMatchIds };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)).catch(() => {
      // The current session remains usable if device storage is temporarily unavailable.
    });
  }, [followedTeamIds, isReady, savedMatchIds]);

  const toggleFollowedTeam = useCallback((teamId: string) => {
    setFollowedTeamIds((current) => current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]);
  }, []);

  const toggleSavedMatch = useCallback((matchId: string) => {
    setSavedMatchIds((current) => current.includes(matchId) ? current.filter((id) => id !== matchId) : [...current, matchId]);
  }, []);

  const value = useMemo(() => ({
    followedTeamIds,
    savedMatchIds,
    isReady,
    toggleFollowedTeam,
    toggleSavedMatch,
  }), [followedTeamIds, isReady, savedMatchIds, toggleFollowedTeam, toggleSavedMatch]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
