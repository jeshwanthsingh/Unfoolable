import {useEffect, useState} from 'react';

const token = () => new URLSearchParams(location.hash.slice(1)).get('t') ?? '';
export const backoffMs = (n: number) => Math.min(30000, 1000 * 2 ** Math.max(0, n - 1)); // 1 s, 2 s, 4 s ... 30 s

// The live feed (/events) with retry. EventSource gives up for good after a 503, so a failed stream is closed and reopened here.
// While nothing live has arrived, `snapshot` holds the one-sentence answer from /api/office, so the page is never blank.
export function useFeed<T>(): {state: T | null; connected: boolean; lastMsg: number; tick: number; attempt: number; snapshot: string} {
  const [state, setState] = useState<T | null>(null), [connected, setConnected] = useState(false);
  const [lastMsg, setLastMsg] = useState(0), [tick, setTick] = useState(Date.now()), [attempt, setAttempt] = useState(0), [snapshot, setSnapshot] = useState('');
  useEffect(() => {
    let es: EventSource | null = null, live = true, timer: ReturnType<typeof setTimeout> | undefined, fails = 0;
    const retry = () => { es?.close(); es = null; setConnected(false); if (!live) return; setAttempt(++fails); timer = setTimeout(open, backoffMs(fails)); };
    const open = () => {
      // The key becomes a same-site cookie first, because EventSource cannot send headers.
      fetch(`/k/${token()}`, {credentials: 'same-origin'}).then(() => {
        if (!live) return;
        es = new EventSource('/events');
        es.addEventListener('state', (e) => { fails = 0; setAttempt(0); setState(JSON.parse((e as MessageEvent).data) as T); setLastMsg(Date.now()); setConnected(true); });
        es.onerror = () => { setConnected(false); if (es?.readyState === EventSource.CLOSED) retry(); }; // a dropped stream the browser retries itself; a refused one (503) it abandons
      }).catch(retry);
    };
    open();
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => { live = false; es?.close(); clearTimeout(timer); clearInterval(id); };
  }, []);
  useEffect(() => { // no live state yet and the feed is failing: show the snapshot instead of nothing
    if (state || !attempt) return;
    fetch('/api/office', {headers: {'x-office-token': token()}}).then((r) => (r.ok ? r.json() : null)).then((s: {sentence?: string} | null) => { if (s?.sentence) setSnapshot(s.sentence); }).catch(() => {});
  }, [state, attempt]);
  return {state, connected, lastMsg, tick, attempt, snapshot};
}
