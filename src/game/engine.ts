import { isCorrectResponse } from '../lib/answerUtils';
import { getWeekday } from '../lib/dateUtils';
import { hashToUnit } from '../lib/random';
import { getWagerLimitsFor, scoreResponse, validateWager } from '../lib/scoringUtils';
import { getBalanceBefore, isResolved } from '../lib/statsUtils';
import type { Clue, DateKey, DayContent, DayRecord, PersistedState } from '../types';
import { DAILY_DOUBLE_PROBABILITY } from './rules';

/**
 * Pure state transitions for the daily game. Every function takes the current
 * persisted state and returns a new one (or throws a GameRuleError); the UI
 * never computes winnings itself.
 */

export type GameErrorCode =
  | 'not-today'
  | 'no-clue'
  | 'no-record'
  | 'already-resolved'
  | 'wrong-phase'
  | 'invalid-wager'
  | 'empty-response';

export class GameRuleError extends Error {
  readonly code: GameErrorCode;
  constructor(code: GameErrorCode, message: string) {
    super(message);
    this.name = 'GameRuleError';
    this.code = code;
  }
}

/** Daily Doubles are a deterministic function of the player's seed and the date, so refreshing can't reroll them. */
export function isDailyDoubleFor(playerId: string, date: DateKey): boolean {
  if (getWeekday(date) === 6) return false;
  return hashToUnit(`${playerId}:${date}:daily-double`) < DAILY_DOUBLE_PROBABILITY;
}

function withRecord(state: PersistedState, record: DayRecord): PersistedState {
  return { ...state, records: { ...state.records, [record.date]: record } };
}

function requireOpenRecord(state: PersistedState, date: DateKey, today: DateKey): DayRecord {
  if (date !== today) throw new GameRuleError('not-today', 'Only today’s clue can be played.');
  const record = state.records[date];
  if (!record) throw new GameRuleError('no-record', 'This clue hasn’t been opened yet.');
  if (record.phase === 'resolved') {
    throw new GameRuleError('already-resolved', 'You’ve already answered today’s clue.');
  }
  return record;
}

/**
 * Opens today's clue. Standard clues are revealed immediately; Daily Doubles and
 * Final Jeopardy enter the wagering phase first. Calling this again is a no-op.
 */
export function startChallenge(
  state: PersistedState,
  params: { day: DayContent; today: DateKey; now: Date },
): PersistedState {
  const { day, today, now } = params;
  if (day.date !== today) throw new GameRuleError('not-today', 'Only today’s clue can be played.');
  if (!day.clue) throw new GameRuleError('no-clue', 'Today’s clue is unavailable.');
  if (state.records[day.date]) return state;

  const isDailyDouble = day.gameType === 'standard' && isDailyDoubleFor(state.playerId, day.date);
  const needsWager = isDailyDouble || day.gameType === 'final';
  const timestamp = now.toISOString();

  return withRecord(state, {
    date: day.date,
    clueId: day.clue.id,
    category: day.clue.category,
    gameType: day.gameType,
    baseValue: day.baseValue,
    isDailyDouble,
    phase: needsWager ? 'wagering' : 'answering',
    startedAt: timestamp,
    clueRevealedAt: needsWager ? undefined : timestamp,
  });
}

/** Locks the wager for a Daily Double or Final Jeopardy and reveals the clue. Cannot be undone. */
export function lockWager(
  state: PersistedState,
  params: { date: DateKey; today: DateKey; wager: unknown; now: Date },
): PersistedState {
  const record = requireOpenRecord(state, params.date, params.today);
  if (record.phase !== 'wagering') {
    throw new GameRuleError('wrong-phase', 'Your wager is already locked.');
  }
  const limits = getWagerLimitsFor(record, getBalanceBefore(state.records, record.date));
  if (!limits) throw new GameRuleError('wrong-phase', 'This clue doesn’t take a wager.');

  const result = validateWager(params.wager, limits);
  if (!result.valid) throw new GameRuleError('invalid-wager', result.reason);

  const timestamp = params.now.toISOString();
  return withRecord(state, {
    ...record,
    wager: result.wager,
    wagerLockedAt: timestamp,
    clueRevealedAt: timestamp,
    phase: 'answering',
  });
}

/** Submits the one allowed response for today's clue and finalizes the result. */
export function submitAnswer(
  state: PersistedState,
  params: {
    date: DateKey;
    today: DateKey;
    response: string;
    clue: Pick<Clue, 'id' | 'correctAnswer' | 'acceptedAnswers'>;
    now: Date;
  },
): PersistedState {
  const record = requireOpenRecord(state, params.date, params.today);
  if (record.phase !== 'answering') {
    throw new GameRuleError('wrong-phase', 'Lock in your wager before answering.');
  }
  if (params.clue.id !== record.clueId) {
    throw new GameRuleError('no-clue', 'This clue doesn’t match today’s record.');
  }
  const response = params.response.trim();
  if (!response) throw new GameRuleError('empty-response', 'Type a response before submitting.');

  const correct = isCorrectResponse(response, params.clue);
  return withRecord(state, {
    ...record,
    phase: 'resolved',
    response,
    correct,
    delta: scoreResponse(record, correct),
    resolvedAt: params.now.toISOString(),
  });
}

/**
 * Settles records from earlier days that were left open. A clue that was revealed
 * but never answered counts as an incorrect response (so walking away can't dodge a
 * loss); a clue that was never revealed is simply missed and its record is dropped.
 */
export function finalizeExpired(state: PersistedState, today: DateKey, now: Date): PersistedState {
  let changed = false;
  const records = { ...state.records };
  for (const [date, record] of Object.entries(state.records)) {
    if (date >= today || isResolved(record)) continue;
    changed = true;
    if (record.phase === 'answering' && record.clueRevealedAt) {
      records[date] = {
        ...record,
        phase: 'resolved',
        response: '',
        correct: false,
        forfeited: true,
        delta: scoreResponse(record, false),
        resolvedAt: now.toISOString(),
      };
    } else {
      delete records[date];
    }
  }
  return changed ? { ...state, records } : state;
}
