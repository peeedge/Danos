import type { Difficulty, GameType, Weekday } from '../types';

export interface DayRule {
  weekday: Weekday;
  baseValue: number;
  difficulty: Difficulty;
  difficultyLabel: string;
  gameType: GameType;
}

/** The weekly stakes schedule. Sunday's value is wager-based, so it carries no base value. */
export const DAY_RULES: readonly DayRule[] = [
  { weekday: 0, baseValue: 200, difficulty: 'easy', difficultyLabel: 'Easy', gameType: 'standard' },
  { weekday: 1, baseValue: 400, difficulty: 'easy-medium', difficultyLabel: 'Easy–Medium', gameType: 'standard' },
  { weekday: 2, baseValue: 600, difficulty: 'medium', difficultyLabel: 'Medium', gameType: 'standard' },
  { weekday: 3, baseValue: 800, difficulty: 'medium-hard', difficultyLabel: 'Medium–Hard', gameType: 'standard' },
  { weekday: 4, baseValue: 1000, difficulty: 'hard', difficultyLabel: 'Hard', gameType: 'standard' },
  { weekday: 5, baseValue: 1200, difficulty: 'very-hard', difficultyLabel: 'Very Hard', gameType: 'standard' },
  { weekday: 6, baseValue: 0, difficulty: 'final', difficultyLabel: 'Final Jeopardy', gameType: 'final' },
];

export const DAILY_DOUBLE_PROBABILITY = 0.1;

/** Final Jeopardy wager ceiling when the player's weekly balance is zero or negative. */
export const FINAL_FALLBACK_MAX_WAGER = 1000;

/** How many weeks before the current one players may browse for review. */
export const ARCHIVE_WEEKS = 8;

export function getDayRule(weekday: Weekday): DayRule {
  return DAY_RULES[weekday]!;
}
