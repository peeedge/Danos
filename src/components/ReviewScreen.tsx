import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useDailyChallenge } from '../hooks/useDailyChallenge';
import type { GameApi } from '../hooks/useGameState';
import { formatLongDate, startOfWeek, WEEKDAY_NAMES } from '../lib/dateUtils';
import { formatMoney } from '../lib/scoringUtils';
import { getCurrentStreak, getLifetimeTotal, getWeeklyTotal, isResolved } from '../lib/statsUtils';
import type { DateKey } from '../types';
import { ErrorState, LoadingBoard } from './common';
import { Board, BoardHeader } from './JeopardyBoard';
import { ResultScreen } from './ResultScreen';
import { WeeklyHistory } from './WeeklyHistory';

interface ReviewScreenProps {
  game: GameApi;
  date: DateKey;
  onExit: () => void;
  onStats: () => void;
}

/** Read-only view of a past day. Nothing here can change a score. */
export function ReviewScreen({ game, date, onExit, onStats }: ReviewScreenProps) {
  const { state, today, timeZone } = game;
  const challenge = useDailyChallenge(state, date, today);
  const { day, clue, record } = challenge;
  const weekStart = startOfWeek(date);

  let content;
  if (challenge.loading) {
    content = <LoadingBoard />;
  } else if (challenge.error || !day) {
    content = <ErrorState message={challenge.error ?? 'This day couldn’t be loaded.'} onRetry={challenge.retry} />;
  } else if (date > today) {
    content = <ErrorState message="Future clues stay locked until their day arrives." />;
  } else if (isResolved(record)) {
    content = (
      <ResultScreen
        record={record}
        clue={clue}
        weeklyTotal={getWeeklyTotal(state.records, weekStart)}
        lifetimeTotal={getLifetimeTotal(state.records)}
        streak={getCurrentStreak(state.records, today)}
        fresh={false}
        isToday={date === today}
        timeZone={timeZone}
        today={today}
        records={state.records}
        onBack={onExit}
        onStats={onStats}
      >
        {record.gameType === 'final' && (
          <WeeklyHistory state={state} today={today} weekStart={weekStart} tone="dark" title="That week in review" />
        )}
      </ResultScreen>
    );
  } else if (date === today) {
    content = <ErrorState message="Today’s clue is still open — play it from the calendar." />;
  } else if (clue) {
    const beforeStart = date < state.firstSeenDate;
    content = (
      <div className="stage stage--enter">
        <Board variant={day.gameType === 'final' ? 'final' : 'standard'} className="review-board">
          <BoardHeader
            category={clue.category}
            meta={day.gameType === 'final' ? 'Final Jeopardy' : WEEKDAY_NAMES[day.weekday]}
            value={
              <>
                <span className="board__value-label">{day.gameType === 'final' ? 'Stakes' : 'Value'}</span>
                <span className="board__value">{day.gameType === 'final' ? 'Wager' : formatMoney(day.baseValue)}</span>
              </>
            }
          />
          <div className="clue-panel">
            <p className="clue-text">{clue.clue}</p>
          </div>
          <div className="review__answer">
            <span className="eyebrow eyebrow--light">Correct response</span>
            <p className="result__answer">{clue.correctAnswer}</p>
            <p className="result__explanation">{clue.explanation}</p>
          </div>
        </Board>
        <p className="review__note">
          <strong>{formatLongDate(date)}</strong> —{' '}
          {beforeStart
            ? 'this was before you started playing Danos. It’s here for practice and doesn’t affect your score.'
            : 'you missed this day. Missed clues are worth $0 and can’t be played after their day ends.'}
        </p>
        <div className="result__actions">
          <button type="button" className="btn btn--outline-light" onClick={onExit}>
            <CalendarDays size={18} aria-hidden="true" />
            Back to calendar
          </button>
        </div>
      </div>
    );
  } else {
    content = <ErrorState message="This clue isn’t available for review." />;
  }

  return (
    <div className="play play--review">
      <div className="play__bar">
        <button type="button" className="btn btn--text-light" onClick={onExit}>
          <ArrowLeft size={18} aria-hidden="true" />
          Calendar
        </button>
        <span className="play__label">Review · {day ? WEEKDAY_NAMES[day.weekday] : ''}</span>
      </div>
      {content}
      {!isResolved(record) && day && date <= today && (
        <WeeklyHistory state={state} today={today} weekStart={weekStart} tone="dark" title="That week" />
      )}
    </div>
  );
}
