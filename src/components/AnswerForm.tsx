import { useId, useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';

interface AnswerFormProps {
  onSubmit: (response: string) => void;
  error?: string | null;
  tone?: 'standard' | 'final';
}

export function AnswerForm({ onSubmit, error, tone = 'standard' }: AnswerFormProps) {
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const empty = response.trim() === '';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (empty || submitting) return;
    setSubmitting(true);
    onSubmit(response);
    setSubmitting(false);
  };

  return (
    <form className={`answer-form answer-form--${tone}`} onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId} className="answer-form__label">
        Your response
      </label>
      <div className="answer-form__row">
        <input
          id={inputId}
          className="input input--answer"
          type="text"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="What is…?"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={120}
          enterKeyHint="send"
          aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
          aria-invalid={error ? true : undefined}
          autoFocus
        />
        <button type="submit" className="btn btn--gold" disabled={empty || submitting}>
          <Send size={18} aria-hidden="true" />
          Submit
        </button>
      </div>
      <p id={hintId} className="answer-form__hint">
        Phrase it as a question — “Who is…”, “What is…” — or just type the answer. Spelling is forgiven a little. You get one try.
      </p>
      {error && (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
