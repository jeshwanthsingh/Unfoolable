import {Suspense, lazy, useEffect, useState} from 'react';
import type {Snapshot} from '../../../observatory/office-data.ts';
import {BOARD, COPY, DETAIL_WORDS, FUN, lightIcon} from './copy.ts';
import {Floor} from './Floor.tsx';
import {Board} from './Board.tsx';
import '../unfoolable.css';
import './office-annex.css';

const FunView = lazy(() => import('./FunView.tsx').then((m) => ({default: m.FunView}))); // the pixel office loads only when its pictures exist
// Plain read-only page. Strings from the reader are already escaped; React shows them as text, never as markup.
const token = () => new URLSearchParams(location.hash.slice(1)).get('t') ?? '';
const unescape = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

export function OfficePage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [err, setErr] = useState('');
  const [more, setMore] = useState(false);
  const [art, setArt] = useState(false); // the licensed pictures are on this computer (the server says so)
  const [view, setView] = useState<'office' | 'simple'>('simple');
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
    const t = token(); if (!t) return;
    fetch(`/k/${t}`, {credentials: 'same-origin'}).then(() => fetch('/art/manifest')).then((r) => (r.ok ? r.json() : null)).then((j: {available?: boolean} | null) => {
      if (j?.available) { setArt(true); if (innerWidth >= 900) setView('office'); } // laptop: the office; phone: the simple view
    }).catch(() => { /* no art: the simple view stays */ });
  }, []);
  useEffect(() => {
    const t = token();
    if (!t) { setErr(COPY.noLink); return; }
    let live = true;
    const load = () => fetch('/api/office', {headers: {'x-office-token': t}}).then((r) => r.ok ? r.json() : Promise.reject(new Error())).then((s: Snapshot) => { if (live) { setSnap(s); setErr(''); } }).catch(() => live && setErr(COPY.offline));
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => { live = false; clearInterval(id); };
  }, []);

  const switcher = (
    <div className="ob-bar" role="toolbar" aria-label={BOARD.tools}>
      <button type="button" className="ob-tool" aria-pressed={view === 'office'} onClick={() => setView('office')}>{FUN.office}</button>
      <button type="button" className="ob-tool" aria-pressed={view === 'simple'} onClick={() => setView('simple')}>{FUN.simple}</button>
    </div>
  );
  return (
    <div className="unfoolable oa" data-theme={dark ? 'dark' : 'light'}>
      <main>
        <header className="oa-top">
          <h1>{COPY.title}</h1>
        </header>
        {!more && art && view === 'office' ? <Suspense fallback={null}><FunView toolbar={switcher} /></Suspense> : !more ? <>{art ? switcher : null}<Board onMore={() => setMore(true)} moreLabel={BOARD.more} /></> : <>
        <div className="ob-bar"><button type="button" className="ob-tool" onClick={() => setMore(false)}><span aria-hidden="true">◀</span> {BOARD.back}</button></div>
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
        <p className="oa-muted oa-foot">{COPY.badge}. {COPY.badgeHelp}</p>
      </main>
    </div>
  );
}
