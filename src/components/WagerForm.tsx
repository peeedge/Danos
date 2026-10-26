import { useId, useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { formatMoney, validateWager } from '../lib/scoringUtils';
import type { WagerLimits } from '../types';
import { Money } from './common';

interface WagerFormProps {
  limits: WagerLimits;
  balance: number;
  onLock: (wager: number) => void;
  error?: string | null;
  tone?: 'daily-double' | 'final';
  limitNote: string;
}

function roundToStep(value: number, step: number, max: number) {
  return Math.min(max, Math.max(0, Math.round(value / step) * step));
}

export function WagerForm({ limits, balance, onLock, error, tone = 'daily-double', limitNote }: WagerFormProps) {
  const [text, setText] = useState(String(Math.min(limits.max, tone === 'final' ? 0 : Math.round(limits.max / 2 / 100) * 100)));
  const [confirming, setConfirming] = useState(false);
  const inputId = useId();
  const rangeId = useId();
  const messageId = useId();

  const validation = validateWager(text, limits);
  const amount = validation.valid ? validation.wager : null;
  const step = limits.max >= 1000 ? 100 : limits.max >= 100 ? 50 : 1;

  const set = (value: number) => {
    setText(String(value));
    setConfirming(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!validation.valid) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onLock(validation.wager);
  };

  return (
    <form className={`wager wager--${tone}`} onSubmit={handleSubmit} noValidate>
      <div className="wager__balance">
        <span className="eyebrow eyebrow--light">Weekly balance</span>
        <Money amount={balance} className="wager__balance-amount" />
      </div>

      <div className="wager__display" aria-hidden="true">
        <span key={text} className="wager__amount">{amount === null ? '—' : formatMoney(amount)}</span>
      </div>

      <label htmlFor={inputId} className="wager__label">
        Your wager (whole dollars, {formatMoney(limits.min)}–{formatMoney(limits.max)})
      </label>
      <div className="wager__input-row">
        <span className="wager__currency" aria-hidden="true">$</span>
        <input
          id={inputId}
          className="input input--wager"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={text}
          onChange={(e) => {
            setText(e.target.value.replace(/[^\d]/g, '').slice(0, 7));
            setConfirming(false);
          }}
          aria-describedby={messageId}
          aria-invalid={!validation.valid}
          autoComplete="off"
        />
      </div>

      <label htmlFor={rangeId} className="visually-hidden">
        Wager slider
      </label>
      <input
        id={rangeId}
        className="wager__range"
        type="range"
        min={limits.min}
        max={limits.max}
        step={step}
        value={amount ?? 0}
        onChange={(e) => set(Number(e.target.value))}
        style={{ ['--fill' as string]: `${limits.max > 0 ? ((amount ?? 0) / limits.max) * 100 : 0}%` }}
      />

      <div className="wager__quick" role="group" aria-label="Quick wagers">
        <button type="button" className="chip" onClick={() => set(0)}>$0</button>
        <button type="button" className="chip" onClick={() => set(roundToStep(limits.max / 4, step, limits.max))}>¼</button>
        <button type="button" className="chip" onClick={() => set(roundToStep(limits.max / 2, step, limits.max))}>½</button>
        <button type="button" className="chip chip--gold" onClick={() => set(limits.max)}>
          {tone === 'final' ? 'All in' : 'True Daily Double'}
        </button>
      </div>

      <p id={messageId} className={validation.valid ? 'wager__note' : 'form-error'} role={validation.valid ? undefined : 'alert'}>
        {validation.valid ? limitNote : validation.reason}
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}

      <button type="submit" className={`btn btn--lg ${confirming ? 'btn--danger' : 'btn--gold'}`} disabled={!validation.valid}>
        <Lock size={18} aria-hidden="true" />
        {confirming ? `Confirm ${amount !== null ? formatMoney(amount) : ''} — reveal clue` : 'Lock in wager'}
      </button>
      {confirming && (
        <p className="wager__confirm" role="status">
          Your wager can’t be changed once the clue is revealed.{' '}
          <button type="button" className="link-btn" onClick={() => setConfirming(false)}>
            Adjust
          </button>
        </p>
      )}
    </form>
  );
}
