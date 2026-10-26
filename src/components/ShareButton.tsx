import { useEffect, useRef, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { shareOrCopy } from '../lib/shareUtils';

interface ShareButtonProps {
  text: string;
  className?: string;
  variant?: 'gold' | 'outline-light' | 'ghost';
  label?: string;
}

export function ShareButton({ text, className = '', variant = 'gold', label = 'Share result' }: ShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const announce = (next: 'copied' | 'failed') => {
    setStatus(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), 2200);
  };

  const onClick = async () => {
    const result = await shareOrCopy(text);
    if (result === 'copied') announce('copied');
    else if (result === 'failed') announce('failed');
  };

  return (
    <button
      type="button"
      className={`btn btn--${variant} ${className}`}
      onClick={onClick}
      aria-live="polite"
    >
      {status === 'copied' ? <Check size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}
      {status === 'copied' ? 'Copied!' : status === 'failed' ? 'Can’t share' : label}
    </button>
  );
}
