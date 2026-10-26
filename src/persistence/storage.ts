import { isDateKey } from '../lib/dateUtils';
import { randomId } from '../lib/random';
import { isThemePreference } from '../lib/theme';
import type { DateKey, DayRecord, PersistedState, RecordPhase } from '../types';

export const STORAGE_KEY = 'danos:state';
export const CURRENT_VERSION = 1;

/** Minimal Storage surface so persistence can be tested without a browser. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createInitialState(today: DateKey): PersistedState {
  return {
    version: CURRENT_VERSION,
    playerId: randomId(),
    firstSeenDate: today,
    records: {},
    settings: { timeZone: 'auto', theme: 'auto' },
  };
}

/**
 * Each migration upgrades persisted data from version N to N + 1.
 * Add an entry here whenever the persisted shape changes.
 */
type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
const MIGRATIONS: Record<number, Migration> = {
  // Pre-release builds stored records without a version field.
  0: (data) => ({ ...data, version: 1 }),
};

const PHASES: readonly RecordPhase[] = ['wagering', 'answering', 'resolved'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonNegativeInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);

/** Validates a single record; returns `null` when it can't be trusted. */
export function sanitizeRecord(date: string, raw: unknown): DayRecord | null {
  if (!isDateKey(date) || !isObject(raw)) return null;
  const { clueId, category, gameType, baseValue, isDailyDouble, phase, startedAt } = raw;
  if (typeof clueId !== 'string' || !clueId) return null;
  if (gameType !== 'standard' && gameType !== 'final') return null;
  if (!isNonNegativeInt(baseValue)) return null;
  if (!PHASES.includes(phase as RecordPhase)) return null;

  const record: DayRecord = {
    date,
    clueId,
    category: typeof category === 'string' ? category : '',
    gameType,
    baseValue,
    isDailyDouble: isDailyDouble === true,
    phase: phase as RecordPhase,
    startedAt: optionalString(startedAt) ?? new Date(0).toISOString(),
  };

  const needsWager = gameType === 'final' || record.isDailyDouble;
  if (raw.wager !== undefined) {
    if (!isNonNegativeInt(raw.wager)) return null;
    record.wager = raw.wager;
    record.wagerLockedAt = optionalString(raw.wagerLockedAt);
  }
  if (needsWager && record.phase !== 'wagering' && record.wager === undefined) return null;

  record.clueRevealedAt = optionalString(raw.clueRevealedAt);

  if (record.phase === 'resolved') {
    if (typeof raw.correct !== 'boolean' || typeof raw.delta !== 'number' || !Number.isFinite(raw.delta)) {
      return null;
    }
    record.correct = raw.correct;
    record.delta = raw.delta;
    record.response = optionalString(raw.response) ?? '';
    record.resolvedAt = optionalString(raw.resolvedAt) ?? record.startedAt;
    if (raw.forfeited === true) record.forfeited = true;
  }
  return record;
}

/** Coerces arbitrary parsed JSON into a valid current-version state, or `null`. */
export function migrateAndSanitize(raw: unknown): PersistedState | null {
  if (!isObject(raw)) return null;
  let data: Record<string, unknown> = raw;
  let version = typeof data.version === 'number' ? data.version : 0;
  if (version > CURRENT_VERSION) return null;
  while (version < CURRENT_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return null;
    data = migrate(data);
    version++;
  }

  if (typeof data.playerId !== 'string' || !data.playerId) return null;
  if (!isDateKey(data.firstSeenDate)) return null;

  const records: Record<DateKey, DayRecord> = {};
  if (isObject(data.records)) {
    for (const [date, value] of Object.entries(data.records)) {
      const record = sanitizeRecord(date, value);
      if (record) records[date] = record;
    }
  }

  const settings = isObject(data.settings) ? data.settings : {};
  return {
    version: CURRENT_VERSION,
    playerId: data.playerId,
    firstSeenDate: data.firstSeenDate,
    records,
    settings: {
      timeZone: typeof settings.timeZone === 'string' ? settings.timeZone : 'auto',
      theme: isThemePreference(settings.theme) ? settings.theme : 'auto',
    },
  };
}

export type LoadResult =
  | { status: 'ok'; state: PersistedState }
  | { status: 'empty' }
  | { status: 'recovered'; backupKey: string | null };

/** Reads saved state. Unreadable data is backed up under a separate key rather than silently lost. */
export function loadState(storage: StorageLike | null): LoadResult {
  if (!storage) return { status: 'empty' };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'empty' };
  }
  if (raw === null) return { status: 'empty' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const state = parsed === undefined ? null : migrateAndSanitize(parsed);
  if (state) return { status: 'ok', state };

  const backupKey = `${STORAGE_KEY}:backup:${Date.now()}`;
  try {
    storage.setItem(backupKey, raw);
    return { status: 'recovered', backupKey };
  } catch {
    return { status: 'recovered', backupKey: null };
  }
}

export function saveState(storage: StorageLike | null, state: PersistedState): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(storage: StorageLike | null): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

export function getBrowserStorage(): StorageLike | null {
  try {
    const storage = globalThis.localStorage;
    const probe = '__danos_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
