import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useWeekContent } from '../hooks/useDailyChallenge';
import { addDays, dayOfMonth, formatLongDate, formatWeekRange, startOfWeek, WEEKDAY_SHORT } from '../lib/dateUtils';
import { formatMoney } from '../lib/scoringUtils';
import { getDayStatus, getWeeklyTotal } from '../lib/statsUtils';
import type { DateKey, PersistedState } from '../types';
import { Money, STATUS_LABEL, StatusIcon } from './common';

interface WeeklyCalendarProps {
  state: PersistedState;
  today: DateKey;
  weekStart: DateKey;
  earliestWeek: DateKey;
  onWeekChange: (weekStart: DateKey) => void;
  onSelectDay: (date: DateKey) => void;
}

export function WeeklyCalendar({ state, today, weekStart, earliestWeek, onWeekChange, onSelectDay }: WeeklyCalendarProps) {
  const week = useWeekContent(weekStart, today);
  const currentWeek = startOfWeek(today);
  const isCurrent = weekStart === currentWeek;
  const total = getWeeklyTotal(state.records, weekStart);

  return (
    <section className="calendar-card" aria-labelledby="calendar-heading">
      <div className="calendar-card__head">
        <div>
          <h2 id="calendar-heading" className="section-title">
            {isCurrent ? 'This week' : 'Past week'}
          </h2>
          <p className="calendar-card__range">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="calendar-card__total">
          <span className="eyebrow">Week total</span>
          <Money amount={total} className="calendar-card__money" />
        </div>
        <div className="calendar-card__nav">
          <button
            type="button"
            className="icon-btn icon-btn--light"
            onClick={() => onWeekChange(addDays(weekStart, -7))}
            disabled={weekStart <= earliestWeek}
            aria-label="Previous week"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--light"
            onClick={() => onWeekChange(addDays(weekStart, 7))}
            disabled={isCurrent}
            aria-label="Next week"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      <ol className="calendar" aria-busy={week.loading}>
        {(week.data?.days ?? []).map((day) => {
          const record = state.records[day.date];
          const status = getDayStatus(day.date, today, record);
          const isToday = day.date === today;
          const valueLabel = day.gameType === 'final' ? 'Final' : formatMoney(day.baseValue);
          const dd = record?.isDailyDouble && record.phase === 'resolved';
          const resultText =
            record?.phase === 'resolved' && typeof record.delta === 'number' ? `, ${formatMoney(record.delta, { signed: true })}` : '';
          return (
            <li key={day.date}>
              <button
                type="button"
                className={`cal-tile cal-tile--${status} ${isToday ? 'cal-tile--today' : ''} ${day.gameType === 'final' ? 'cal-tile--final' : ''}`}
                disabled={status === 'locked'}
                onClick={() => onSelectDay(day.date)}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${formatLongDate(day.date)}, ${day.gameType === 'final' ? 'Final Jeopardy' : valueLabel}: ${STATUS_LABEL[status]}${resultText}${dd ? ', Daily Double' : ''}`}
              >
                <span className="cal-tile__dow">{WEEKDAY_SHORT[day.weekday]}</span>
                <span className="cal-tile__date">{dayOfMonth(day.date)}</span>
                <span className="cal-tile__value">{valueLabel}</span>
                <span className="cal-tile__status">
                  <StatusIcon status={status} size={14} />
                </span>
                {dd && <span className="cal-tile__dd" aria-hidden="true">DD</span>}
              </button>
            </li>
          );
        })}
        {week.loading && Array.from({ length: 7 }, (_, i) => <li key={i} className="cal-tile cal-tile--skeleton" />)}
      </ol>

      <ul className="legend" aria-label="Calendar legend">
        <li><span className="legend__swatch legend__swatch--correct"><StatusIcon status="correct" size={10} /></span>Correct</li>
        <li><span className="legend__swatch legend__swatch--incorrect"><StatusIcon status="incorrect" size={10} /></span>Incorrect</li>
        <li><span className="legend__swatch legend__swatch--missed"><StatusIcon status="missed" size={10} /></span>Missed</li>
        <li><span className="legend__swatch legend__swatch--locked"><StatusIcon status="locked" size={10} /></span>Locked</li>
      </ul>
    </section>
  );
}
