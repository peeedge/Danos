import { describe, expect, it } from 'vitest';
import { buildDayContent } from '../content/contentProvider';
import { addDays, weekDates } from '../lib/dateUtils';
import { getWeeklyTotal } from '../lib/statsUtils';
import { createInitialState, loadState, saveState, type StorageLike } from '../persistence/storage';
import type { DateKey, PersistedState } from '../types';
import { DAILY_DOUBLE_PROBABILITY } from './rules';
import {
  finalizeExpired,
  GameRuleError,
  isDailyDoubleFor,
  lockWager,
  startChallenge,
  submitAnswer,
} from './engine';

const MONDAY = '2026-10-26';
const NOW = new Date('2026-10-26T12:00:00Z');

function findPlayer(date: DateKey, wantDailyDouble: boolean): string {
  for (let i = 0; i < 10_000; i++) {
    const id = `player-${i}`;
    if (isDailyDoubleFor(id, date) === wantDailyDouble) return id;
  }
  throw new Error('no suitable player id');
}

function stateFor(playerId: string, firstSeen: DateKey = MONDAY): PersistedState {
  return { ...createInitialState(firstSeen), playerId };
}

function play(state: PersistedState, date: DateKey, answer: 'right' | 'wrong', wager?: number) {
  const day = buildDayContent(date, date);
  let next = startChallenge(state, { day, today: date, now: NOW });
  if (next.records[date]!.phase === 'wagering') {
    next = lockWager(next, { date, today: date, wager: wager ?? 0, now: NOW });
  }
  const response = answer === 'right' ? `What is ${day.clue!.correctAnswer}?` : 'What is nonsense?';
  return submitAnswer(next, { date, today: date, response, clue: day.clue!, now: NOW });
}

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('standard clues', () => {
  const player = findPlayer(MONDAY, false);

  it('awards the base value for a correct response', () => {
    const state = play(stateFor(player), MONDAY, 'right');
    expect(state.records[MONDAY]).toMatchObject({ phase: 'resolved', correct: true, delta: 200 });
  });

  it('deducts the base value for an incorrect response', () => {
    const state = play(stateFor(player), MONDAY, 'wrong');
    expect(state.records[MONDAY]).toMatchObject({ phase: 'resolved', correct: false, delta: -200 });
  });

  it('reveals the clue immediately on start', () => {
    const day = buildDayContent(MONDAY, MONDAY);
    const state = startChallenge(stateFor(player), { day, today: MONDAY, now: NOW });
    expect(state.records[MONDAY]).toMatchObject({ phase: 'answering', isDailyDouble: false });
    expect(state.records[MONDAY]!.clueRevealedAt).toBeDefined();
  });

  it('allows only one resolution per day', () => {
    const state = play(stateFor(player), MONDAY, 'wrong');
    const day = buildDayContent(MONDAY, MONDAY);
    expect(() =>
      submitAnswer(state, { date: MONDAY, today: MONDAY, response: day.clue!.correctAnswer, clue: day.clue!, now: NOW }),
    ).toThrowError(GameRuleError);
    // Restarting is a no-op rather than a reset.
    expect(startChallenge(state, { day, today: MONDAY, now: NOW })).toBe(state);
  });

  it('refuses empty responses without consuming the attempt', () => {
    const day = buildDayContent(MONDAY, MONDAY);
    const started = startChallenge(stateFor(player), { day, today: MONDAY, now: NOW });
    expect(() =>
      submitAnswer(started, { date: MONDAY, today: MONDAY, response: '   ', clue: day.clue!, now: NOW }),
    ).toThrowError(/Type a response/);
    expect(started.records[MONDAY]!.phase).toBe('answering');
  });

  it('cannot play past days or next week', () => {
    const nextMonday = addDays(MONDAY, 7);
    const nextWeek = buildDayContent(nextMonday, nextMonday);
    expect(() => startChallenge(stateFor(player), { day: nextWeek, today: MONDAY, now: NOW })).toThrowError(
      /this week/,
    );
    const yesterday = buildDayContent(addDays(MONDAY, -1), addDays(MONDAY, -1));
    expect(() => startChallenge(stateFor(player), { day: yesterday, today: MONDAY, now: NOW })).toThrowError(
      /closed/,
    );
  });

  it('can play later days in the current week', () => {
    const tuesday = addDays(MONDAY, 1);
    const aheadPlayer = findPlayer(tuesday, false);
    const day = buildDayContent(tuesday, MONDAY);
    expect(day.clue).toBeDefined();
    const started = startChallenge(stateFor(aheadPlayer), { day, today: MONDAY, now: NOW });
    expect(started.records[tuesday]).toMatchObject({ phase: 'answering', date: tuesday });
  });

  it('never exposes next week’s clue text from the content layer', () => {
    expect(buildDayContent(addDays(MONDAY, 7), MONDAY).clue).toBeUndefined();
    expect(buildDayContent(addDays(MONDAY, 1), MONDAY).clue).toBeDefined();
    expect(buildDayContent(MONDAY, MONDAY).clue).toBeDefined();
  });
});

describe('Daily Doubles', () => {
  const wednesday = addDays(MONDAY, 2);
  const player = findPlayer(wednesday, true);

  it('is deterministic for a player and date', () => {
    expect(isDailyDoubleFor(player, wednesday)).toBe(true);
    expect(isDailyDoubleFor(player, wednesday)).toBe(true);
  });

  it('never lands on Sunday', () => {
    const sunday = addDays(MONDAY, 6);
    for (let i = 0; i < 500; i++) expect(isDailyDoubleFor(`p${i}`, sunday)).toBe(false);
  });

  it('occurs at roughly the configured rate', () => {
    let hits = 0;
    let trials = 0;
    for (let i = 0; i < 7000; i++) {
      if (i % 7 === 6) continue; // Sundays are never eligible
      trials++;
      if (isDailyDoubleFor('rate-test', addDays('2020-01-06', i))) hits++;
    }
    const observed = hits / trials;
    expect(observed).toBeGreaterThan(DAILY_DOUBLE_PROBABILITY * 0.6);
    expect(observed).toBeLessThan(DAILY_DOUBLE_PROBABILITY * 1.4);
  });

  it('starts in the wagering phase without revealing the clue', () => {
    const day = buildDayContent(wednesday, wednesday);
    const state = startChallenge(stateFor(player), { day, today: wednesday, now: NOW });
    expect(state.records[wednesday]).toMatchObject({ phase: 'wagering', isDailyDouble: true });
    expect(state.records[wednesday]!.clueRevealedAt).toBeUndefined();
  });

  it('caps the wager at the greater of weekly balance and clue value', () => {
    const day = buildDayContent(wednesday, wednesday);
    const started = startChallenge(stateFor(player), { day, today: wednesday, now: NOW });
    // No prior winnings → max is the $600 clue value.
    expect(() => lockWager(started, { date: wednesday, today: wednesday, wager: 601, now: NOW })).toThrowError(
      /maximum wager is \$600/,
    );
    expect(() => lockWager(started, { date: wednesday, today: wednesday, wager: -5, now: NOW })).toThrowError(
      GameRuleError,
    );
    const locked = lockWager(started, { date: wednesday, today: wednesday, wager: 600, now: NOW });
    expect(locked.records[wednesday]).toMatchObject({ wager: 600, phase: 'answering' });
  });

  it('lets earlier winnings raise the cap', () => {
    // Give the player a big Monday/Tuesday by hand-crafting resolved records.
    const base = stateFor(player);
    const rich: PersistedState = {
      ...base,
      records: {
        [MONDAY]: { date: MONDAY, clueId: 'x', category: '', gameType: 'standard', baseValue: 200, isDailyDouble: false, phase: 'resolved', startedAt: '', correct: true, delta: 2000, resolvedAt: '' },
      },
    };
    const day = buildDayContent(wednesday, wednesday);
    const started = startChallenge(rich, { day, today: wednesday, now: NOW });
    expect(() => lockWager(started, { date: wednesday, today: wednesday, wager: 2000, now: NOW })).not.toThrow();
    expect(() => lockWager(started, { date: wednesday, today: wednesday, wager: 2001, now: NOW })).toThrow();
  });

  it('awards or deducts exactly the wager', () => {
    expect(play(stateFor(player), wednesday, 'right', 450).records[wednesday]!.delta).toBe(450);
    expect(play(stateFor(player), wednesday, 'wrong', 450).records[wednesday]!.delta).toBe(-450);
    expect(play(stateFor(player), wednesday, 'wrong', 0).records[wednesday]!.delta).toBe(-0);
  });

  it('cannot be re-wagered once locked', () => {
    const day = buildDayContent(wednesday, wednesday);
    let state = startChallenge(stateFor(player), { day, today: wednesday, now: NOW });
    state = lockWager(state, { date: wednesday, today: wednesday, wager: 100, now: NOW });
    expect(() => lockWager(state, { date: wednesday, today: wednesday, wager: 600, now: NOW })).toThrowError(
      /already locked/,
    );
  });

  it('requires a wager before answering', () => {
    const day = buildDayContent(wednesday, wednesday);
    const state = startChallenge(stateFor(player), { day, today: wednesday, now: NOW });
    expect(() =>
      submitAnswer(state, { date: wednesday, today: wednesday, response: 'x', clue: day.clue!, now: NOW }),
    ).toThrowError(/Lock in your wager/);
  });

  it('survives a refresh: the locked wager and status are restored from storage', () => {
    const storage = memoryStorage();
    const day = buildDayContent(wednesday, wednesday);
    let state = startChallenge(stateFor(player), { day, today: wednesday, now: NOW });
    state = lockWager(state, { date: wednesday, today: wednesday, wager: 300, now: NOW });
    saveState(storage, state);

    const reloaded = loadState(storage);
    expect(reloaded.status).toBe('ok');
    if (reloaded.status !== 'ok') return;
    const record = reloaded.state.records[wednesday]!;
    expect(record).toMatchObject({ isDailyDouble: true, wager: 300, phase: 'answering' });
    expect(() =>
      lockWager(reloaded.state, { date: wednesday, today: wednesday, wager: 0, now: NOW }),
    ).toThrow();
    // Starting again after the refresh keeps the existing record.
    expect(startChallenge(reloaded.state, { day, today: wednesday, now: NOW }).records[wednesday]).toEqual(record);
  });
});

describe('Final Jeopardy', () => {
  const sunday = addDays(MONDAY, 6);
  const player = findPlayer(MONDAY, false);

  function weekWithBalance(balance: number): PersistedState {
    return {
      ...stateFor(player),
      records: {
        [MONDAY]: { date: MONDAY, clueId: 'x', category: '', gameType: 'standard', baseValue: 200, isDailyDouble: false, phase: 'resolved', startedAt: '', correct: balance >= 0, delta: balance, resolvedAt: '' },
      },
    };
  }

  it('always requires a wager', () => {
    const day = buildDayContent(sunday, sunday);
    const state = startChallenge(stateFor(player), { day, today: sunday, now: NOW });
    expect(state.records[sunday]).toMatchObject({ phase: 'wagering', gameType: 'final', isDailyDouble: false });
    expect(state.records[sunday]!.clueRevealedAt).toBeUndefined();
  });

  it('caps the wager at the positive weekly balance', () => {
    const day = buildDayContent(sunday, sunday);
    const state = startChallenge(weekWithBalance(2400), { day, today: sunday, now: NOW });
    expect(() => lockWager(state, { date: sunday, today: sunday, wager: 2401, now: NOW })).toThrow();
    expect(lockWager(state, { date: sunday, today: sunday, wager: 2400, now: NOW }).records[sunday]!.wager).toBe(2400);
  });

  it('allows up to $1,000 when the balance is zero or negative', () => {
    const day = buildDayContent(sunday, sunday);
    for (const balance of [0, -800]) {
      const state = startChallenge(weekWithBalance(balance), { day, today: sunday, now: NOW });
      expect(() => lockWager(state, { date: sunday, today: sunday, wager: 1000, now: NOW })).not.toThrow();
      expect(() => lockWager(state, { date: sunday, today: sunday, wager: 1001, now: NOW })).toThrow();
    }
  });

  it('adds or subtracts the wager and can end the week negative', () => {
    const win = play(weekWithBalance(1000), sunday, 'right', 1000);
    expect(getWeeklyTotal(win.records, MONDAY)).toBe(2000);
    const loss = play(weekWithBalance(-800), sunday, 'wrong', 1000);
    expect(getWeeklyTotal(loss.records, MONDAY)).toBe(-1800);
  });

  it('is playable after missing every earlier day', () => {
    const state = play(stateFor(player), sunday, 'right', 500);
    expect(state.records[sunday]!.delta).toBe(500);
  });

  it('cannot be replayed or re-wagered after the result', () => {
    const state = play(weekWithBalance(1000), sunday, 'wrong', 1000);
    const day = buildDayContent(sunday, sunday);
    expect(() => lockWager(state, { date: sunday, today: sunday, wager: 0, now: NOW })).toThrowError(/already answered/);
    expect(() =>
      submitAnswer(state, { date: sunday, today: sunday, response: day.clue!.correctAnswer, clue: day.clue!, now: NOW }),
    ).toThrowError(/already answered/);
  });
});

describe('play-ahead', () => {
  it('lets a player finish the remaining column on a single day', () => {
    let player = '';
    for (let i = 0; i < 50_000; i++) {
      const id = `column-${i}`;
      if (weekDates(MONDAY).slice(0, 6).every((date) => !isDailyDoubleFor(id, date))) {
        player = id;
        break;
      }
    }
    expect(player).not.toBe('');

    let state = stateFor(player);
    for (const date of weekDates(MONDAY).slice(0, 6)) {
      const day = buildDayContent(date, MONDAY);
      state = startChallenge(state, { day, today: MONDAY, now: NOW });
      state = submitAnswer(state, {
        date,
        today: MONDAY,
        response: `What is ${day.clue!.correctAnswer}?`,
        clue: day.clue!,
        now: NOW,
      });
    }
    expect(weekDates(MONDAY).slice(0, 6).every((date) => state.records[date]?.phase === 'resolved')).toBe(true);
    expect(getWeeklyTotal(state.records, MONDAY)).toBe(200 + 400 + 600 + 800 + 1000 + 1200);
  });
});

describe('weekly isolation', () => {
  it('a new week starts from zero and never alters the previous week', () => {
    const player = findPlayer(MONDAY, false);
    let state = stateFor(player);
    for (const date of weekDates(MONDAY).slice(0, 6)) {
      if (isDailyDoubleFor(player, date)) continue;
      state = play(state, date, 'right');
    }
    const previousWeekTotal = getWeeklyTotal(state.records, MONDAY);
    const nextMonday = addDays(MONDAY, 7);
    expect(getWeeklyTotal(state.records, nextMonday)).toBe(0);

    if (!isDailyDoubleFor(player, nextMonday)) state = play(state, nextMonday, 'wrong');
    expect(getWeeklyTotal(state.records, MONDAY)).toBe(previousWeekTotal);
  });
});

describe('finalizeExpired', () => {
  const player = findPlayer(MONDAY, false);
  const tuesday = addDays(MONDAY, 1);

  it('counts a revealed but unanswered clue as incorrect once the day ends', () => {
    const day = buildDayContent(MONDAY, MONDAY);
    const opened = startChallenge(stateFor(player), { day, today: MONDAY, now: NOW });
    const settled = finalizeExpired(opened, tuesday, NOW);
    expect(settled.records[MONDAY]).toMatchObject({ phase: 'resolved', correct: false, delta: -200, forfeited: true });
  });

  it('drops a wager-phase record that never revealed the clue (a plain miss)', () => {
    const wednesday = addDays(MONDAY, 2);
    const ddPlayer = findPlayer(wednesday, true);
    const day = buildDayContent(wednesday, wednesday);
    const opened = startChallenge(stateFor(ddPlayer), { day, today: wednesday, now: NOW });
    const settled = finalizeExpired(opened, addDays(wednesday, 1), NOW);
    expect(settled.records[wednesday]).toBeUndefined();
  });

  it('leaves today and resolved records untouched', () => {
    const played = play(stateFor(player), MONDAY, 'right');
    expect(finalizeExpired(played, tuesday, NOW)).toBe(played);
    const day = buildDayContent(tuesday, tuesday);
    const openToday = startChallenge(played, { day, today: tuesday, now: NOW });
    expect(finalizeExpired(openToday, tuesday, NOW)).toBe(openToday);
  });
});
