import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

interface DailyDoubleRevealProps {
  category: string;
  onContinue: () => void;
}

export function DailyDoubleReveal({ category, onContinue }: DailyDoubleRevealProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const id = setTimeout(() => buttonRef.current?.focus(), 900);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="dd-reveal" role="alertdialog" aria-labelledby="dd-title" aria-describedby="dd-desc">
      <div className="dd-reveal__rays" aria-hidden="true" />
      <div className="dd-reveal__card">
        <p className="dd-reveal__kicker">You found it</p>
        <h2 id="dd-title" className="dd-reveal__title">
          <span>Daily</span>
          <span>Double</span>
        </h2>
        <p id="dd-desc" className="dd-reveal__desc">
          Today’s clue in <strong>{category}</strong> is a Daily Double. Set your own stakes before you see the clue.
        </p>
        <button ref={buttonRef} type="button" className="btn btn--gold btn--lg" onClick={onContinue}>
          Make your wager
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
