import { describe, expect, it } from 'vitest';
import {
  CURRENT_VERSION,
  createInitialState,
  loadState,
  migrateAndSanitize,
  saveState,
  STORAGE_KEY,
  type StorageLike,
} from './storage';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const validRecord = {
  date: '2026-10-26',
  clueId: 'w1-mon',
  category: 'Capital Ideas',
  gameType: 'standard',
  baseValue: 200,
  isDailyDouble: false,
  phase: 'resolved',
  startedAt: '2026-10-26T12:00:00.000Z',
  response: 'Paris',
  correct: true,
  delta: 200,
  resolvedAt: '2026-10-26T12:01:00.000Z',
};

describe('loadState / saveState', () => {
  it('round-trips state', () => {
    const storage = memoryStorage();
    const state = { ...createInitialState('2026-10-26'), records: { '2026-10-26': validRecord as never } };
    expect(saveState(storage, state)).toBe(true);
    const loaded = loadState(storage);
    expect(loaded).toEqual({ status: 'ok', state });
  });

  it('reports empty storage', () => {
    expect(loadState(memoryStorage()).status).toBe('empty');
    expect(loadState(null).status).toBe('empty');
  });

  it('backs up unparseable JSON instead of discarding it', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{not json' });
    const result = loadState(storage);
    expect(result.status).toBe('recovered');
    if (result.status === 'recovered') expect(storage.data.get(result.backupKey!)).toBe('{not json');
  });

  it('refuses data from a newer, unknown version', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ ...createInitialState('2026-10-26'), version: CURRENT_VERSION + 1 }),
    });
    expect(loadState(storage).status).toBe('recovered');
  });

  it('survives storage that throws', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    expect(loadState(broken).status).toBe('empty');
    expect(saveState(broken, createInitialState('2026-10-26'))).toBe(false);
  });
});

describe('migrateAndSanitize', () => {
  it('migrates unversioned legacy data', () => {
    const legacy = { playerId: 'abc', firstSeenDate: '2026-10-01', records: {}, settings: { timeZone: 'UTC' } };
    expect(migrateAndSanitize(legacy)).toEqual({
      ...legacy,
      version: CURRENT_VERSION,
      settings: { timeZone: 'UTC', theme: 'auto' },
    });
  });

  it('drops invalid records but keeps valid ones', () => {
    const result = migrateAndSanitize({
      version: 1,
      playerId: 'abc',
      firstSeenDate: '2026-10-01',
      settings: {},
      records: {
        '2026-10-26': validRecord,
        'not-a-date': validRecord,
        '2026-10-27': { ...validRecord, phase: 'resolved', delta: 'lots' },
        '2026-10-28': { ...validRecord, isDailyDouble: true, phase: 'answering' }, // missing locked wager
        '2026-10-29': { ...validRecord, gameType: 'bonus' },
        '2026-10-30': 'garbage',
      },
    });
    expect(Object.keys(result!.records)).toEqual(['2026-10-26']);
    expect(result!.settings.timeZone).toBe('auto');
  });

  it('keeps a saved theme preference and defaults missing ones to auto', () => {
    const dark = migrateAndSanitize({
      version: 1,
      playerId: 'abc',
      firstSeenDate: '2026-10-01',
      records: {},
      settings: { timeZone: 'UTC', theme: 'dark' },
    });
    expect(dark!.settings.theme).toBe('dark');
    const missing = migrateAndSanitize({
      version: 1,
      playerId: 'abc',
      firstSeenDate: '2026-10-01',
      records: {},
      settings: { timeZone: 'UTC' },
    });
    expect(missing!.settings.theme).toBe('auto');
  });

  it('rejects data missing core fields', () => {
    expect(migrateAndSanitize(null)).toBeNull();
    expect(migrateAndSanitize([])).toBeNull();
    expect(migrateAndSanitize({ version: 1, firstSeenDate: '2026-10-01' })).toBeNull();
    expect(migrateAndSanitize({ version: 1, playerId: 'x', firstSeenDate: 'yesterday' })).toBeNull();
  });
});
