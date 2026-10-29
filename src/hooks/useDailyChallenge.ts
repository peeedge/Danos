import { useCallback, useEffect, useMemo, useState } from 'react';
import { localContentProvider, type ContentProvider } from '../content/contentProvider';
import { getWagerLimitsFor } from '../lib/scoringUtils';
import { getBalanceBefore, getDayStatus } from '../lib/statsUtils';
import { startOfWeek } from '../lib/dateUtils';
import type { Clue, DateKey, DayContent, DayRecord, DayStatus, PersistedState, WagerLimits, WeekContent } from '../types';

const provider: ContentProvider = localContentProvider;
const weekCache = new Map<string, WeekContent>();

type Loadable<T> = { data: T | null; loading: boolean; error: string | null };

/** Loads a week of content through the provider, caching by week and "today" so next week stays hidden. */
export function useWeekContent(weekStart: DateKey, today: DateKey): Loadable<WeekContent> & { retry: () => void } {
  const cacheKey = `${weekStart}|${today}`;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data: WeekContent | null; error: string | null }>(() => ({
    key: cacheKey,
    data: weekCache.get(cacheKey) ?? null,
    error: null,
  }));

  useEffect(() => {
    const cached = weekCache.get(cacheKey);
    if (cached) {
      setResult({ key: cacheKey, data: cached, error: null });
      return;
    }
    let cancelled = false;
    provider
      .getWeek(weekStart, today)
      .then((week) => {
        weekCache.set(cacheKey, week);
        if (!cancelled) setResult({ key: cacheKey, data: week, error: null });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: cacheKey, data: null, error: 'We couldn’t load this week’s clues.' });
      });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, weekStart, today, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const fresh = result.key === cacheKey;
  const data = fresh ? result.data : (weekCache.get(cacheKey) ?? null);
  return {
    data,
    loading: !data && !(fresh && result.error),
    error: fresh ? result.error : null,
    retry,
  };
}

/** Looks up the clue a record was played with, in case the schedule ever changes after the fact. */
export function useRecordedClue(record: DayRecord | undefined, scheduled: Clue | undefined): Clue | undefined {
  const [recorded, setRecorded] = useState<Clue | undefined>(undefined);
  const needsLookup = !!record && record.clueId !== scheduled?.id;
  useEffect(() => {
    if (!needsLookup || !record) return;
    let cancelled = false;
    provider.getClueById(record.clueId).then((clue) => {
      if (!cancelled) setRecorded(clue);
    });
    return () => {
      cancelled = true;
    };
  }, [needsLookup, record]);
  return needsLookup ? recorded : scheduled;
}

export interface DailyChallenge {
  day: DayContent | null;
  clue: Clue | undefined;
  record: DayRecord | undefined;
  status: DayStatus;
  balanceBefore: number;
  wagerLimits: WagerLimits | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** Everything the UI needs to render one day: its content, the player's record, and derived rules. */
export function useDailyChallenge(state: PersistedState, date: DateKey, today: DateKey): DailyChallenge {
  const week = useWeekContent(startOfWeek(date), today);
  const day = week.data?.days.find((d) => d.date === date) ?? null;
  const record = state.records[date];
  const clue = useRecordedClue(record, day?.clue);

  return useMemo(() => {
    const balanceBefore = getBalanceBefore(state.records, date);
    return {
      day,
      clue,
      record,
      status: getDayStatus(date, today, record),
      balanceBefore,
      wagerLimits: record ? getWagerLimitsFor(record, balanceBefore) : null,
      loading: week.loading,
      error: week.error,
      retry: week.retry,
    };
  }, [day, clue, record, date, today, state.records, week.loading, week.error, week.retry]);
}
