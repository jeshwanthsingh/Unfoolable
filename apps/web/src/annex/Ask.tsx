import {useEffect, useRef, useState} from 'react';
import {ASK, BUILD, FEED} from './copy.ts';

const token = () => new URLSearchParams(location.hash.slice(1)).get('t') ?? '';
// Writes the typed task into the builder's mailbox (plain text). It starts nothing: in Claude Code, say "see mailbox".
export function Ask() {
  const [text, setText] = useState(''), [msg, setMsg] = useState<{ok: boolean; t: string} | null>(null), [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch('/ask', {method: 'POST', headers: {'x-office-token': token(), 'content-type': 'application/json'}, body: JSON.stringify({text})});
      if (r.ok) { setText(''); setMsg({ok: true, t: ASK.sent}); } else setMsg({ok: false, t: r.status === 429 ? ASK.slow : r.status === 401 ? FEED.old : r.status === 413 ? ASK.long : ASK.failed});
    } catch { setMsg({ok: false, t: ASK.failed}); }
    setBusy(false);
  };
  return (
    <>
    <form className="oa-ask" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <textarea aria-label={ASK.placeholder} placeholder={ASK.placeholder} value={text} maxLength={2000} rows={2} onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="ob-btn" disabled={busy || !text.trim()}>{ASK.send}</button>
      <p className="oa-hint">{ASK.hint}</p>
      {msg ? <p className={msg.ok ? 'oa-sent' : 'oa-sent bad'} role="status"><span aria-hidden="true">{msg.ok ? '✉ ' : ''}</span>{msg.t}</p> : null}
    </form>
    <Builders />
    </>
  );
}

type AskItem = {id: string; tool: string; summary: string; state: 'open' | 'deciding' | 'answered' | 'withdrawn'; createdAt: number; expiresAt: number};
type Built = {id: string; repo: string; name: string; sessionId: string; version: string; status: 'running' | 'stopped' | 'ended' | 'lost' | 'needs-human'; turnDone: boolean; unread: boolean; asks: AskItem[]};
const READ_ONLY = ['Read', 'Grep', 'Glob', 'LS']; // the server decides; this only words the button
const post = async (path: string, body: object): Promise<{ok: boolean; status: number; error?: string | undefined}> => {
  const r = await fetch(path, {method: 'POST', headers: {'x-office-token': token(), 'content-type': 'application/json'}, body: JSON.stringify(body)});
  return {ok: r.ok, status: r.status, error: ((await r.json().catch(() => ({}))) as {error?: string}).error};
};
const statusWords = (b: Built): string => b.status === 'running' ? (b.turnDone ? BUILD.turn : BUILD.working) : b.status === 'stopped' ? BUILD.stopped : b.status === 'ended' ? BUILD.ended : b.status === 'lost' ? `${BUILD.lost}${b.sessionId ? `: claude --resume ${b.sessionId}` : ''}` : BUILD.human;

// Builders the office started: their asks are Needs-you items (amber) with Yes/No; the tool's input never reaches the page.
export function Builders() {
  const [list, setList] = useState<Built[] | null>(null), [err, setErr] = useState(''), [repo, setRepo] = useState(''), [name, setName] = useState(''), [busy, setBusy] = useState<string | null>(null);
  const [down, setDown] = useState(false), timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // 404 = this office was not given builders, 401 = this page's key is not valid: either way the strip goes and the asking stops. A failed request keeps the last list but says it may be old.
  const load = () => fetch('/builders', {headers: {'x-office-token': token()}}).then(async (r) => {
    if (r.status === 404 || r.status === 401) { if (timer.current) clearInterval(timer.current); setList(null); return; }
    if (!r.ok) { setDown(true); return; }
    setDown(false); setList(((await r.json()) as {builders?: Built[]}).builders ?? null);
  }).catch(() => setDown(true));
  useEffect(() => { void load(); timer.current = setInterval(() => { if (!document.hidden) void load(); }, 1500); return () => { if (timer.current) clearInterval(timer.current); }; }, []);
  if (list === null) return null; // the office was not given the means to start builders
  const act = async (key: string, fn: () => Promise<{ok: boolean; status?: number; error?: string | undefined}>) => { setBusy(key); const r = await fn().catch(() => ({ok: false, status: 0, error: BUILD.failed})); setErr(r.ok ? '' : r.status === 401 ? FEED.old : (r.error ?? BUILD.failed)); setBusy(null); void load(); };
  return (
    <section className="oa-builders" aria-label={BUILD.title}>
      <h2>{BUILD.title}</h2>
      <form className="oa-bstart" onSubmit={(e) => { e.preventDefault(); void act('start', () => post('/start', {repo, name})).then(() => setName('')); }}>
        <input name="repo" aria-label={BUILD.repo} placeholder={BUILD.repo} value={repo} maxLength={60} onChange={(e) => setRepo(e.target.value)} />
        <input name="name" aria-label={BUILD.name} placeholder={BUILD.name} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="ob-btn" disabled={busy === 'start' || !repo || !name}>{BUILD.start}</button>
        <p className="oa-hint">{BUILD.hint}</p>
      </form>
      {down ? <p role="status" className="oa-muted">{BUILD.down}</p> : null}
      {err ? <p role="alert" className="oa-error">{err}</p> : null}
      <ul className="oa-blist">
        {list.map((b) => (
          <li key={b.id} className="oa-b">
            <div className="oa-bhead">
              <button type="button" className="oa-btitle" onClick={() => void act(`seen${b.id}`, () => post('/seen', {builder: b.id}))}>{b.name} <span className="oa-muted">({b.repo})</span></button>
              {b.unread ? <span className="oa-new">{BUILD.newResult}</span> : null}
              <span className="oa-bstatus">{statusWords(b)}{b.version ? ` · claude ${b.version}` : ''}</span>
              {b.status === 'running' ? <button type="button" className="ob-btn see oa-bstop" onClick={() => void act(`stop${b.id}`, () => post('/stop', {builder: b.id}))}>{BUILD.stop}</button> : null}
            </div>
            {b.asks.map((a) => {
              const open = a.state === 'open', risky = !READ_ONLY.includes(a.tool);
              return (
                <div key={a.id} className={`oa-askitem${open || a.state === 'deciding' ? '' : a.state === 'withdrawn' ? ' done stale' : ' done'}`}>
                  <p><b>{BUILD.needs}:</b> {a.summary}</p>
                  {open ? (
                    <p className="oa-abtns">
                      <button type="button" className="ob-btn oa-yes" disabled={down || busy === `a${b.id}${a.id}`} onClick={() => void act(`a${b.id}${a.id}`, () => post('/answer', {builder: b.id, ask: a.id, choice: 'yes'}))}>{risky ? BUILD.yesBox : BUILD.yes}</button>
                      <button type="button" className="ob-btn see oa-no" disabled={down} onClick={() => void act(`n${b.id}${a.id}`, () => post('/answer', {builder: b.id, ask: a.id, choice: 'no'}))}>{BUILD.no}</button>
                    </p>
                  ) : a.state === 'deciding' ? <p>{BUILD.waitBox}</p> : <p className="oa-muted">{a.state === 'withdrawn' ? BUILD.stale : BUILD.answered}</p>}
                </div>
              );
            })}
          </li>
        ))}
      </ul>
    </section>
  );
}
