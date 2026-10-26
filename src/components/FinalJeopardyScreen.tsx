import { Sparkles } from 'lucide-react';
import { formatMoney } from '../lib/scoringUtils';
import type { Clue, DayRecord, WagerLimits } from '../types';
import { AnswerForm } from './AnswerForm';
import { Board } from './JeopardyBoard';
import { WagerForm } from './WagerForm';

type FinalJeopardyScreenProps =
  | { step: 'intro'; balance: number; onBegin: () => void; error?: string | null }
  | { step: 'wager'; clue: Clue; balance: number; limits: WagerLimits; onLock: (wager: number) => void; error?: string | null }
  | { step: 'clue'; clue: Clue; record: DayRecord; onSubmit: (response: string) => void; error?: string | null };

export function FinalJeopardyScreen(props: FinalJeopardyScreenProps) {
  if (props.step === 'intro') {
    return (
      <div className="final final--intro stage stage--enter">
        <div className="final__glow" aria-hidden="true" />
        <p className="final__kicker">Sunday · The weekly finale</p>
        <h2 className="final__title">
          <span>Final</span>
          <span>Jeopardy</span>
        </h2>
        <p className="final__lead">
          You’ll see the category, then wager any part of your weekly winnings on a single clue. Get it right and the
          wager is added to your week. Get it wrong and it’s taken away.
        </p>
        <p className="final__balance-line">
          Your weekly balance: <strong>{formatMoney(props.balance)}</strong>
        </p>
        {props.error && <p className="form-error" role="alert">{props.error}</p>}
        <button type="button" className="btn btn--gold btn--lg" onClick={props.onBegin} autoFocus>
          <Sparkles size={18} aria-hidden="true" />
          Reveal the category
        </button>
      </div>
    );
  }

  if (props.step === 'wager') {
    const { clue, balance, limits, onLock, error } = props;
    return (
      <div className="final stage stage--enter">
        <p className="final__kicker">Final Jeopardy · The category is</p>
        <Board variant="final" className="final__category-board">
          <h2 className="final__category">{clue.category}</h2>
        </Board>
        <WagerForm
          tone="final"
          balance={balance}
          limits={limits}
          onLock={onLock}
          error={error}
          limitNote={
            balance > 0
              ? `You can wager up to your weekly balance of ${formatMoney(limits.max)}.`
              : `Your balance is ${formatMoney(balance)}, so you may wager up to ${formatMoney(limits.max)}.`
          }
        />
      </div>
    );
  }

  const { clue, record, onSubmit, error } = props;
  return (
    <div className="final stage stage--enter">
      <p className="final__kicker">Final Jeopardy · Wager locked at {formatMoney(record.wager ?? 0)}</p>
      <Board variant="final" className="clue-board">
        <div className="board__header board__header--final">
          <div className="board__category-tile">
            <span className="board__meta">Final Jeopardy</span>
            <h2 className="board__category">{clue.category}</h2>
          </div>
        </div>
        <div className="clue-panel clue-panel--final">
          <p className="clue-text">{clue.clue}</p>
        </div>
      </Board>
      <AnswerForm tone="final" onSubmit={onSubmit} error={error} />
      <p className="stage__fine-print">
        One response. Leaving the revealed clue unanswered at midnight counts as incorrect.
      </p>
    </div>
  );
}
