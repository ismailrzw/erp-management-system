import { useEffect, useRef } from 'react';

export function useLiveRefresh(refresh, interval = 30000) {
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; }, [refresh]);
  useEffect(() => {
    let running = false;
    const run = async () => {
      if (running || document.visibilityState === 'hidden' || !navigator.onLine) return;
      running = true;
      try { await latest.current(); } catch { /* The owning page retains its last good state. */ }
      finally { running = false; }
    };
    const timer = setInterval(run, interval);
    window.addEventListener('focus', run);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', run);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, [interval]);
}
