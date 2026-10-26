import { ArrowRight, Eye, Sparkles } from 'lucide-react';
import { getDayRule } from '../game/rules';
import type { DailyChallenge } from '../hooks/useDailyChallenge';
import { formatMoney } from '../lib/scoringUtils';
import { Money } from './common';
import { Board } from './JeopardyBoard';

interface DailyChallengeCardProps {
  challenge: DailyChallenge;
  onPlay: () => void;
}

export function DailyChallengeCard({ challenge, onPlay }: DailyChallengeCardProps) {
  const { day, clue, record, status, loading, error, retry } = challenge;

  if (loading) {
    return <Board className="challenge challenge--loading"><div className="board__shimmer" /><span className="visually-hidden">Loading today’s clue…</span></Board>;
  }
  if (error || !day || !clue) {
    return (
      <Board className="challenge">
        <p className="challenge__error" role="alert">{error ?? 'Today’s clue is unavailable.'}</p>
        <button type="button" className="btn btn--gold" onClick={retry}>Try again</button>
      </Board>
    );
  }

  const rule = getDayRule(day.weekday);
  const isFinal = day.gameType === 'final';
  const resolved = status === 'correct' || status === 'incorrect';

  const cta = resolved ? 'See today’s result' : status === 'in-progress' ? 'Continue today’s clue' : isFinal ? 'Play Final Jeopardy' : 'Play today’s clue';
  const CtaIcon = resolved ? Eye : isFinal ? Sparkles : ArrowRight;

  return (
    <Board variant={isFinal ? 'final' : 'standard'} className="challenge">
      <div className="challenge__grid">
        <div className="challenge__category">
          <span className="eyebrow eyebrow--light">{isFinal ? 'Final Jeopardy · Category' : 'Today’s category'}</span>
          <h2 className="challenge__category-name">{clue.category}</h2>
          <span className="challenge__difficulty">{rule.difficultyLabel}</span>
        </div>
        <div className={`challenge__value ${resolved ? `challenge__value--${status}` : ''}`}>
          {resolved && typeof record?.delta === 'number' ? (
            <>
              <span className="eyebrow eyebrow--light">{status === 'correct' ? 'You earned' : 'You lost'}</span>
              <Money amount={record.delta} signed className="challenge__amount" />
            </>
          ) : (
            <>
              <span className="eyebrow eyebrow--light">{isFinal ? 'Stakes' : 'Clue value'}</span>
              <span className="challenge__amount">{isFinal ? 'Your wager' : formatMoney(day.baseValue)}</span>
            </>
          )}
        </div>
      </div>
      <div className="challenge__footer">
        <p className="challenge__note">
          {resolved
            ? 'Today’s clue is locked in. Come back tomorrow for a new one.'
            : status === 'in-progress'
              ? 'You’ve opened today’s clue — finish it before midnight.'
              : isFinal
                ? 'The weekly finale. Wager on what you know, then face one last clue.'
                : 'One clue. One response. No timer.'}
        </p>
        <button type="button" className="btn btn--gold btn--lg" onClick={onPlay}>
          {cta}
          <CtaIcon size={18} aria-hidden="true" />
        </button>
      </div>
    </Board>
  );
}
