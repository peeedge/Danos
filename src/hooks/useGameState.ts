import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { finalizeExpired, lockWager, startChallenge, submitAnswer } from '../game/engine';
import { getTodayKey, resolveTimeZone } from '../lib/dateUtils';
import {
  clearState,
  createInitialState,
  getBrowserStorage,
  loadState,
  saveState,
  STORAGE_KEY,
} from '../persistence/storage';
import type { Clue, DateKey, DayContent, PersistedState, Settings } from '../types';
import { useToday } from './useToday';

export type StorageNotice = 'unavailable' | 'recovered' | 'save-failed' | null;

function initialize(storage: ReturnType<typeof getBrowserStorage>) {
  const loaded = loadState(storage);
  if (loaded.status === 'ok') return { state: loaded.state, notice: null as StorageNotice };
  const fresh = createInitialState(getTodayKey(resolveTimeZone('auto')));
  saveState(storage, fresh);
  const notice: StorageNotice = !storage ? 'unavailable' : loaded.status === 'recovered' ? 'recovered' : null;
  return { state: fresh, notice };
}

/**
 * Owns the persisted game state. Every mutation re-reads storage first (so two tabs
 * can't both resolve the same clue), applies a pure engine transition, then saves
 * before React re-renders.
 */
export function useGameState() {
  const storage = useMemo(getBrowserStorage, []);
  const [{ state, notice: initialNotice }] = useState(() => initialize(storage));
  const [current, setCurrent] = useState<PersistedState>(state);
  const [notice, setNotice] = useState<StorageNotice>(initialNotice);
  const stateRef = useRef(current);
  stateRef.current = current;

  const timeZone = resolveTimeZone(current.settings.timeZone);
  const today = useToday(timeZone);

  const mutate = useCallback(
    (transition: (latest: PersistedState) => PersistedState) => {
      const fromDisk = loadState(storage);
      const latest = fromDisk.status === 'ok' ? fromDisk.state : stateRef.current;
      const next = transition(latest);
      if (next !== latest || latest !== stateRef.current) {
        if (next !== latest && !saveState(storage, next)) setNotice(storage ? 'save-failed' : 'unavailable');
        stateRef.current = next;
        setCurrent(next);
      }
      return next;
    },
    [storage],
  );

  // Settle clues left open on previous days whenever the date changes.
  useEffect(() => {
    mutate((latest) => finalizeExpired(latest, today, new Date()));
  }, [today, mutate]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      const loaded = loadState(storage);
      if (loaded.status === 'ok') {
        stateRef.current = loaded.state;
        setCurrent(loaded.state);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storage]);

  const actions = useMemo(
    () => ({
      start: (day: DayContent) => mutate((s) => startChallenge(s, { day, today, now: new Date() })),
      lockWager: (date: DateKey, wager: unknown) =>
        mutate((s) => lockWager(s, { date, today, wager, now: new Date() })),
      submit: (date: DateKey, response: string, clue: Clue) =>
        mutate((s) => submitAnswer(s, { date, today, response, clue, now: new Date() })),
      updateSettings: (settings: Partial<Settings>) =>
        mutate((s) => ({ ...s, settings: { ...s.settings, ...settings } })),
      resetProgress: () => {
        const preserved = stateRef.current.settings;
        clearState(storage);
        const fresh = { ...createInitialState(today), settings: preserved };
        saveState(storage, fresh);
        stateRef.current = fresh;
        setCurrent(fresh);
      },
      dismissNotice: () => setNotice(null),
    }),
    [mutate, storage, today],
  );

  return { state: current, today, timeZone, notice, ...actions };
}

export type GameApi = ReturnType<typeof useGameState>;
