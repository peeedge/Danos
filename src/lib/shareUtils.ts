import type { DateKey, DayRecord } from '../types';
import { formatMoney } from './scoringUtils';
import { formatShortDate, getWeekday, startOfWeek, WEEKDAY_SHORT, weekDates } from './dateUtils';
import { getDayStatus, getWeeklyTotal, isResolved } from './statsUtils';

export interface SharePayload {
  date: DateKey;
  today: DateKey;
  record: DayRecord;
  records: Record<DateKey, DayRecord>;
  streak: number;
}

function squareFor(date: DateKey, today: DateKey, record: DayRecord | undefined): string {
  const status = getDayStatus(date, today, record);
  if (status === 'correct') {
    if (record?.isDailyDouble || record?.gameType === 'final') return '🟨';
    return '🟦';
  }
  if (status === 'incorrect') return '⬛';
  return '⬜';
}

function resultGlyph(record: DayRecord): string {
  if (!isResolved(record) || !record.correct) return '⬛';
  if (record.isDailyDouble || record.gameType === 'final') return '🟨';
  return '🟦';
}

function specialLabel(record: DayRecord): string {
  if (record.gameType === 'final') return 'Final Jeopardy';
  if (record.isDailyDouble) return 'Daily Double';
  return '';
}

/** Spoiler-free share card: result, money, and a week grid. Never includes the clue or answer. */
export function buildShareText(payload: SharePayload): string {
  const { date, today, record, records, streak } = payload;
  const weekday = WEEKDAY_SHORT[getWeekday(date)];
  const title = `Danos — ${weekday} ${formatShortDate(date)}`;
  const special = specialLabel(record);
  const category = record.category || 'Daily clue';
  const headline = special ? `${resultGlyph(record)} ${category} · ${special}` : `${resultGlyph(record)} ${category}`;
  const delta = formatMoney(record.delta ?? 0, { signed: true });

  const weekStart = startOfWeek(date);
  const grid = weekDates(weekStart)
    .map((day) => squareFor(day, today, records[day]))
    .join('');
  const weekly = formatMoney(getWeeklyTotal(records, weekStart), { signed: true });

  return [title, headline, delta, '', 'This week', grid, `Week ${weekly} · Streak ${streak}`].join('\n');
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Native share sheets are a mobile gesture. Desktop Chrome exposes `share()` too, but copying is what people expect. */
export function prefersShareSheet(
  navigatorLike: Pick<Navigator, 'share' | 'canShare' | 'userAgent'> | undefined,
  text: string,
): boolean {
  if (!navigatorLike?.share) return false;
  const mobile = typeof navigatorLike.userAgent === 'string' && /Android|iPhone|iPad|iPod/i.test(navigatorLike.userAgent);
  if (!mobile) return false;
  if (typeof navigatorLike.canShare !== 'function') return true;
  try {
    return navigatorLike.canShare({ text });
  } catch {
    return true;
  }
}

export async function shareOrCopy(
  text: string,
  navigatorLike: Pick<Navigator, 'share' | 'canShare' | 'clipboard' | 'userAgent'> | undefined = globalThis.navigator,
): Promise<ShareResult> {
  if (prefersShareSheet(navigatorLike, text)) {
    try {
      await navigatorLike!.share!({ text, title: 'Danos' });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }

  const write = navigatorLike?.clipboard?.writeText;
  if (typeof write !== 'function') return 'failed';
  try {
    await write.call(navigatorLike.clipboard, text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
