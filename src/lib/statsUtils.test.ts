import { describe, expect, it } from 'vitest';
import { createInitialState } from '../persistence/storage';
import type { DateKey, DayRecord, PersistedState } from '../types';
import { addDays } from './dateUtils';
import {
  computeStats,
  getBalanceBefore,
  getCurrentStreak,
  getDayStatus,
  getLongestStreak,
  getRecentWeeks,
  getWeeklyTotal,
} from './statsUtils';

const MONDAY = '2026-10-26';

function resolved(date: DateKey, correct: boolean, delta: number, extra: Partial<DayRecord> = {}): DayRecord {
  return {
    date,
    clueId: `clue-${date}`,
    category: 'Test',
    gameType: 'standard',
    baseValue: Math.abs(delta),
    isDailyDouble: false,
    phase: 'resolved',
    startedAt: '',
    correct,
    delta,
    resolvedAt: '',
    ...extra,
  };
}

function records(...list: DayRecord[]): Record<DateKey, DayRecord> {
  return Object.fromEntries(list.map((r) => [r.date, r]));
}

describe('getCurrentStreak', () => {
  it('is zero for a first-time player', () => {
    expect(getCurrentStreak({}, MONDAY)).toBe(0);
  });

  it('counts consecutive correct days through today', () => {
    const r = records(resolved('2026-10-24', true, 1200), resolved('2026-10-25', true, 500), resolved(MONDAY, true, 200));
    expect(getCurrentStreak(r, MONDAY)).toBe(3);
  });

  it('stays alive while today is still unplayed', () => {
    const r = records(resolved('2026-10-24', true, 1200), resolved('2026-10-25', true, 500));
    expect(getCurrentStreak(r, MONDAY)).toBe(2);
  });

  it('resets on an incorrect answer', () => {
    const r = records(resolved('2026-10-24', true, 1200), resolved('2026-10-25', true, 500), resolved(MONDAY, false, -200));
    expect(getCurrentStreak(r, MONDAY)).toBe(0);
  });

  it('breaks on a missed day', () => {
    const r = records(resolved('2026-10-23', true, 1000), resolved('2026-10-24', true, 1200));
    // Oct 25 missed; today (Oct 26) unplayed.
    expect(getCurrentStreak(r, MONDAY)).toBe(0);
  });

  it('crosses week boundaries', () => {
    const r = records(resolved('2026-10-25', true, 0, { gameType: 'final' }), resolved(MONDAY, true, 200));
    expect(getCurrentStreak(r, MONDAY)).toBe(2);
  });
});

describe('getLongestStreak', () => {
  it('finds the longest run of consecutive correct days', () => {
    const r = records(
      resolved('2026-10-01', true, 1),
      resolved('2026-10-02', true, 1),
      resolved('2026-10-03', false, -1),
      resolved('2026-10-04', true, 1),
      resolved('2026-10-05', true, 1),
      resolved('2026-10-06', true, 1),
      // gap on 10-07
      resolved('2026-10-08', true, 1),
    );
    expect(getLongestStreak(r)).toBe(3);
  });

  it('is zero with no correct answers', () => {
    expect(getLongestStreak(records(resolved(MONDAY, false, -200)))).toBe(0);
  });
});

describe('weekly totals', () => {
  const r = records(
    resolved('2026-10-25', true, 5000), // previous week's Sunday
    resolved(MONDAY, true, 200),
    resolved(addDays(MONDAY, 1), false, -400),
    resolved(addDays(MONDAY, 3), true, 800),
  );

  it('only counts the requested week', () => {
    expect(getWeeklyTotal(r, MONDAY)).toBe(600);
    expect(getWeeklyTotal(r, '2026-10-19')).toBe(5000);
  });

  it('computes the balance available before a given day', () => {
    expect(getBalanceBefore(r, addDays(MONDAY, 3))).toBe(-200);
    expect(getBalanceBefore(r, MONDAY)).toBe(0);
  });

  it('ignores in-progress records', () => {
    const open: DayRecord = { ...resolved(addDays(MONDAY, 4), true, 0), phase: 'answering', correct: undefined, delta: undefined };
    expect(getWeeklyTotal({ ...r, [open.date]: open }, MONDAY)).toBe(600);
  });

  it('summarizes recent weeks oldest-first', () => {
    const weeks = getRecentWeeks(r, addDays(MONDAY, 3), 2);
    expect(weeks.map((w) => [w.weekStart, w.net, w.played])).toEqual([
      ['2026-10-19', 5000, 1],
      [MONDAY, 600, 3],
    ]);
  });
});

describe('getDayStatus', () => {
  it('classifies each day', () => {
    const today = addDays(MONDAY, 2);
    expect(getDayStatus(addDays(MONDAY, 3), today, undefined)).toBe('locked');
    expect(getDayStatus(today, today, undefined)).toBe('available');
    expect(getDayStatus(MONDAY, today, undefined)).toBe('missed');
    expect(getDayStatus(MONDAY, today, resolved(MONDAY, true, 200))).toBe('correct');
    expect(getDayStatus(MONDAY, today, resolved(MONDAY, false, -200))).toBe('incorrect');
    const open: DayRecord = { ...resolved(today, true, 0), phase: 'wagering', correct: undefined, delta: undefined };
    expect(getDayStatus(today, today, open)).toBe('in-progress');
  });
});

describe('computeStats', () => {
  it('derives every aggregate from the day records', () => {
    const state: PersistedState = {
      ...createInitialState('2026-10-19'),
      records: records(
        resolved('2026-10-19', true, 200),
        resolved('2026-10-20', true, 1200, { isDailyDouble: true, wager: 1200 }),
        resolved('2026-10-21', false, -600),
        resolved('2026-10-25', true, 800, { gameType: 'final', wager: 800 }),
        resolved(MONDAY, true, 200),
        resolved(addDays(MONDAY, 1), false, -300, { isDailyDouble: true, wager: 300 }),
      ),
    };
    const stats = computeStats(state, addDays(MONDAY, 1));
    expect(stats).toMatchObject({
      played: 6,
      correct: 4,
      incorrect: 2,
      accuracy: 67,
      lifetimeWinnings: 1500,
      weeklyWinnings: -100,
      dailyDoublesFound: 2,
      dailyDoublesWon: 1,
      dailyDoubleSuccessRate: 50,
      finalsPlayed: 1,
      finalsWon: 1,
      finalsEligible: 1,
      finalWinRate: 100,
      daysEligible: 9,
      completionRate: 67,
      weekPlayed: 2,
      weekElapsed: 2,
      currentStreak: 0,
      longestStreak: 2,
    });
    expect(stats.recent[0]!.date).toBe(addDays(MONDAY, 1));
  });

  it('handles a brand-new player', () => {
    const stats = computeStats(createInitialState(MONDAY), MONDAY);
    expect(stats).toMatchObject({ played: 0, accuracy: 0, currentStreak: 0, completionRate: 0, daysEligible: 1 });
  });
});
