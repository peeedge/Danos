import { useId, useMemo, useState } from 'react';
import { AlertTriangle, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { browserTimeZone, listTimeZones } from '../lib/dateUtils';
import type { Settings, ThemePreference } from '../types';
import { Modal } from './Modal';

const THEME_OPTIONS: { id: ThemePreference; label: string; hint: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', hint: 'Cream board', icon: Sun },
  { id: 'dark', label: 'Dark', hint: 'Studio night', icon: Moon },
  { id: 'auto', label: 'Auto', hint: 'Match device', icon: Monitor },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  activeTimeZone: string;
  onUpdate: (settings: Partial<Settings>) => void;
  onReset: () => void;
}

export function SettingsModal({ open, onClose, settings, activeTimeZone, onUpdate, onReset }: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const tzId = useId();
  const confirmId = useId();
  const zones = useMemo(listTimeZones, []);

  const close = () => {
    setConfirmReset(false);
    setConfirmText('');
    onClose();
  };

  return (
    <Modal open={open} title="Settings" onClose={close}>
      <div className="settings">
        <section className="settings__section">
          <h3 className="settings__label" id="theme-label">Appearance</h3>
          <p className="settings__help">The game board stays Jeopardy blue. This changes the calendar, stats, and menus.</p>
          <div className="theme-picker" role="radiogroup" aria-labelledby="theme-label">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = settings.theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`theme-picker__btn ${selected ? 'theme-picker__btn--on' : ''}`}
                  onClick={() => onUpdate({ theme: option.id })}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="theme-picker__label">{option.label}</span>
                  <span className="theme-picker__hint">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="settings__section">
          <label htmlFor={tzId} className="settings__label">Time zone</label>
          <p className="settings__help">
            This week’s remaining tiles are open now. Next week unlocks Monday at midnight in this time zone. Currently:{' '}
            <strong>{activeTimeZone}</strong>.
          </p>
          <select
            id={tzId}
            className="input select"
            value={settings.timeZone}
            onChange={(e) => onUpdate({ timeZone: e.target.value })}
          >
            <option value="auto">Automatic ({browserTimeZone()})</option>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </section>

        <section className="settings__section">
          <h3 className="settings__label">Your data</h3>
          <p className="settings__help">
            Progress is saved in this browser’s local storage. It isn’t synced across devices, and clearing site data
            will erase it.
          </p>
        </section>

        <section className="settings__section settings__section--danger">
          <h3 className="settings__label">Reset progress</h3>
          {!confirmReset ? (
            <>
              <p className="settings__help">Erase every result, streak and winnings total and start fresh from today.</p>
              <button type="button" className="btn btn--danger-outline" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={16} aria-hidden="true" />
                Reset progress…
              </button>
            </>
          ) : (
            <form
              className="settings__confirm"
              onSubmit={(e) => {
                e.preventDefault();
                if (confirmText.trim().toUpperCase() !== 'RESET') return;
                onReset();
                close();
              }}
            >
              <p className="settings__warning" role="alert">
                <AlertTriangle size={18} aria-hidden="true" />
                This permanently deletes all saved Danos data in this browser.
              </p>
              <label htmlFor={confirmId} className="settings__help">
                Type <strong>RESET</strong> to confirm.
              </label>
              <input
                id={confirmId}
                className="input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                autoFocus
              />
              <div className="settings__confirm-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--danger" disabled={confirmText.trim().toUpperCase() !== 'RESET'}>
                  Delete everything
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </Modal>
  );
}
