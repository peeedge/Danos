import { formatShortDate, WEEKDAY_SHORT, getWeekday } from '../lib/dateUtils';
import { formatMoney } from '../lib/scoringUtils';
import { computeStats, getRecentWeeks } from '../lib/statsUtils';
import type { DateKey, PersistedState } from '../types';
import { Money } from './common';

interface StatsDashboardProps {
  state: PersistedState;
  today: DateKey;
}

const WEEKS_SHOWN = 8;

export function StatsDashboard({ state, today }: StatsDashboardProps) {
  const stats = computeStats(state, today);
  const weeks = getRecentWeeks(state.records, today, WEEKS_SHOWN);
  const maxAbs = Math.max(1, ...weeks.map((w) => Math.abs(w.net)));
  const hasNegative = weeks.some((w) => w.net < 0);

  return (
    <div className="stats">
      <ul className="stats__headline">
        <li><span className="stats__num">{stats.played}</span><span className="stats__label">Played</span></li>
        <li><span className="stats__num">{stats.accuracy}<small>%</small></span><span className="stats__label">Accuracy</span></li>
        <li><span className="stats__num">{stats.currentStreak}</span><span className="stats__label">Current streak</span></li>
        <li><span className="stats__num">{stats.longestStreak}</span><span className="stats__label">Longest streak</span></li>
      </ul>

      <div className="stats__money">
        <div className="money-card">
          <span className="eyebrow">This week</span>
          <Money amount={stats.weeklyWinnings} className="money-card__value" />
          <span className="money-card__sub">{stats.weekPlayed} of {stats.weekElapsed} tiles played this week</span>
        </div>
        <div className="money-card money-card--gold">
          <span className="eyebrow">Lifetime winnings</span>
          <Money amount={stats.lifetimeWinnings} className="money-card__value" />
          <span className="money-card__sub">{stats.correct} correct · {stats.incorrect} incorrect</span>
        </div>
      </div>

      <section className="stats__section" aria-labelledby="weekly-chart-title">
        <h3 id="weekly-chart-title" className="stats__section-title">Weekly results</h3>
        <div className={`chart ${hasNegative ? 'chart--signed' : ''}`} role="list">
          {weeks.map((week, i) => {
            const height = (Math.abs(week.net) / maxAbs) * 100;
            const current = i === weeks.length - 1;
            return (
              <div
                key={week.weekStart}
                className={`chart__col ${current ? 'chart__col--current' : ''}`}
                role="listitem"
                aria-label={`Week of ${formatShortDate(week.weekStart)}: ${formatMoney(week.net, { signed: true })}, ${week.played} played`}
              >
                <div className="chart__plot">
                  <div className="chart__half chart__half--pos">
                    {week.net > 0 && <div className="chart__bar chart__bar--pos" style={{ height: `${height}%` }} />}
                  </div>
                  {hasNegative && (
                    <div className="chart__half chart__half--neg">
                      {week.net < 0 && <div className="chart__bar chart__bar--neg" style={{ height: `${height}%` }} />}
                    </div>
                  )}
                </div>
                <span className="chart__value">{week.played ? formatMoney(week.net) : '—'}</span>
                <span className="chart__label">{current ? 'Now' : formatShortDate(week.weekStart)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="stats__section" aria-labelledby="special-title">
        <h3 id="special-title" className="stats__section-title">Special rounds</h3>
        <dl className="stats__grid">
          <div><dt>Daily Doubles found</dt><dd>{stats.dailyDoublesFound}</dd></div>
          <div><dt>Daily Double success</dt><dd>{stats.dailyDoublesFound ? `${stats.dailyDoubleSuccessRate}%` : '—'}</dd></div>
          <div><dt>Final Jeopardy played</dt><dd>{stats.finalsPlayed} of {stats.finalsEligible}</dd></div>
          <div><dt>Final Jeopardy wins</dt><dd>{stats.finalsPlayed ? `${stats.finalWinRate}%` : '—'}</dd></div>
          <div><dt>Completion rate</dt><dd>{stats.completionRate}%</dd></div>
          <div><dt>Days since you started</dt><dd>{stats.daysEligible}</dd></div>
        </dl>
      </section>

      <section className="stats__section" aria-labelledby="recent-title">
        <h3 id="recent-title" className="stats__section-title">Recent results</h3>
        {stats.recent.length === 0 ? (
          <p className="stats__empty">No results yet. Today’s clue is a great place to start.</p>
        ) : (
          <ol className="recent">
            {stats.recent.map((r) => (
              <li key={r.date} className={`recent__item recent__item--${r.correct ? 'correct' : 'incorrect'}`}>
                <span className="recent__mark" aria-hidden="true">{r.correct ? '✓' : '✗'}</span>
                <span className="recent__day">{WEEKDAY_SHORT[getWeekday(r.date)]} {formatShortDate(r.date)}</span>
                <span className="recent__cat">
                  {r.category}
                  {r.isDailyDouble && <span className="tag tag--gold">DD</span>}
                  {r.gameType === 'final' && <span className="tag tag--gold">Final</span>}
                </span>
                <span className="visually-hidden">{r.correct ? 'Correct' : 'Incorrect'}</span>
                <Money amount={r.delta} signed className="recent__delta" />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
