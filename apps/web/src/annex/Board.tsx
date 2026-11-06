import {useEffect, useRef, useState} from 'react';
import {LayoutGroup, motion, useReducedMotion} from 'motion/react';
import {Character} from './Character.tsx';
import {chimeDue, poseOf, shouldAnimate} from '../../../observatory/office-motion.ts';
import type {OfficeState} from '../../../observatory/office-reducer.ts';
import type {Away, Practice} from '../../../observatory/office-away.ts';
import {practiceLine} from '../../../observatory/office-away.ts';
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

// One soft chime (a short sine beep). Only runs after the user switched sound on, because browsers need a click first anyway.
function chime(): void {
  try {
    const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 660; g.gain.setValueAtTime(0.06, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.6);
  } catch { /* no sound is fine */ }
}

export function Board() {
  const [state, setState] = useState<(OfficeState & {away?: Away; practice?: Practice | null}) | null>(null);
  const [lastMsg, setLastMsg] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [connected, setConnected] = useState(false);
  const [err, setErr] = useState('');
  const [openErr, setOpenErr] = useState(false);
  const [sound, setSound] = useState(false); // off by default
  const reduce = useReducedMotion() ?? false;
  const prevNeeds = useRef<Set<string> | null>(null);
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
  useEffect(() => {
    if (!state) return;
    const now = boardOf(state).needs.map((c) => c.key);
    if (sound && chimeDue(prevNeeds.current, now)) chime();
    prevNeeds.current = new Set(now);
  }, [state, sound]);
  if (err) return <p role="alert" className="oa-error">{err}</p>;
  const b = state ? boardOf(state) : null;
  const fresh = freshness(connected, tick - lastMsg, state?.freshness.lastEventAt ?? null);
  const animate = shouldAnimate(state?.freshness.ageSeconds ?? null, reduce);
  const cols: [keyof typeof BOARD.cols, Card[]][] = b ? [['needs', b.needs], ['working', b.working], ['checking', b.checking], ['done', b.done]] : [];
  return (
    <section aria-label="Board">
      <p className={`ob-fresh${fresh.startsWith('LIVE') ? '' : ' off'}`} role="status">{fresh}</p>
      {b ? <p className={`oa-line oa-${b.light}`}><span className="oa-light" aria-hidden="true">{lightIcon[b.light]}</span><strong>{b.sentence}</strong></p> : null}
      <button type="button" className="oa-toggle" aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? BOARD.soundOn : BOARD.soundOff}</button>
      <LayoutGroup><div className="ob-cols">
        {cols.map(([k, cards]) => (
          <div className="ob-col" key={k}>
            <h2>{BOARD.cols[k]} ({cards.length})</h2>
            {cards.length === 0 ? <p className="oa-muted">{BOARD.empty}</p> : (
              <ul>{cards.map((c) => (
                <motion.li key={c.key} layout={animate} layoutId={c.key} transition={{duration: animate ? 0.35 : 0}} className={`ob-card ob-${c.tone}`}>
                  <Character project={c.project} pose={poseOf(c.tone)} animate={animate} />
                  <div><strong>{c.project}</strong>{c.verb} <time>{c.time}</time>{k === 'needs' ? <button type="button" className="oa-toggle" onClick={() => openHelper(c.key).then((ok) => setOpenErr(!ok)).catch(() => setOpenErr(true))}>{BOARD.open}</button> : null}</div>
                </motion.li>
              ))}</ul>
            )}
          </div>
        ))}
      </div></LayoutGroup>
      {state?.practice ? <p className="oa-line oa-grey">{practiceLine(state.practice)}</p> : null}
      {state?.away ? (
        <section className="ob-away" aria-label={BOARD.away}>
          <h2>{BOARD.away}</h2>
          <p>{state.away.sentence}{state.away.blocked ? ` ${state.away.blocked} ${BOARD.blocked}.` : ''}</p>
          {state.away.results.length ? <ul>{state.away.results.map((r, i) => <li key={i} className={`ob-card ob-${r.passed ? 'green' : 'red'}`}><strong>{r.project}</strong>{r.passed ? BOARD.passedWord : BOARD.notPassedWord}: {r.text} <time>{r.at.slice(11, 16)}</time></li>)}</ul> : null}
          {state.away.gaps.map((g, i) => <p key={i} className="oa-muted">{g}</p>)}
        </section>
      ) : null}
      {openErr ? <p role="alert" className="oa-error">{BOARD.openFailed}</p> : null}
      {b && b.quiet > 0 ? <p className="oa-muted">{b.quiet} {BOARD.quiet}</p> : null}
    </section>
  );
}
