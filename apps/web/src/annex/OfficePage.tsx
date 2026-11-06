import {useEffect, useState} from 'react';
import type {Snapshot} from '../../../observatory/office-data.ts';
import {BOARD, COPY, DETAIL_WORDS, lightIcon} from './copy.ts';
import {Floor} from './Floor.tsx';
import {Board} from './Board.tsx';
import '../unfoolable.css';
import './office-annex.css';

// Plain read-only page. Strings from the reader are already escaped; React shows them as text, never as markup.
const token = () => new URLSearchParams(location.hash.slice(1)).get('t') ?? '';
const unescape = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

export function OfficePage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [err, setErr] = useState('');
  const [more, setMore] = useState(false);
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: dark)'), f = () => setDark(m.matches);
    m.addEventListener('change', f); return () => m.removeEventListener('change', f);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-unfool-theme', dark ? 'dark' : 'light');
    document.documentElement.style.background = dark ? '#151719' : '#FAFBFC';
  }, [dark]);
  useEffect(() => {
    const t = token();
    if (!t) { setErr(COPY.noLink); return; }
    let live = true;
    const load = () => fetch('/api/office', {headers: {'x-office-token': t}}).then((r) => r.ok ? r.json() : Promise.reject(new Error())).then((s: Snapshot) => { if (live) { setSnap(s); setErr(''); } }).catch(() => live && setErr(COPY.offline));
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => { live = false; clearInterval(id); };
  }, []);

  return (
    <div className="unfoolable oa" data-theme={dark ? 'dark' : 'light'}>
      <main>
        <header className="oa-top">
          <h1>{COPY.title}</h1>
          <p className="oa-badge" title={COPY.badgeHelp}>{COPY.badge}</p>
        </header>
        <button type="button" className="oa-toggle" onClick={() => setMore(!more)}>{more ? BOARD.back : BOARD.more}</button>
        {!more ? <Board /> : <>
        {err ? <p role="alert" className="oa-error">{err}</p> : null}
        {!snap && !err ? <p>{COPY.loading}</p> : null}
        {snap ? (<>
          <p className={`oa-line oa-${snap.light}`} role="status">
            <span className="oa-light" aria-hidden="true">{lightIcon[snap.light]}</span>
            <strong>{COPY.light[snap.light]}.</strong> {snap.sentence}
          </p>
          <Floor snap={snap} />
          <p className="oa-muted">{COPY.updated} {snap.generatedAt.slice(11, 16)}</p>
          <details className="oa-details"><summary>{COPY.showDetails}</summary>
            <p>{DETAIL_WORDS.source}</p>
            <ul>{snap.details.map((d, n) => <li key={n}>{unescape(d)}</li>)}</ul>
          </details>
        </>) : null}
        </>}
      </main>
    </div>
  );
}
