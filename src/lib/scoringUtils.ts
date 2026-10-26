import { FINAL_FALLBACK_MAX_WAGER } from '../game/rules';
import type { DayRecord, WagerLimits } from '../types';

export function getDailyDoubleWagerLimits(weeklyBalance: number, baseValue: number): WagerLimits {
  return { min: 0, max: Math.max(weeklyBalance, baseValue) };
}

export function getFinalWagerLimits(weeklyBalance: number): WagerLimits {
  return { min: 0, max: weeklyBalance > 0 ? weeklyBalance : FINAL_FALLBACK_MAX_WAGER };
}

/** Wager limits for a record that requires a wager, or `null` for a standard clue. */
export function getWagerLimitsFor(
  record: Pick<DayRecord, 'gameType' | 'isDailyDouble' | 'baseValue'>,
  weeklyBalance: number,
): WagerLimits | null {
  if (record.gameType === 'final') return getFinalWagerLimits(weeklyBalance);
  if (record.isDailyDouble) return getDailyDoubleWagerLimits(weeklyBalance, record.baseValue);
  return null;
}

export type WagerValidation =
  | { valid: true; wager: number }
  | { valid: false; reason: string };

export function validateWager(value: unknown, limits: WagerLimits): WagerValidation {
  const num = typeof value === 'string' ? Number(value.replace(/[$,\s]/g, '')) : value;
  if (typeof num !== 'number' || (typeof value === 'string' && value.trim() === '') || !Number.isFinite(num)) {
    return { valid: false, reason: 'Enter a whole-dollar wager.' };
  }
  if (!Number.isInteger(num)) return { valid: false, reason: 'Wagers must be whole dollars.' };
  if (num < limits.min) return { valid: false, reason: `The minimum wager is ${formatMoney(limits.min)}.` };
  if (num > limits.max) return { valid: false, reason: `The maximum wager is ${formatMoney(limits.max)}.` };
  return { valid: true, wager: num };
}

/** Net winnings change for a resolved clue. The single source of truth for scoring. */
export function scoreResponse(
  record: Pick<DayRecord, 'gameType' | 'isDailyDouble' | 'baseValue' | 'wager'>,
  correct: boolean,
): number {
  const needsWager = record.gameType === 'final' || record.isDailyDouble;
  if (needsWager && (record.wager === undefined || record.wager < 0)) {
    throw new Error('A locked wager is required to score this clue.');
  }
  const stake = needsWager ? record.wager! : record.baseValue;
  return correct ? stake : -stake;
}

export function formatMoney(amount: number, options: { signed?: boolean } = {}): string {
  const abs = Math.abs(Math.round(amount)).toLocaleString('en-US');
  if (amount < 0) return `−$${abs}`;
  if (options.signed && amount > 0) return `+$${abs}`;
  return `$${abs}`;
}
