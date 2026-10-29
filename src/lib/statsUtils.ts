import type { DateKey, DayRecord, DayStatus, PersistedState, ResolvedRecord } from '../types';
import { addDays, daysBetween, getWeekday, isPlayableDate, startOfWeek, weekDates } from './dateUtils';

export function isResolved(record: DayRecord | undefined): record is ResolvedRecord {
  return (
    !!record &&
    record.phase === 'resolved' &&
    typeof record.correct === 'boolean' &&
    typeof record.delta === 'number'
  );
}

export function getDayStatus(date: DateKey, today: DateKey, record: DayRecord | undefined): DayStatus {
  if (isResolved(record)) return record.correct ? 'correct' : 'incorrect';
  if (isPlayableDate(date, today)) return record ? 'in-progress' : 'available';
  if (date > today) return 'locked';
  return 'missed';
}

/** Open tiles left in this week’s column, in Monday–Sunday order. */
export function getRemainingPlayableDates(records: Record<DateKey, DayRecord>, today: DateKey): DateKey[] {
  return weekDates(startOfWeek(today)).filter((date) => isPlayableDate(date, today) && !isResolved(records[date]));
}

/** Next unfinished tile in this week’s column. Prefers the day after `after` when provided. */
export function getNextPlayableDate(
  records: Record<DateKey, DayRecord>,
  today: DateKey,
  after?: DateKey,
): DateKey | undefined {
  const remaining = getRemainingPlayableDates(records, today);
  if (after) {
    const later = remaining.find((date) => date > after);
    if (later) return later;
  }
  return remaining[0];
}

export function resolvedRecords(records: Record<DateKey, DayRecord>): ResolvedRecord[] {
  return Object.values(records)
    .filter(isResolved)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Net winnings for one Monday–Sunday week, optionally counting only days before `beforeDate`. */
export function getWeeklyTotal(
  records: Record<DateKey, DayRecord>,
  weekStart: DateKey,
  beforeDate?: DateKey,
): number {
  return weekDates(weekStart).reduce((sum, date) => {
    if (beforeDate && date >= beforeDate) return sum;
    const record = records[date];
    return isResolved(record) ? sum + record.delta : sum;
  }, 0);
}

/** Weekly balance available when wagering on `date` (results from earlier days that week). */
export function getBalanceBefore(records: Record<DateKey, DayRecord>, date: DateKey): number {
  return getWeeklyTotal(records, startOfWeek(date), date);
}

export function getLifetimeTotal(records: Record<DateKey, DayRecord>): number {
  return resolvedRecords(records).reduce((sum, r) => sum + r.delta, 0);
}

/**
 * Current streak: consecutive correct days ending today, or ending yesterday when
 * today's clue has not been resolved yet (the streak is still alive until midnight).
 */
export function getCurrentStreak(records: Record<DateKey, DayRecord>, today: DateKey): number {
  let cursor = today;
  const todayRecord = records[today];
  if (isResolved(todayRecord)) {
    if (!todayRecord.correct) return 0;
  } else {
    cursor = addDays(today, -1);
  }
  let streak = 0;
  for (;;) {
    const record = records[cursor];
    if (!isResolved(record) || !record.correct) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function getLongestStreak(records: Record<DateKey, DayRecord>): number {
  let longest = 0;
  let run = 0;
  let previousCorrect: DateKey | null = null;
  for (const record of resolvedRecords(records)) {
    if (!record.correct) {
      run = 0;
      previousCorrect = null;
      continue;
    }
    run = previousCorrect && daysBetween(previousCorrect, record.date) === 1 ? run + 1 : 1;
    previousCorrect = record.date;
    longest = Math.max(longest, run);
  }
  return longest;
}

export interface WeekSummary {
  weekStart: DateKey;
  net: number;
  played: number;
  correct: number;
  finalPlayed: boolean;
}

export function getWeekSummary(records: Record<DateKey, DayRecord>, weekStart: DateKey): WeekSummary {
  let net = 0;
  let played = 0;
  let correct = 0;
  let finalPlayed = false;
  for (const date of weekDates(weekStart)) {
    const record = records[date];
    if (!isResolved(record)) continue;
    net += record.delta;
    played++;
    if (record.correct) correct++;
    if (record.gameType === 'final') finalPlayed = true;
  }
  return { weekStart, net, played, correct, finalPlayed };
}

/** Summaries for the most recent `count` weeks, oldest first, ending with the current week. */
export function getRecentWeeks(
  records: Record<DateKey, DayRecord>,
  today: DateKey,
  count: number,
): WeekSummary[] {
  const current = startOfWeek(today);
  return Array.from({ length: count }, (_, i) =>
    getWeekSummary(records, addDays(current, -7 * (count - 1 - i))),
  );
}

export interface PlayerStats {
  currentStreak: number;
  longestStreak: number;
  played: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  lifetimeWinnings: number;
  weeklyWinnings: number;
  dailyDoublesFound: number;
  dailyDoublesWon: number;
  dailyDoubleSuccessRate: number;
  finalsEligible: number;
  finalsPlayed: number;
  finalsWon: number;
  finalWinRate: number;
  daysEligible: number;
  completionRate: number;
  weekPlayed: number;
  weekElapsed: number;
  recent: ResolvedRecord[];
}

const rate = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** All aggregate statistics, derived from the authoritative per-day records. */
export function computeStats(state: PersistedState, today: DateKey): PlayerStats {
  const { records } = state;
  const resolved = resolvedRecords(records);
  const correct = resolved.filter((r) => r.correct).length;
  const dailyDoubles = resolved.filter((r) => r.isDailyDouble);
  const finals = resolved.filter((r) => r.gameType === 'final');

  const firstDay = state.firstSeenDate <= today ? state.firstSeenDate : today;
  const playAhead = resolved.filter((r) => r.date > today && r.date >= firstDay).length;
  const daysEligible = daysBetween(firstDay, today) + 1 + playAhead;
  let finalsEligible = 0;
  for (let d = firstDay; d <= today; d = addDays(d, 1)) {
    if (getWeekday(d) === 6) finalsEligible++;
  }

  const weekStart = startOfWeek(today);
  const weekPlayed = weekDates(weekStart).filter((d) => isResolved(records[d])).length;

  return {
    currentStreak: getCurrentStreak(records, today),
    longestStreak: getLongestStreak(records),
    played: resolved.length,
    correct,
    incorrect: resolved.length - correct,
    accuracy: rate(correct, resolved.length),
    lifetimeWinnings: getLifetimeTotal(records),
    weeklyWinnings: getWeeklyTotal(records, weekStart),
    dailyDoublesFound: dailyDoubles.length,
    dailyDoublesWon: dailyDoubles.filter((r) => r.correct).length,
    dailyDoubleSuccessRate: rate(dailyDoubles.filter((r) => r.correct).length, dailyDoubles.length),
    finalsEligible: Math.max(finalsEligible, finals.length),
    finalsPlayed: finals.length,
    finalsWon: finals.filter((r) => r.correct).length,
    finalWinRate: rate(finals.filter((r) => r.correct).length, finals.length),
    daysEligible,
    completionRate: rate(resolved.filter((r) => r.date >= firstDay).length, daysEligible),
    weekPlayed,
    weekElapsed: 7,
    recent: resolved.slice(-14).reverse(),
  };
}
