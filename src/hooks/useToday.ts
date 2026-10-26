import { useEffect, useState } from 'react';
import { getTodayKey, msUntilNextDay } from '../lib/dateUtils';
import type { DateKey } from '../types';

/** Today's date key in `timeZone`, updated when local midnight passes or the tab regains focus. */
export function useToday(timeZone: string): DateKey {
  const [today, setToday] = useState(() => getTodayKey(timeZone));

  useEffect(() => {
    const refresh = () => setToday(getTodayKey(timeZone));
    refresh();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      // Wake shortly after midnight, but re-check at least every minute in case the timer is throttled.
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, Math.min(msUntilNextDay(timeZone) + 250, 60_000));
    };
    schedule();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [timeZone]);

  return today;
}

/** Live countdown to the next daily clue. */
export function useCountdown(timeZone: string): number {
  const [ms, setMs] = useState(() => msUntilNextDay(timeZone));
  useEffect(() => {
    const tick = () => setMs(msUntilNextDay(timeZone));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timeZone]);
  return ms;
}
