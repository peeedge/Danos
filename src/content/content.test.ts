import { describe, expect, it } from 'vitest';
import { DAY_RULES } from '../game/rules';
import { isCorrectResponse, normalizeAnswer } from '../lib/answerUtils';
import { addDays } from '../lib/dateUtils';
import { buildDayContent, getClueForDate, getWeekSetIndex, localContentProvider } from './contentProvider';
import { ALL_CLUES, SEED_WEEKS } from './seedClues';

describe('seed content', () => {
  it('has at least eight complete weeks', () => {
    expect(SEED_WEEKS.length).toBeGreaterThanOrEqual(8);
    for (const week of SEED_WEEKS) expect(week).toHaveLength(7);
  });

  it('has unique ids', () => {
    expect(new Set(ALL_CLUES.map((c) => c.id)).size).toBe(ALL_CLUES.length);
  });

  it('gives every clue text, an answer, and an explanation', () => {
    for (const clue of ALL_CLUES) {
      expect(clue.clue.length, clue.id).toBeGreaterThan(20);
      expect(normalizeAnswer(clue.correctAnswer), clue.id).not.toBe('');
      expect(clue.explanation.length, clue.id).toBeGreaterThan(20);
      expect(Array.isArray(clue.acceptedAnswers), clue.id).toBe(true);
    }
  });

  it('accepts each clue’s own answer and variants, phrased as a question or not', () => {
    for (const clue of ALL_CLUES) {
      for (const answer of [clue.correctAnswer, ...clue.acceptedAnswers]) {
        expect(isCorrectResponse(answer, clue), `${clue.id}: ${answer}`).toBe(true);
        expect(isCorrectResponse(`What is ${answer}?`, clue), `${clue.id}: ${answer}`).toBe(true);
      }
      expect(isCorrectResponse('I have no idea', clue), clue.id).toBe(false);
    }
  });

  it('assigns difficulty from the weekday schedule', () => {
    for (const week of SEED_WEEKS) {
      week.forEach((clue, day) => expect(clue.difficulty).toBe(DAY_RULES[day]!.difficulty));
    }
  });

  it('uses distinct categories within each week and covers every subject', () => {
    for (const week of SEED_WEEKS) {
      expect(new Set(week.map((c) => c.category)).size).toBe(7);
    }
    expect(new Set(ALL_CLUES.map((c) => c.subject)).size).toBe(10);
  });
});

describe('schedule', () => {
  it('is stable for a given date', () => {
    expect(getClueForDate('2026-10-28').id).toBe(getClueForDate('2026-10-28').id);
    expect(getWeekSetIndex('2026-10-26')).toBe(getWeekSetIndex('2026-11-01'));
  });

  it('places the clue for each weekday in the matching slot', () => {
    for (let i = 0; i < 7; i++) {
      const clue = getClueForDate(addDays('2026-10-26', i));
      expect(clue.difficulty).toBe(DAY_RULES[i]!.difficulty);
    }
  });

  it('uses every curated week once per cycle and never repeats one back-to-back', () => {
    const indices = Array.from({ length: 80 }, (_, i) => getWeekSetIndex(addDays('2025-01-06', i * 7)));
    for (let i = 0; i + 1 < indices.length; i++) {
      expect(indices[i]).not.toBe(indices[i + 1]);
    }
    const aligned = Array.from({ length: SEED_WEEKS.length }, (_, i) => getWeekSetIndex(addDays('2024-01-01', i * 7)));
    expect(new Set(aligned).size).toBe(SEED_WEEKS.length);
  });

  it('withholds clues for future dates', async () => {
    const week = await localContentProvider.getWeek('2026-10-26', '2026-10-28');
    expect(week.days.map((d) => d.clue !== undefined)).toEqual([true, true, true, false, false, false, false]);
    expect(week.days[6]!.gameType).toBe('final');
    expect(buildDayContent('2026-10-27', '2026-10-28').baseValue).toBe(400);
  });
});
