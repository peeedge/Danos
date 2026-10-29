import type { ReactNode } from 'react';
import { Check, Clock, Lock, Minus, Play, X } from 'lucide-react';
import { formatMoney } from '../lib/scoringUtils';
import type { DayStatus } from '../types';

export function Money({ amount, signed = false, className = '' }: { amount: number; signed?: boolean; className?: string }) {
  const tone = amount > 0 ? 'pos' : amount < 0 ? 'neg' : 'zero';
  return <span className={`money money--${tone} ${className}`}>{formatMoney(amount, { signed })}</span>;
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo">
      <rect x="4" y="12" width="56" height="48" rx="8" fill="#1239A6" stroke="#F5C451" strokeWidth="4" />
      <rect x="4" y="12" width="56" height="13" rx="6" fill="#F5C451" />
      <rect x="17" y="4" width="6" height="14" rx="3" fill="#F5C451" />
      <rect x="41" y="4" width="6" height="14" rx="3" fill="#F5C451" />
      <text x="32" y="53" fontFamily="Oswald, Arial Narrow, sans-serif" fontSize="26" fontWeight="700" fill="#F5C451" textAnchor="middle">
        $
      </text>
    </svg>
  );
}

export const STATUS_LABEL: Record<DayStatus, string> = {
  locked: 'Locked',
  available: 'Open',
  'in-progress': 'In progress',
  correct: 'Correct',
  incorrect: 'Incorrect',
  missed: 'Missed',
};

export function StatusIcon({ status, size = 16 }: { status: DayStatus; size?: number }) {
  const props = { size, 'aria-hidden': true, strokeWidth: 3 } as const;
  switch (status) {
    case 'correct':
      return <Check {...props} />;
    case 'incorrect':
      return <X {...props} />;
    case 'missed':
      return <Minus {...props} />;
    case 'locked':
      return <Lock {...props} strokeWidth={2.5} />;
    case 'in-progress':
      return <Clock {...props} strokeWidth={2.5} />;
    case 'available':
      return <Play {...props} fill="currentColor" />;
  }
}

export function LoadingBoard({ label = 'Loading clue…' }: { label?: string }) {
  return (
    <div className="board board--loading" role="status" aria-live="polite">
      <div className="board__shimmer" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry, children }: { message: string; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Try again
        </button>
      )}
      {children}
    </div>
  );
}
