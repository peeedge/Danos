import { describe, expect, it } from 'vitest';
import { isCorrectResponse, levenshtein, matchesAnswer, normalizeAnswer } from './answerUtils';

describe('normalizeAnswer', () => {
  it('ignores case, whitespace and punctuation', () => {
    expect(normalizeAnswer('  Albert   EINSTEIN!! ')).toBe('albert einstein');
    expect(normalizeAnswer('Moby-Dick')).toBe('moby dick');
  });

  it('strips an optional leading question phrase', () => {
    expect(normalizeAnswer('Who is Albert Einstein?')).toBe('albert einstein');
    expect(normalizeAnswer("What's Paris?")).toBe('paris');
    expect(normalizeAnswer('who are the Beatles')).toBe('beatles');
    expect(normalizeAnswer('Where is Tanzania')).toBe('tanzania');
    expect(normalizeAnswer('What was the Peace of Westphalia?')).toBe('peace of westphalia');
  });

  it('strips leading articles and diacritics', () => {
    expect(normalizeAnswer('The Amazon')).toBe('amazon');
    expect(normalizeAnswer('Erwin Schrödinger')).toBe('erwin schrodinger');
    expect(normalizeAnswer('Brasília')).toBe('brasilia');
  });

  it('treats ampersands as "and"', () => {
    expect(normalizeAnswer('Salt & Pepper')).toBe('salt and pepper');
  });
});

describe('matchesAnswer', () => {
  it('treats question and bare forms as equivalent', () => {
    expect(matchesAnswer('Who is Albert Einstein?', 'Albert Einstein')).toBe(true);
    expect(matchesAnswer('Albert Einstein', 'Albert Einstein')).toBe(true);
  });

  it('ignores spacing differences like initials', () => {
    expect(matchesAnswer('Who is TS Eliot', 'T. S. Eliot')).toBe(true);
    expect(matchesAnswer('mobydick', 'Moby-Dick')).toBe(true);
  });

  it('forgives a small typo on longer answers only', () => {
    expect(matchesAnswer('Vermer', 'Vermeer')).toBe(true);
    expect(matchesAnswer('Constantinopel', 'Constantinople')).toBe(true);
    expect(matchesAnswer('Bed', 'Red')).toBe(false);
    expect(matchesAnswer('Austria', 'Australia')).toBe(false);
  });

  it('never fuzzes numbers', () => {
    expect(matchesAnswer('4', '3')).toBe(false);
    expect(matchesAnswer('1969', '1968')).toBe(false);
  });

  it('rejects empty responses', () => {
    expect(matchesAnswer('', 'Paris')).toBe(false);
    expect(matchesAnswer('What is?', 'Paris')).toBe(false);
  });
});

describe('isCorrectResponse', () => {
  const clue = { correctAnswer: 'Ada Lovelace', acceptedAnswers: ['Lovelace', 'Augusta Ada King'] };

  it('accepts configured alternatives', () => {
    expect(isCorrectResponse('Who is Lovelace?', clue)).toBe(true);
    expect(isCorrectResponse('augusta ada king', clue)).toBe(true);
  });

  it('rejects wrong answers', () => {
    expect(isCorrectResponse('Who is Charles Babbage?', clue)).toBe(false);
  });
});

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
  });
});
