import { ArrowRight, Eye, Sparkles } from 'lucide-react';
import { getDayRule } from '../game/rules';
import type { DailyChallenge } from '../hooks/useDailyChallenge';
import { WEEKDAY_NAMES } from '../lib/dateUtils';
import { formatMoney } from '../lib/scoringUtils';
import { Money } from './common';
import { Board } from './JeopardyBoard';

interface DailyChallengeCardProps {
  challenge: DailyChallenge;
  remaining: number;
  isFocusToday: boolean;
  todayResolved: boolean;
  onPlay: () => void;
}

export function DailyChallengeCard({
  challenge,
  remaining,
  isFocusToday,
  todayResolved,
  onPlay,
}: DailyChallengeCardProps) {
  const { day, clue, record, status, loading, error, retry } = challenge;

  if (loading) {
    return <Board className="challenge challenge--loading"><div className="board__shimmer" /><span className="visually-hidden">Loading this week’s clues…</span></Board>;
  }
  if (error || !day || !clue) {
    return (
      <Board className="challenge">
        <p className="challenge__error" role="alert">{error ?? 'This week’s clues are unavailable.'}</p>
        <button type="button" className="btn btn--gold" onClick={retry}>Try again</button>
      </Board>
    );
  }

  const rule = getDayRule(day.weekday);
  const isFinal = day.gameType === 'final';
  const resolved = status === 'correct' || status === 'incorrect';
  const weekday = WEEKDAY_NAMES[day.weekday];
  const moreAfterThis = remaining > 1;

  const cta = resolved
    ? 'See this result'
    : status === 'in-progress'
      ? `Continue ${isFocusToday ? 'today’s' : `${weekday}’s`} clue`
      : isFinal
        ? 'Play Final Jeopardy'
        : isFocusToday
          ? 'Play today’s clue'
          : `Play ${weekday}’s clue`;
  const CtaIcon = resolved ? Eye : isFinal ? Sparkles : ArrowRight;

  const categoryEyebrow = isFinal
    ? 'Final Jeopardy · Category'
    : isFocusToday
      ? 'Today’s category'
      : `${weekday}’s category`;

  const note = resolved
    ? remaining > 0
      ? `${remaining} ${remaining === 1 ? 'tile' : 'tiles'} still open this week.`
      : 'This week’s column is complete.'
    : status === 'in-progress'
      ? 'You’ve opened this clue — finish it before that day ends.'
      : isFinal
        ? 'The weekly finale. Wager on what you know, then face one last clue.'
        : moreAfterThis
          ? `One clue. One response. Play the rest of this week’s column today if you like.`
          : isFocusToday && !todayResolved
            ? 'One clue. One response. No timer.'
            : `Last open tile this week. ${weekday} · ${rule.difficultyLabel}.`;

  return (
    <Board variant={isFinal ? 'final' : 'standard'} className="challenge">
      <div className="challenge__grid">
        <div className="challenge__category">
          <span className="eyebrow eyebrow--light">{categoryEyebrow}</span>
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
        <p className="challenge__note">{note}</p>
        <button type="button" className="btn btn--gold btn--lg" onClick={onPlay}>
          {cta}
          <CtaIcon size={18} aria-hidden="true" />
        </button>
      </div>
    </Board>
  );
}
