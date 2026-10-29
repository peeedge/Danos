import type { DateKey, Weekday } from '../types';

const DAY_MS = 86_400_000;
const KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Resolves the `auto` setting (or an invalid zone) to a concrete IANA timezone. */
export function resolveTimeZone(setting: string | undefined): string {
  if (!setting || setting === 'auto' || !isValidTimeZone(setting)) return browserTimeZone();
  return setting;
}

function zonedParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

/** The calendar date it currently is in `timeZone`. Danos days roll over at local midnight. */
export function getTodayKey(timeZone: string, now: Date = new Date()): DateKey {
  const { year, month, day } = zonedParts(now, timeZone);
  return toKey(year, month, day);
}

/** Milliseconds until the next local midnight in `timeZone` (approximate across DST shifts). */
export function msUntilNextDay(timeZone: string, now: Date = new Date()): number {
  const { hour, minute, second } = zonedParts(now, timeZone);
  const elapsed = ((hour * 60 + minute) * 60 + second) * 1000 + now.getMilliseconds();
  return Math.max(0, DAY_MS - elapsed);
}

export function toKey(year: number, month: number, day: number): DateKey {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string') return false;
  const match = KEY_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return date.getUTCFullYear() === Number(y) && date.getUTCMonth() === Number(m) - 1 && date.getUTCDate() === Number(d);
}

/** Date keys are calendar dates, so all arithmetic is done in UTC to sidestep DST. */
function keyToUtc(key: DateKey): Date {
  const match = KEY_PATTERN.exec(key);
  if (!match) throw new Error(`Invalid date key: ${key}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function utcToKey(date: Date): DateKey {
  return toKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addDays(key: DateKey, days: number): DateKey {
  return utcToKey(new Date(keyToUtc(key).getTime() + days * DAY_MS));
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((keyToUtc(to).getTime() - keyToUtc(from).getTime()) / DAY_MS);
}

export function getWeekday(key: DateKey): Weekday {
  return ((keyToUtc(key).getUTCDay() + 6) % 7) as Weekday;
}

export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -getWeekday(key));
}

export function endOfWeek(key: DateKey): DateKey {
  return addDays(startOfWeek(key), 6);
}

export function weekDates(weekStart: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isSameWeek(a: DateKey, b: DateKey): boolean {
  return startOfWeek(a) === startOfWeek(b);
}

/** Remaining clues in the current week can be played today; earlier days and later weeks cannot. */
export function isPlayableDate(date: DateKey, today: DateKey): boolean {
  return date >= today && isSameWeek(date, today);
}

export function formatLongDate(key: DateKey): string {
  return keyToUtc(key).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(key: DateKey): string {
  return keyToUtc(key).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
}

export function formatWeekRange(weekStart: DateKey): string {
  const end = addDays(weekStart, 6);
  const startDate = keyToUtc(weekStart);
  const endDate = keyToUtc(end);
  const sameMonth = startDate.getUTCMonth() === endDate.getUTCMonth();
  const startText = formatShortDate(weekStart);
  const endText = sameMonth
    ? String(endDate.getUTCDate())
    : formatShortDate(end);
  return `${startText} – ${endText}, ${endDate.getUTCFullYear()}`;
}

export function dayOfMonth(key: DateKey): number {
  return keyToUtc(key).getUTCDate();
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function listTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  try {
    const zones = intl.supportedValuesOf?.('timeZone');
    if (zones && zones.length > 0) return zones;
  } catch {
    // fall through to a small curated list
  }
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];
}
