import { BarChart3, Flame, HelpCircle, Moon, Settings, Sun } from 'lucide-react';
import { formatShortDate, getWeekday, startOfWeek, WEEKDAY_NAMES, WEEKDAY_SHORT, weekDates } from '../lib/dateUtils';
import { getDayStatus, isResolved } from '../lib/statsUtils';
import type { DateKey, PersistedState } from '../types';
import type { ResolvedTheme } from '../lib/theme';
import { Logo, STATUS_LABEL } from './common';

interface HeaderProps {
  state: PersistedState;
  today: DateKey;
  streak: number;
  theme: ResolvedTheme;
  onHome: () => void;
  onStats: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onToggleTheme: () => void;
}

export function Header({ state, today, streak, theme, onHome, onStats, onSettings, onHelp, onToggleTheme }: HeaderProps) {
  const days = weekDates(startOfWeek(today));
  const played = days.filter((d) => isResolved(state.records[d])).length;

  return (
    <header className="header">
      <div className="header__inner">
        <button type="button" className="brand" onClick={onHome} aria-label="Danos home">
          <Logo size={34} />
          <span className="brand__word">Danos</span>
        </button>

        <p className="header__date">
          <span className="header__weekday">{WEEKDAY_NAMES[getWeekday(today)]}</span>
          <span>{formatShortDate(today)}</span>
        </p>

        <div className="header__week" role="img" aria-label={`${played} of 7 days played this week`}>
          {days.map((date, i) => {
            const status = getDayStatus(date, today, state.records[date]);
            return (
              <span
                key={date}
                className={`pip pip--${status}`}
                title={`${WEEKDAY_SHORT[i]}: ${STATUS_LABEL[status]}`}
              />
            );
          })}
        </div>

        <div className="header__actions">
          <span className={`streak ${streak > 0 ? 'streak--hot' : ''}`} title="Current streak">
            <Flame size={18} aria-hidden="true" />
            <span className="streak__count">{streak}</span>
            <span className="visually-hidden">day streak</span>
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </button>
          <button type="button" className="icon-btn" onClick={onHelp} aria-label="How to play">
            <HelpCircle size={20} aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn" onClick={onStats} aria-label="Statistics">
            <BarChart3 size={20} aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn" onClick={onSettings} aria-label="Settings">
            <Settings size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
