import { useMemo } from 'react';
import { Flame, Trophy, Wallet } from 'lucide-react';
import { useDailyChallenge } from '../hooks/useDailyChallenge';
import type { GameApi } from '../hooks/useGameState';
import { formatLongDate, startOfWeek } from '../lib/dateUtils';
import { buildShareText } from '../lib/shareUtils';
import { isResolved, type PlayerStats } from '../lib/statsUtils';
import type { DateKey } from '../types';
import { Money } from './common';
import { DailyChallengeCard } from './DailyChallengeCard';
import { ShareButton } from './ShareButton';
import { WeeklyCalendar } from './WeeklyCalendar';
import { WeeklyHistory } from './WeeklyHistory';

interface HomeScreenProps {
  game: GameApi;
  stats: PlayerStats;
  weekStart: DateKey;
  earliestWeek: DateKey;
  onWeekChange: (weekStart: DateKey) => void;
  onPlay: () => void;
  onSelectDay: (date: DateKey) => void;
}

export function HomeScreen({ game, stats, weekStart, earliestWeek, onWeekChange, onPlay, onSelectDay }: HomeScreenProps) {
  const { state, today } = game;
  const challenge = useDailyChallenge(state, today, today);
  const resolved = challenge.status === 'correct' || challenge.status === 'incorrect';
  const isSunday = challenge.day?.gameType === 'final';

  const shareText = useMemo(() => {
    const record = challenge.record;
    if (!isResolved(record)) return null;
    return buildShareText({
      date: today,
      today,
      record,
      records: state.records,
      streak: stats.currentStreak,
    });
  }, [challenge.record, state.records, stats.currentStreak, today]);

  const heading = resolved
    ? challenge.status === 'correct'
      ? 'Nicely done. See you tomorrow.'
      : 'Tomorrow’s another clue.'
    : isSunday
      ? 'Final Jeopardy awaits.'
      : stats.played === 0
        ? 'Your first clue awaits.'
        : 'Your daily clue awaits.';

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-heading">
        <p className="hero__date">{formatLongDate(today)}</p>
        <h1 id="hero-heading" className="hero__heading">{heading}</h1>
      </section>

      <ul className="summary" aria-label="Your progress">
        <li className="summary__item">
          <Wallet size={20} aria-hidden="true" className="summary__icon" />
          <span className="summary__label">This week</span>
          <Money amount={stats.weeklyWinnings} className="summary__value" />
        </li>
        <li className="summary__item">
          <Flame size={20} aria-hidden="true" className="summary__icon" />
          <span className="summary__label">Streak</span>
          <span className="summary__value">
            {stats.currentStreak} <small>{stats.currentStreak === 1 ? 'day' : 'days'}</small>
          </span>
        </li>
        <li className="summary__item">
          <Trophy size={20} aria-hidden="true" className="summary__icon" />
          <span className="summary__label">Lifetime</span>
          <Money amount={stats.lifetimeWinnings} className="summary__value" />
        </li>
      </ul>

      <DailyChallengeCard challenge={challenge} onPlay={onPlay} />
      {shareText && (
        <div className="home__share">
          <ShareButton text={shareText} variant="ghost" label="Share today’s result" />
        </div>
      )}

      <WeeklyCalendar
        state={state}
        today={today}
        weekStart={weekStart}
        earliestWeek={earliestWeek}
        onWeekChange={onWeekChange}
        onSelectDay={onSelectDay}
      />

      <WeeklyHistory
        state={state}
        today={today}
        weekStart={weekStart}
        onSelectDay={onSelectDay}
        title={weekStart === startOfWeek(today) ? 'This week’s ledger' : 'Week ledger'}
      />
    </div>
  );
}
