import { useMemo, type ReactNode } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, XCircle } from 'lucide-react';
import { useCountdown } from '../hooks/useToday';
import { formatDuration, formatLongDate } from '../lib/dateUtils';
import { formatMoney } from '../lib/scoringUtils';
import { buildShareText } from '../lib/shareUtils';
import type { Clue, DateKey, DayRecord } from '../types';
import { Celebration } from './Celebration';
import { Money } from './common';
import { Board } from './JeopardyBoard';
import { ShareButton } from './ShareButton';

interface ResultScreenProps {
  record: DayRecord;
  clue: Clue | undefined;
  weeklyTotal: number;
  lifetimeTotal: number;
  streak: number;
  fresh: boolean;
  isToday: boolean;
  timeZone: string;
  today: DateKey;
  records: Record<DateKey, DayRecord>;
  onBack: () => void;
  onStats: () => void;
  children?: ReactNode;
}

export function ResultScreen({
  record,
  clue,
  weeklyTotal,
  lifetimeTotal,
  streak,
  fresh,
  isToday,
  timeZone,
  today,
  records,
  onBack,
  onStats,
  children,
}: ResultScreenProps) {
  const correct = record.correct === true;
  const delta = record.delta ?? 0;
  const countdown = useCountdown(timeZone);
  const shareText = useMemo(
    () => buildShareText({ date: record.date, today, record, records, streak }),
    [record, records, streak, today],
  );
  const isFinal = record.gameType === 'final';
  const stakeLabel = isFinal ? 'Final Jeopardy wager' : record.isDailyDouble ? 'Daily Double wager' : 'Clue value';
  const stake = isFinal || record.isDailyDouble ? record.wager ?? 0 : record.baseValue;

  const headline = correct
    ? isFinal
      ? 'A triumphant finale!'
      : record.isDailyDouble
        ? 'Daily Double, nailed it!'
        : 'Correct!'
    : record.forfeited
      ? 'Time ran out'
      : 'Not quite';

  return (
    <div className={`result stage ${fresh ? 'stage--enter' : ''}`}>
      <Board variant={isFinal ? 'final' : record.isDailyDouble ? 'daily-double' : 'standard'} className={`result__board result__board--${correct ? 'correct' : 'incorrect'}`}>
        {fresh && correct && <Celebration />}
        <div className="result__badge" aria-hidden="true">
          {correct ? <CheckCircle2 size={44} /> : <XCircle size={44} />}
        </div>
        <p className="result__date">{formatLongDate(record.date)}</p>
        <h2 className="result__headline" aria-live={fresh ? 'polite' : undefined}>
          {headline}
        </h2>
        <Money amount={delta} signed className="result__delta" />
        <p className="result__stake">
          {stakeLabel}: {formatMoney(stake)}
        </p>

        <dl className="result__qa">
          <div>
            <dt>Category</dt>
            <dd>{clue?.category ?? record.category}</dd>
          </div>
          {clue && (
            <div>
              <dt>Clue</dt>
              <dd className="result__clue">{clue.clue}</dd>
            </div>
          )}
          <div>
            <dt>Your response</dt>
            <dd className={correct ? 'result__response result__response--correct' : 'result__response result__response--incorrect'}>
              {record.response ? record.response : <em>No response submitted</em>}
            </dd>
          </div>
          {clue && (
            <div>
              <dt>Correct response</dt>
              <dd className="result__answer">{clue.correctAnswer}</dd>
            </div>
          )}
        </dl>
        {clue && <p className="result__explanation">{clue.explanation}</p>}
        {!correct && !record.forfeited && (
          <p className="result__why">
            Your response didn’t match the accepted answers, so {formatMoney(stake)} was deducted.
          </p>
        )}
        {record.forfeited && (
          <p className="result__why">The clue was revealed but not answered before midnight, so it counted as incorrect.</p>
        )}
      </Board>

      {children}

      <div className="result__totals">
        <div className="total-card">
          <span className="eyebrow">Weekly winnings</span>
          <Money amount={weeklyTotal} className="total-card__value" />
        </div>
        <div className="total-card">
          <span className="eyebrow">Lifetime</span>
          <Money amount={lifetimeTotal} className="total-card__value" />
        </div>
        <div className="total-card">
          <span className="eyebrow">Streak</span>
          <span className="total-card__value">{streak}</span>
        </div>
      </div>

      {isToday && (
        <p className="result__return">
          {isFinal ? 'A brand-new week begins tomorrow.' : 'Come back tomorrow — the stakes go up.'}{' '}
          <span className="result__countdown">Next clue in {formatDuration(countdown)}</span>
        </p>
      )}

      <div className="result__actions">
        <ShareButton text={shareText} />
        <button type="button" className="btn btn--outline-light" onClick={onStats}>
          <BarChart3 size={18} aria-hidden="true" />
          View statistics
        </button>
        <button type="button" className="btn btn--outline-light" onClick={onBack}>
          <CalendarDays size={18} aria-hidden="true" />
          Back to calendar
        </button>
      </div>
    </div>
  );
}
