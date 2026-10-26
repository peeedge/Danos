import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { HowToPlay } from './components/HowToPlay';
import { Modal } from './components/Modal';
import { PlayScreen } from './components/PlayScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { SettingsModal } from './components/SettingsModal';
import { StatsDashboard } from './components/StatsDashboard';
import { ARCHIVE_WEEKS } from './game/rules';
import { useGameState, type StorageNotice } from './hooks/useGameState';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { addDays, startOfWeek } from './lib/dateUtils';
import { computeStats } from './lib/statsUtils';
import type { DateKey } from './types';

type View = { name: 'home' } | { name: 'play' } | { name: 'review'; date: DateKey };
type ModalName = 'stats' | 'settings' | 'help' | null;

const NOTICE_TEXT: Record<Exclude<StorageNotice, null>, string> = {
  unavailable: 'Your browser is blocking local storage, so progress won’t be saved after you leave.',
  recovered: 'Your saved progress couldn’t be read, so Danos started fresh. A backup of the old data was kept.',
  'save-failed': 'Danos couldn’t save your latest progress. Check that site storage isn’t full or disabled.',
};

export default function App() {
  const game = useGameState();
  const { state, today } = game;
  const theme = useTheme(state.settings.theme);
  const [view, setView] = useState<View>({ name: 'home' });
  const [modal, setModal] = useState<ModalName>(null);
  const [seenHelp, setSeenHelp] = useLocalStorage('danos:ui:seen-help', false);
  const currentWeek = startOfWeek(today);
  const [weekStart, setWeekStart] = useState<DateKey>(currentWeek);
  const mainRef = useRef<HTMLElement>(null);

  const stats = useMemo(() => computeStats(state, today), [state, today]);
  const earliestWeek = useMemo(() => {
    const archive = addDays(currentWeek, -7 * ARCHIVE_WEEKS);
    const firstWeek = startOfWeek(state.firstSeenDate);
    return firstWeek < archive ? firstWeek : archive;
  }, [currentWeek, state.firstSeenDate]);

  // Snap back to the current week when the day (and possibly week) rolls over.
  useEffect(() => {
    setWeekStart(currentWeek);
    setView((v) => (v.name === 'play' ? { name: 'home' } : v));
  }, [currentWeek, today]);

  useEffect(() => {
    if (!seenHelp) setModal('help');
  }, [seenHelp]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [view]);

  const selectDay = (date: DateKey) => {
    if (date > today) return;
    const record = state.records[date];
    if (date === today && record?.phase !== 'resolved') setView({ name: 'play' });
    else setView({ name: 'review', date });
  };

  const closeModal = () => {
    if (modal === 'help') setSeenHelp(true);
    setModal(null);
  };

  const immersive = view.name !== 'home';

  return (
    <div className={`app ${immersive ? 'app--immersive' : ''}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header
        state={state}
        today={today}
        streak={stats.currentStreak}
        theme={theme}
        onHome={() => setView({ name: 'home' })}
        onStats={() => setModal('stats')}
        onSettings={() => setModal('settings')}
        onHelp={() => setModal('help')}
        onToggleTheme={() => game.updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
      />

      {game.notice && (
        <div className="notice" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{NOTICE_TEXT[game.notice]}</span>
          <button type="button" className="icon-btn icon-btn--light" onClick={game.dismissNotice} aria-label="Dismiss">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <main id="main" ref={mainRef} tabIndex={-1} className="main">
        {view.name === 'home' && (
          <HomeScreen
            game={game}
            stats={stats}
            weekStart={weekStart}
            earliestWeek={earliestWeek}
            onWeekChange={setWeekStart}
            onPlay={() => setView({ name: 'play' })}
            onSelectDay={selectDay}
          />
        )}
        {view.name === 'play' && (
          <PlayScreen game={game} onExit={() => setView({ name: 'home' })} onStats={() => setModal('stats')} />
        )}
        {view.name === 'review' && (
          <ReviewScreen
            key={view.date}
            game={game}
            date={view.date}
            onExit={() => setView({ name: 'home' })}
            onStats={() => setModal('stats')}
          />
        )}
      </main>

      <footer className="footer">
        <p>
          Danos is an independent fan-made trivia game, not affiliated with or endorsed by Jeopardy! or The New York
          Times. All clues are original. Winnings are virtual.
        </p>
      </footer>

      <Modal open={modal === 'stats'} title="Statistics" onClose={closeModal} wide>
        <StatsDashboard state={state} today={today} />
      </Modal>
      <Modal open={modal === 'help'} title="How to play Danos" onClose={closeModal}>
        <HowToPlay />
        <button type="button" className="btn btn--blue btn--block" onClick={closeModal}>
          Let’s play
        </button>
      </Modal>
      <SettingsModal
        open={modal === 'settings'}
        onClose={closeModal}
        settings={state.settings}
        activeTimeZone={game.timeZone}
        onUpdate={game.updateSettings}
        onReset={() => {
          game.resetProgress();
          setView({ name: 'home' });
        }}
      />
    </div>
  );
}
