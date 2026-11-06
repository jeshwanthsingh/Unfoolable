import {useEffect, useState} from 'react';
import type {OfficeState} from '../../../observatory/office-reducer.ts';
import {boardOf, freshness, type Card} from '../../../observatory/office-board.ts';
import {BOARD, lightIcon} from './copy.ts';

// The live board: reads the SSE stream. Words come from codes (office-board.ts); no raw text from any log is shown here.
const token = () => new URLSearchParams(location.hash.slice(1)).get('t') ?? '';

async function openHelper(id: string): Promise<boolean> {
  const call = (resume: boolean) => fetch('/open', {method: 'POST', headers: {'x-office-token': token(), 'content-type': 'application/json'}, body: JSON.stringify({id, resume})});
  let r = await call(false);
  if (r.status === 409 && window.confirm(BOARD.confirm)) r = await call(true);
  return r.ok;
}

export function Board() {
  const [state, setState] = useState<OfficeState | null>(null);
  const [lastMsg, setLastMsg] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [connected, setConnected] = useState(false);
  const [err, setErr] = useState('');
  const [openErr, setOpenErr] = useState(false);
  useEffect(() => {
    const t = token();
    if (!t) { setErr(BOARD.noLink); return; }
    let es: EventSource | null = null, live = true;
    // The key becomes a same-site cookie first, because EventSource cannot send headers.
    fetch(`/k/${t}`, {credentials: 'same-origin'}).then(() => {
      if (!live) return;
      es = new EventSource('/events');
      es.addEventListener('state', (e) => { setState(JSON.parse((e as MessageEvent).data) as OfficeState); setLastMsg(Date.now()); setConnected(true); });
      es.onerror = () => setConnected(false);
    }).catch(() => setConnected(false));
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => { live = false; es?.close(); clearInterval(id); };
  }, []);
  if (err) return <p role="alert" className="oa-error">{err}</p>;
  const b = state ? boardOf(state) : null;
  const fresh = freshness(connected, tick - lastMsg, state?.freshness.lastEventAt ?? null);
  const cols: [keyof typeof BOARD.cols, Card[]][] = b ? [['needs', b.needs], ['working', b.working], ['checking', b.checking], ['done', b.done]] : [];
  return (
    <section aria-label="Board">
      <p className={`ob-fresh${fresh.startsWith('LIVE') ? '' : ' off'}`} role="status">{fresh}</p>
      {b ? <p className={`oa-line oa-${b.light}`}><span className="oa-light" aria-hidden="true">{lightIcon[b.light]}</span><strong>{b.sentence}</strong></p> : null}
      <div className="ob-cols">
        {cols.map(([k, cards]) => (
          <div className="ob-col" key={k}>
            <h2>{BOARD.cols[k]} ({cards.length})</h2>
            {cards.length === 0 ? <p className="oa-muted">{BOARD.empty}</p> : (
              <ul>{cards.map((c) => <li key={c.key} className={`ob-card ob-${c.tone}`}><strong>{c.project}</strong>{c.verb} <time>{c.time}</time>{k === 'needs' ? <button type="button" className="oa-toggle" onClick={() => openHelper(c.key).then((ok) => setOpenErr(!ok)).catch(() => setOpenErr(true))}>{BOARD.open}</button> : null}</li>)}</ul>
            )}
          </div>
        ))}
      </div>
      {openErr ? <p role="alert" className="oa-error">{BOARD.openFailed}</p> : null}
      {b && b.quiet > 0 ? <p className="oa-muted">{b.quiet} {BOARD.quiet}</p> : null}
    </section>
  );
}
