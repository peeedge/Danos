import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatWeekRange,
  getTodayKey,
  getWeekday,
  isDateKey,
  msUntilNextDay,
  resolveTimeZone,
  startOfWeek,
  weekDates,
} from './dateUtils';

describe('getTodayKey', () => {
  it('rolls over at midnight in the configured timezone, not UTC', () => {
    // 03:30 UTC on Oct 26 is still 23:30 on Oct 25 in New York (EDT, UTC−4).
    const instant = new Date('2026-10-26T03:30:00Z');
    expect(getTodayKey('America/New_York', instant)).toBe('2026-10-25');
    expect(getTodayKey('UTC', instant)).toBe('2026-10-26');
    expect(getTodayKey('Asia/Tokyo', instant)).toBe('2026-10-26');
  });

  it('changes exactly at local midnight', () => {
    expect(getTodayKey('America/New_York', new Date('2026-10-26T03:59:59Z'))).toBe('2026-10-25');
    expect(getTodayKey('America/New_York', new Date('2026-10-26T04:00:00Z'))).toBe('2026-10-26');
  });

  it('handles DST transitions', () => {
    // US DST ends Nov 1, 2026 at 2am local; midnight Nov 2 is 05:00 UTC.
    expect(getTodayKey('America/New_York', new Date('2026-11-02T04:59:59Z'))).toBe('2026-11-01');
    expect(getTodayKey('America/New_York', new Date('2026-11-02T05:00:00Z'))).toBe('2026-11-02');
  });

  it('handles half-hour offsets', () => {
    // India is UTC+5:30, so 18:29 UTC is 23:59 IST and 18:30 UTC is the next day.
    expect(getTodayKey('Asia/Kolkata', new Date('2026-10-26T18:29:00Z'))).toBe('2026-10-26');
    expect(getTodayKey('Asia/Kolkata', new Date('2026-10-26T18:30:00Z'))).toBe('2026-10-27');
  });
});

describe('msUntilNextDay', () => {
  it('counts down to local midnight', () => {
    // 22:00 in New York → 2 hours left.
    expect(msUntilNextDay('America/New_York', new Date('2026-10-27T02:00:00Z'))).toBe(2 * 3600_000);
  });
});

describe('week math', () => {
  it('weeks start on Monday', () => {
    expect(getWeekday('2026-10-26')).toBe(0); // Monday
    expect(getWeekday('2026-11-01')).toBe(6); // Sunday
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28');
    expect(weekDates('2026-12-28')).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03',
    ]);
  });

  it('counts days across DST without drift', () => {
    expect(daysBetween('2026-10-26', '2026-11-09')).toBe(14);
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
  });

  it('formats week ranges', () => {
    expect(formatWeekRange('2026-10-26')).toBe('Oct 26 – Nov 1, 2026');
    expect(formatWeekRange('2026-11-02')).toBe('Nov 2 – 8, 2026');
  });
});

describe('validation helpers', () => {
  it('validates date keys', () => {
    expect(isDateKey('2026-10-26')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('10/26/2026')).toBe(false);
    expect(isDateKey(42)).toBe(false);
  });

  it('falls back to a real zone for auto or invalid settings', () => {
    expect(resolveTimeZone('Europe/Paris')).toBe('Europe/Paris');
    expect(resolveTimeZone('Not/AZone')).not.toBe('Not/AZone');
    expect(resolveTimeZone('auto')).toBeTruthy();
  });
});
