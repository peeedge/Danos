import { describe, expect, it } from 'vitest';
import type { DateKey, DayRecord } from '../types';
import { buildShareText, shareOrCopy } from './shareUtils';

const MONDAY: DateKey = '2026-10-26';

function resolved(date: DateKey, extra: Partial<DayRecord> = {}): DayRecord {
  return {
    date,
    clueId: `clue-${date}`,
    category: extra.category ?? 'Capital Ideas',
    gameType: extra.gameType ?? 'standard',
    baseValue: extra.baseValue ?? 200,
    isDailyDouble: extra.isDailyDouble ?? false,
    phase: 'resolved',
    startedAt: '',
    correct: extra.correct ?? true,
    delta: extra.delta ?? 200,
    resolvedAt: '',
    ...extra,
  };
}

describe('buildShareText', () => {
  it('shares a spoiler-free daily result and week grid', () => {
    const record = resolved(MONDAY);
    const text = buildShareText({
      date: MONDAY,
      today: MONDAY,
      record,
      records: { [MONDAY]: record },
      streak: 1,
    });
    expect(text).toBe(
      ['Danos — Mon Oct 26', '🟦 Capital Ideas', '+$200', '', 'This week', '🟦⬜⬜⬜⬜⬜⬜', 'Week +$200 · Streak 1'].join('\n'),
    );
    expect(text).not.toMatch(/Paris|Seine|Louvre/i);
  });

  it('marks Daily Doubles and Final Jeopardy in gold and never leaks the clue', () => {
    const monday = resolved(MONDAY, { delta: 200 });
    const dd = resolved('2026-10-28', {
      category: 'Opening Lines',
      isDailyDouble: true,
      correct: true,
      delta: 600,
      wager: 600,
    });
    const text = buildShareText({
      date: '2026-10-28',
      today: '2026-10-28',
      record: dd,
      records: { [MONDAY]: monday, '2026-10-28': dd },
      streak: 2,
    });
    expect(text).toContain('🟨 Opening Lines · Daily Double');
    expect(text).toContain('🟦⬜🟨⬜⬜⬜⬜');
    expect(text).toContain('Week +$800');
    expect(text).not.toContain('Call me Ishmael');
  });

  it('uses a dark square for an incorrect answer', () => {
    const record = resolved(MONDAY, { correct: false, delta: -200 });
    const text = buildShareText({
      date: MONDAY,
      today: MONDAY,
      record,
      records: { [MONDAY]: record },
      streak: 0,
    });
    expect(text).toContain('⬛ Capital Ideas');
    expect(text).toContain('−$200');
    expect(text).toContain('⬛⬜⬜⬜⬜⬜⬜');
  });
});

describe('shareOrCopy', () => {
  it('uses the Web Share API on mobile', async () => {
    const share = async () => undefined;
    const navigatorLike = {
      share,
      canShare: () => true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      clipboard: { writeText: async () => {} },
    } as unknown as Navigator;
    await expect(shareOrCopy('hello', navigatorLike)).resolves.toBe('shared');
  });

  it('copies on desktop even when share() exists', async () => {
    const writes: string[] = [];
    const navigatorLike = {
      share: async () => undefined,
      canShare: () => true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129',
      clipboard: {
        writeText: async (text: string) => {
          writes.push(text);
        },
      },
    } as unknown as Navigator;
    await expect(shareOrCopy('desktop', navigatorLike)).resolves.toBe('copied');
    expect(writes).toEqual(['desktop']);
  });

  it('treats a dismissed share sheet as cancelled, not a copy', async () => {
    const abort = Object.assign(new Error('Share canceled'), { name: 'AbortError' });
    const navigatorLike = {
      share: async () => {
        throw abort;
      },
      canShare: () => true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      clipboard: { writeText: async () => {} },
    } as unknown as Navigator;
    await expect(shareOrCopy('hello', navigatorLike)).resolves.toBe('cancelled');
  });

  it('copies to the clipboard when share is unavailable', async () => {
    const writes: string[] = [];
    const navigatorLike = {
      clipboard: {
        writeText: async (text: string) => {
          writes.push(text);
        },
      },
    } as unknown as Navigator;
    await expect(shareOrCopy('copied text', navigatorLike)).resolves.toBe('copied');
    expect(writes).toEqual(['copied text']);
  });

  it('reports failure when nothing can share or copy', async () => {
    await expect(shareOrCopy('x', {} as Navigator)).resolves.toBe('failed');
  });
});
