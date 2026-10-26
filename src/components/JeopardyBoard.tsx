import type { ReactNode } from 'react';

interface BoardProps {
  children: ReactNode;
  variant?: 'standard' | 'daily-double' | 'final';
  className?: string;
}

/** The blue tiled board frame that every clue state is rendered inside. */
export function Board({ children, variant = 'standard', className = '' }: BoardProps) {
  return <div className={`board board--${variant} ${className}`}>{children}</div>;
}

interface BoardHeaderProps {
  category: string;
  meta?: ReactNode;
  value?: ReactNode;
}

export function BoardHeader({ category, meta, value }: BoardHeaderProps) {
  return (
    <div className="board__header">
      <div className="board__category-tile">
        {meta && <span className="board__meta">{meta}</span>}
        <h2 className="board__category">{category}</h2>
      </div>
      {value !== undefined && <div className="board__value-tile">{value}</div>}
    </div>
  );
}

interface JeopardyBoardProps {
  category: string;
  weekdayLabel: string;
  valueLabel: string;
  difficultyLabel: string;
  onSelect: () => void;
  disabled?: boolean;
}

/** Pre-reveal board: the category column with a single dollar tile waiting to be picked. */
export function JeopardyBoard({ category, weekdayLabel, valueLabel, difficultyLabel, onSelect, disabled }: JeopardyBoardProps) {
  return (
    <Board className="board--select">
      <div className="board__grid">
        <div className="board__category-tile board__category-tile--column">
          <span className="board__meta">{weekdayLabel}</span>
          <h2 className="board__category">{category}</h2>
        </div>
        <button type="button" className="board__pick" onClick={onSelect} disabled={disabled}>
          <span className="board__pick-value">{valueLabel}</span>
          <span className="board__pick-hint">Select to reveal the clue</span>
        </button>
      </div>
      <p className="board__footnote">
        Difficulty: <strong>{difficultyLabel}</strong> · Respond in the form of a question
      </p>
    </Board>
  );
}
