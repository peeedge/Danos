import type { Clue } from '../types';

const QUESTION_PREFIX =
  /^(?:what|who|where|when|which|whom)(?:s|re)?\s+(?:(?:is|are|was|were)\s+)?/;
const LEADING_ARTICLE = /^(?:the|a|an)\s+/;

/**
 * Reduces a response to a canonical comparison form:
 * lowercase, accents stripped, punctuation removed, an optional leading
 * "What is" / "Who are" phrase dropped, and a leading article dropped.
 */
export function normalizeAnswer(raw: string): string {
  let text = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’‘`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  text = text.replace(QUESTION_PREFIX, '');
  text = text.replace(LEADING_ARTICLE, '');
  return text.trim();
}

/** Insertions, deletions and substitutions needed to turn `a` into `b`. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + cost);
    }
    previous = current;
  }
  return previous[b.length]!;
}

/** Spelling slack allowed for a target answer. Short answers and numbers must be exact. */
export function typoTolerance(target: string): number {
  const compact = target.replace(/\s/g, '');
  if (/\d/.test(compact)) return 0;
  if (compact.length >= 10) return 2;
  if (compact.length >= 5) return 1;
  return 0;
}

export function matchesAnswer(response: string, candidate: string): boolean {
  const given = normalizeAnswer(response);
  const target = normalizeAnswer(candidate);
  if (!given || !target) return false;
  if (given === target) return true;

  const givenCompact = given.replace(/\s/g, '');
  const targetCompact = target.replace(/\s/g, '');
  if (givenCompact === targetCompact) return true;

  return levenshtein(givenCompact, targetCompact) <= typoTolerance(target);
}

export function isCorrectResponse(
  response: string,
  clue: Pick<Clue, 'correctAnswer' | 'acceptedAnswers'>,
): boolean {
  return [clue.correctAnswer, ...clue.acceptedAnswers].some((candidate) =>
    matchesAnswer(response, candidate),
  );
}

/** Formats an answer the way a contestant would say it on air. */
export function asQuestion(answer: string, prefix: 'What is' | 'Who is' | 'What are' | 'Who are' = 'What is'): string {
  return `${prefix} ${answer}?`;
}
