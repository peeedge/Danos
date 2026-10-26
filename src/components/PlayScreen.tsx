import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getDayRule } from '../game/rules';
import { useDailyChallenge } from '../hooks/useDailyChallenge';
import type { GameApi } from '../hooks/useGameState';
import { startOfWeek, WEEKDAY_NAMES } from '../lib/dateUtils';
import { formatMoney } from '../lib/scoringUtils';
import { getCurrentStreak, getLifetimeTotal, getWeeklyTotal } from '../lib/statsUtils';
import { ClueScreen } from './ClueScreen';
import { ErrorState, LoadingBoard } from './common';
import { DailyDoubleReveal } from './DailyDoubleReveal';
import { FinalJeopardyScreen } from './FinalJeopardyScreen';
import { Board, BoardHeader, JeopardyBoard } from './JeopardyBoard';
import { ResultScreen } from './ResultScreen';
import { WagerForm } from './WagerForm';
import { WeeklyHistory } from './WeeklyHistory';

interface PlayScreenProps {
  game: GameApi;
  onExit: () => void;
  onStats: () => void;
}

/** Drives today's clue through select → (wager) → answer → result, based on the persisted record. */
export function PlayScreen({ game, onExit, onStats }: PlayScreenProps) {
  const { state, today, timeZone } = game;
  const challenge = useDailyChallenge(state, today, today);
  const [error, setError] = useState<string | null>(null);
  const [ddRevealSeen, setDdRevealSeen] = useState(false);
  const [resolvedThisVisit, setResolvedThisVisit] = useState(false);

  const run = (action: () => void) => {
    try {
      action();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  const { day, clue, record, balanceBefore, wagerLimits } = challenge;
  let content;

  if (challenge.loading) {
    content = <LoadingBoard />;
  } else if (challenge.error || !day || !clue) {
    content = <ErrorState message={challenge.error ?? 'Today’s clue is unavailable.'} onRetry={challenge.retry} />;
  } else if (!record) {
    const rule = getDayRule(day.weekday);
    content =
      day.gameType === 'final' ? (
        <FinalJeopardyScreen step="intro" balance={balanceBefore} onBegin={() => run(() => game.start(day))} error={error} />
      ) : (
        <div className="stage stage--enter">
          <JeopardyBoard
            category={clue.category}
            weekdayLabel={WEEKDAY_NAMES[day.weekday]}
            valueLabel={formatMoney(day.baseValue)}
            difficultyLabel={rule.difficultyLabel}
            onSelect={() => run(() => game.start(day))}
          />
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      );
  } else if (record.phase === 'wagering' && wagerLimits) {
    if (record.gameType === 'final') {
      content = (
        <FinalJeopardyScreen
          step="wager"
          clue={clue}
          balance={balanceBefore}
          limits={wagerLimits}
          onLock={(wager) => run(() => game.lockWager(today, wager))}
          error={error}
        />
      );
    } else if (!ddRevealSeen) {
      content = <DailyDoubleReveal category={clue.category} onContinue={() => setDdRevealSeen(true)} />;
    } else {
      content = (
        <div className="stage stage--enter">
          <Board variant="daily-double" className="dd-wager-board">
            <BoardHeader
              category={clue.category}
              meta={`${WEEKDAY_NAMES[day.weekday]} · Daily Double`}
              value={
                <>
                  <span className="board__value-label">Clue value</span>
                  <span className="board__value">{formatMoney(record.baseValue)}</span>
                </>
              }
            />
            <WagerForm
              tone="daily-double"
              balance={balanceBefore}
              limits={wagerLimits}
              onLock={(wager) => run(() => game.lockWager(today, wager))}
              error={error}
              limitNote={`Wager up to ${formatMoney(wagerLimits.max)} — the greater of your weekly balance or today’s clue value.`}
            />
          </Board>
        </div>
      );
    }
  } else if (record.phase === 'answering') {
    const submit = (response: string) =>
      run(() => {
        game.submit(today, response, clue);
        setResolvedThisVisit(true);
      });
    content =
      record.gameType === 'final' ? (
        <FinalJeopardyScreen step="clue" clue={clue} record={record} onSubmit={submit} error={error} />
      ) : (
        <ClueScreen clue={clue} record={record} weekday={day.weekday} onSubmit={submit} error={error} />
      );
  } else {
    content = (
      <ResultScreen
        record={record}
        clue={clue}
        weeklyTotal={getWeeklyTotal(state.records, startOfWeek(today))}
        lifetimeTotal={getLifetimeTotal(state.records)}
        streak={getCurrentStreak(state.records, today)}
        fresh={resolvedThisVisit}
        isToday
        timeZone={timeZone}
        today={today}
        records={state.records}
        onBack={onExit}
        onStats={onStats}
      >
        {record.gameType === 'final' && (
          <WeeklyHistory state={state} today={today} weekStart={startOfWeek(today)} tone="dark" title="Your week in review" />
        )}
      </ResultScreen>
    );
  }

  const isFinal = day?.gameType === 'final';
  return (
    <div className={`play ${isFinal ? 'play--final' : ''} ${record?.isDailyDouble ? 'play--dd' : ''}`}>
      <div className="play__bar">
        <button type="button" className="btn btn--text-light" onClick={onExit}>
          <ArrowLeft size={18} aria-hidden="true" />
          Calendar
        </button>
        <span className="play__label">{isFinal ? 'Final Jeopardy' : day ? `${WEEKDAY_NAMES[day.weekday]}’s clue` : ''}</span>
      </div>
      {content}
    </div>
  );
}
