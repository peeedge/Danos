import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  getDailyDoubleWagerLimits,
  getFinalWagerLimits,
  scoreResponse,
  validateWager,
} from './scoringUtils';

describe('scoreResponse', () => {
  const standard = { gameType: 'standard' as const, isDailyDouble: false, baseValue: 600 };

  it('awards and deducts the base value for standard clues', () => {
    expect(scoreResponse(standard, true)).toBe(600);
    expect(scoreResponse(standard, false)).toBe(-600);
  });

  it('uses the wager for Daily Doubles, ignoring base value', () => {
    const dd = { ...standard, isDailyDouble: true, wager: 1500 };
    expect(scoreResponse(dd, true)).toBe(1500);
    expect(scoreResponse(dd, false)).toBe(-1500);
  });

  it('uses the wager for Final Jeopardy', () => {
    const final = { gameType: 'final' as const, isDailyDouble: false, baseValue: 0, wager: 2400 };
    expect(scoreResponse(final, true)).toBe(2400);
    expect(scoreResponse(final, false)).toBe(-2400);
  });

  it('allows a zero wager', () => {
    const dd = { ...standard, isDailyDouble: true, wager: 0 };
    expect(scoreResponse(dd, true)).toBe(0);
    expect(scoreResponse(dd, false)).toBe(-0);
  });

  it('refuses to score a wager clue without a locked wager', () => {
    expect(() => scoreResponse({ ...standard, isDailyDouble: true }, true)).toThrow();
  });
});

describe('wager limits', () => {
  it('Daily Double max is the greater of weekly balance and clue value', () => {
    expect(getDailyDoubleWagerLimits(3000, 800)).toEqual({ min: 0, max: 3000 });
    expect(getDailyDoubleWagerLimits(200, 800)).toEqual({ min: 0, max: 800 });
    expect(getDailyDoubleWagerLimits(-600, 800)).toEqual({ min: 0, max: 800 });
  });

  it('Final Jeopardy max is the positive balance, else $1,000', () => {
    expect(getFinalWagerLimits(2600)).toEqual({ min: 0, max: 2600 });
    expect(getFinalWagerLimits(200)).toEqual({ min: 0, max: 200 });
    expect(getFinalWagerLimits(0)).toEqual({ min: 0, max: 1000 });
    expect(getFinalWagerLimits(-1400)).toEqual({ min: 0, max: 1000 });
  });
});

describe('validateWager', () => {
  const limits = { min: 0, max: 1000 };

  it('accepts whole-dollar wagers in range, including formatted strings', () => {
    expect(validateWager(0, limits)).toEqual({ valid: true, wager: 0 });
    expect(validateWager(1000, limits)).toEqual({ valid: true, wager: 1000 });
    expect(validateWager('$1,000', limits)).toEqual({ valid: true, wager: 1000 });
  });

  it('rejects out-of-range, fractional and non-numeric wagers', () => {
    expect(validateWager(1001, limits).valid).toBe(false);
    expect(validateWager(-1, limits).valid).toBe(false);
    expect(validateWager(10.5, limits).valid).toBe(false);
    expect(validateWager('abc', limits).valid).toBe(false);
    expect(validateWager('', limits).valid).toBe(false);
    expect(validateWager(Number.NaN, limits).valid).toBe(false);
    expect(validateWager(Infinity, limits).valid).toBe(false);
    expect(validateWager(null, limits).valid).toBe(false);
  });
});

describe('formatMoney', () => {
  it('formats signed amounts', () => {
    expect(formatMoney(1200)).toBe('$1,200');
    expect(formatMoney(-400)).toBe('−$400');
    expect(formatMoney(400, { signed: true })).toBe('+$400');
    expect(formatMoney(0, { signed: true })).toBe('$0');
  });
});
