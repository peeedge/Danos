import { getDayRule } from '../game/rules';
import { daysBetween, endOfWeek, getWeekday, startOfWeek, weekDates } from '../lib/dateUtils';
import { hashString, seededShuffle } from '../lib/random';
import type { Clue, DateKey, DayContent, WeekContent } from '../types';
import { ALL_CLUES, SEED_WEEKS } from './seedClues';

/**
 * Source of trivia content. The local implementation is synchronous under the hood,
 * but the interface is async so a remote API can be dropped in without touching the
 * game logic. Providers must never return clue text for dates after the end of
 * the current week — remaining tiles in this week may be played today.
 */
export interface ContentProvider {
  getWeek(weekStart: DateKey, today: DateKey): Promise<WeekContent>;
  getClueById(id: string): Promise<Clue | undefined>;
}

/** A Monday used as week zero for the content rotation. */
const ROTATION_EPOCH: DateKey = '2024-01-01';

function rawCycleOrder(cycle: number, size: number): number[] {
  return seededShuffle(
    Array.from({ length: size }, (_, i) => i),
    hashString(`danos-rotation-${cycle}`),
  );
}

/**
 * Order in which curated weeks are used during a rotation cycle. Each cycle plays
 * every curated week exactly once, and a cycle never opens with the week that
 * closed the previous one.
 */
function cycleOrder(cycle: number, size: number): number[] {
  const order = rawCycleOrder(cycle, size);
  if (size > 2) {
    const previousLast = rawCycleOrder(cycle - 1, size)[size - 1];
    if (order[0] === previousLast) [order[0], order[1]] = [order[1]!, order[0]!];
  }
  return order;
}

/** Which curated week of clues is assigned to the week starting `weekStart`. Stable forever. */
export function getWeekSetIndex(weekStart: DateKey, weekCount = SEED_WEEKS.length): number {
  const weekNumber = Math.floor(daysBetween(ROTATION_EPOCH, startOfWeek(weekStart)) / 7);
  const cycle = Math.floor(weekNumber / weekCount);
  const position = ((weekNumber % weekCount) + weekCount) % weekCount;
  return cycleOrder(cycle, weekCount)[position]!;
}

export function getClueForDate(date: DateKey): Clue {
  const week = SEED_WEEKS[getWeekSetIndex(startOfWeek(date))]!;
  return week[getWeekday(date)]!;
}

export function buildDayContent(date: DateKey, today: DateKey): DayContent {
  const weekday = getWeekday(date);
  const rule = getDayRule(weekday);
  return {
    date,
    weekday,
    baseValue: rule.baseValue,
    difficulty: rule.difficulty,
    gameType: rule.gameType,
    clue: date <= endOfWeek(today) ? getClueForDate(date) : undefined,
  };
}

const clueIndex = new Map(ALL_CLUES.map((clue) => [clue.id, clue]));

export const localContentProvider: ContentProvider = {
  async getWeek(weekStart, today) {
    const start = startOfWeek(weekStart);
    return { weekStart: start, days: weekDates(start).map((date) => buildDayContent(date, today)) };
  },
  async getClueById(id) {
    return clueIndex.get(id);
  },
};

export function getClueByIdSync(id: string): Clue | undefined {
  return clueIndex.get(id);
}
