import { useWeekContent } from '../hooks/useDailyChallenge';
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from '../lib/dateUtils';
import { formatMoney } from '../lib/scoringUtils';
import { getDayStatus, getWeeklyTotal } from '../lib/statsUtils';
import type { DateKey, PersistedState } from '../types';
import { Money, STATUS_LABEL, StatusIcon } from './common';

interface WeeklyHistoryProps {
  state: PersistedState;
  today: DateKey;
  weekStart: DateKey;
  onSelectDay?: (date: DateKey) => void;
  tone?: 'light' | 'dark';
  title?: string;
}

/** A row-by-row ledger of one week's results. */
export function WeeklyHistory({ state, today, weekStart, onSelectDay, tone = 'light', title = 'Week ledger' }: WeeklyHistoryProps) {
  const week = useWeekContent(weekStart, today);
  const total = getWeeklyTotal(state.records, weekStart);
  if (!week.data) return null;

  return (
    <section className={`ledger ledger--${tone}`} aria-label={title}>
      <h3 className="ledger__title">{title}</h3>
      <ul className="ledger__rows">
        {week.data.days.map((day) => {
          const record = state.records[day.date];
          const status = getDayStatus(day.date, today, record);
          const category = status === 'locked' ? 'Locked' : (record?.category || day.clue?.category || '—');
          const stake = day.gameType === 'final' ? 'Final' : formatMoney(day.baseValue);
          const canOpen = !!onSelectDay && status !== 'locked';
          const content = (
            <>
              <span className="ledger__day">
                <abbr title={WEEKDAY_NAMES[day.weekday]}>{WEEKDAY_SHORT[day.weekday]}</abbr>
              </span>
              <span className="ledger__category">
                {category}
                {record?.isDailyDouble && record.phase === 'resolved' && <span className="tag tag--gold">Daily Double</span>}
                {record?.forfeited && <span className="tag">No response</span>}
              </span>
              <span className="ledger__stake">{stake}</span>
              <span className={`ledger__status ledger__status--${status}`}>
                <StatusIcon status={status} size={12} />
                <span className="ledger__status-text">{STATUS_LABEL[status]}</span>
              </span>
              <span className="ledger__delta">
                {record?.phase === 'resolved' && typeof record.delta === 'number' ? <Money amount={record.delta} signed /> : <span className="money money--zero">—</span>}
              </span>
            </>
          );
          return (
            <li key={day.date}>
              {canOpen ? (
                <button type="button" className={`ledger__row ledger__row--${status}`} onClick={() => onSelectDay(day.date)}>
                  {content}
                </button>
              ) : (
                <div className={`ledger__row ledger__row--${status}`}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="ledger__total">
        <span>Week total</span>
        <Money amount={total} signed />
      </p>
    </section>
  );
}
