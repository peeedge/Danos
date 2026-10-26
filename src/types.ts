/** Calendar date in the player's configured timezone, formatted `YYYY-MM-DD`. */
export type DateKey = string;

/** 0 = Monday … 6 = Sunday. Danos weeks always run Monday through Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Difficulty =
  | 'easy'
  | 'easy-medium'
  | 'medium'
  | 'medium-hard'
  | 'hard'
  | 'very-hard'
  | 'final';

export type GameType = 'standard' | 'final';

export type Subject =
  | 'History'
  | 'Science'
  | 'Geography'
  | 'Literature'
  | 'Art & Culture'
  | 'Sports'
  | 'Food'
  | 'Technology'
  | 'Nature'
  | 'Pop Culture';

/** A single piece of trivia content, independent of when or by whom it is played. */
export interface Clue {
  id: string;
  category: string;
  subject: Subject;
  clue: string;
  correctAnswer: string;
  acceptedAnswers: string[];
  difficulty: Difficulty;
  explanation: string;
  source?: string;
}

/** What the content provider knows about a calendar day. `clue` is omitted for future dates. */
export interface DayContent {
  date: DateKey;
  weekday: Weekday;
  baseValue: number;
  difficulty: Difficulty;
  gameType: GameType;
  clue?: Clue;
}

export interface WeekContent {
  weekStart: DateKey;
  days: DayContent[];
}

/** A clue as scheduled for a specific player on a specific date. */
export interface ScheduledClue extends Clue {
  date: DateKey;
  baseValue: number;
  gameType: GameType;
  isDailyDouble: boolean;
}

export type RecordPhase = 'wagering' | 'answering' | 'resolved';

/**
 * The authoritative record of a player's interaction with one day's clue.
 * Created when the player opens the clue; immutable once `phase` is `resolved`.
 */
export interface DayRecord {
  date: DateKey;
  clueId: string;
  category: string;
  gameType: GameType;
  baseValue: number;
  isDailyDouble: boolean;
  phase: RecordPhase;
  startedAt: string;
  wager?: number;
  wagerLockedAt?: string;
  clueRevealedAt?: string;
  response?: string;
  correct?: boolean;
  /** Net change to winnings. Only set when resolved. */
  delta?: number;
  /** True when the clue was revealed but never answered before the day ended. */
  forfeited?: boolean;
  resolvedAt?: string;
}

export type ResolvedRecord = DayRecord & {
  phase: 'resolved';
  correct: boolean;
  delta: number;
  resolvedAt: string;
};

export type ThemePreference = 'auto' | 'light' | 'dark';

export interface Settings {
  /** IANA timezone name, or `auto` to follow the browser. */
  timeZone: string;
  /** Color theme. `auto` follows the OS preference. */
  theme: ThemePreference;
}

export interface PersistedState {
  version: number;
  /** Random per-browser seed used for deterministic Daily Double placement. */
  playerId: string;
  firstSeenDate: DateKey;
  records: Record<DateKey, DayRecord>;
  settings: Settings;
}

export type DayStatus =
  | 'locked'
  | 'available'
  | 'in-progress'
  | 'correct'
  | 'incorrect'
  | 'missed';

export interface WagerLimits {
  min: number;
  max: number;
}
