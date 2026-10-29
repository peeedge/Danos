import { WEEKDAY_NAMES } from '../lib/dateUtils';
import { formatMoney } from '../lib/scoringUtils';
import type { Clue, DayRecord, Weekday } from '../types';
import { AnswerForm } from './AnswerForm';
import { Board, BoardHeader } from './JeopardyBoard';

interface ClueScreenProps {
  clue: Clue;
  record: DayRecord;
  weekday: Weekday;
  onSubmit: (response: string) => void;
  error?: string | null;
}

export function ClueScreen({ clue, record, weekday, onSubmit, error }: ClueScreenProps) {
  const stake = record.isDailyDouble ? record.wager ?? 0 : record.baseValue;
  return (
    <div className="stage stage--enter">
      <Board variant={record.isDailyDouble ? 'daily-double' : 'standard'} className="clue-board">
        <BoardHeader
          category={clue.category}
          meta={record.isDailyDouble ? `${WEEKDAY_NAMES[weekday]} · Daily Double` : WEEKDAY_NAMES[weekday]}
          value={
            <>
              <span className="board__value-label">{record.isDailyDouble ? 'Wager' : 'Value'}</span>
              <span className="board__value">{formatMoney(stake)}</span>
            </>
          }
        />
        <div className="clue-panel">
          <p className="clue-text">{clue.clue}</p>
        </div>
      </Board>
      <AnswerForm onSubmit={onSubmit} error={error} />
      <p className="stage__fine-print">
        Once a clue is revealed it must be answered before that day ends. A revealed clue left unanswered counts as incorrect.
      </p>
    </div>
  );
}
