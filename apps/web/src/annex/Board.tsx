import {useEffect, useRef, useState} from 'react';
import {LayoutGroup, motion, useReducedMotion} from 'motion/react';
import {Character} from './Character.tsx';
import {chimeDue, poseOf, shouldAnimate} from '../../../observatory/office-motion.ts';
import type {OfficeState} from '../../../observatory/office-reducer.ts';
import type {Away, Practice} from '../../../observatory/office-away.ts';
import {practiceLine} from '../../../observatory/office-away.ts';
import {boardOf, freshness, type Card} from '../../../observatory/office-board.ts';
import {BOARD} from './copy.ts';

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
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Board({onMore, moreLabel}: {onMore: () => void; moreLabel: string}) {
  const [state, setState] = useState<(OfficeState & {away?: Away; practice?: Practice | null}) | null>(null);
  const [lastMsg, setLastMsg] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [connected, setConnected] = useState(false);
  const [openErr, setOpenErr] = useState(false);
  const [sound, setSound] = useState(false); // off by default
  const reduce = useReducedMotion() ?? false;
  const prevNeeds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const t = token();
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
  const b = state ? boardOf(state) : null;
  const fresh = freshness(connected, tick - lastMsg, state?.freshness.lastEventAt ?? null);
  const animate = shouldAnimate(state?.freshness.ageSeconds ?? null, reduce);
  const lanes: [string, keyof typeof BOARD.cols, Card[], string][] = b ? [['needs', 'needs', b.needs, ''], ['working', 'working', b.working, ''], ['checking', 'checking', b.checking, ''], ['done', 'done', b.done, ''], ...(b.failed.length ? [['failed', 'failed', b.failed, ''] as [string, keyof typeof BOARD.cols, Card[], string]] : [])] : [];
  return (
    <section aria-label="Board">
      <div className="ob-bar" role="toolbar" aria-label={BOARD.tools}>
        <button type="button" className="ob-tool" onClick={onMore}><span aria-hidden="true">▦</span> {moreLabel}</button>
        <button type="button" className="ob-tool" aria-pressed={sound} onClick={() => setSound(!sound)}><span aria-hidden="true">{sound ? '♪' : '✕'}</span> {sound ? BOARD.soundOn : BOARD.soundOff}</button>
      </div>
      <div className="ob-top">
        <div className="ob-status">
          <span className={`ob-light ${b?.light ?? 'grey'}`} aria-hidden="true" />
          <div>
            <p className={`ob-fresh${fresh.startsWith('LIVE') ? '' : ' off'}`} role="status">{fresh}</p>
            {b ? <><h1 className="ob-h1">{b.sentence}</h1>{b.sub ? <p className="ob-sub">{b.sub}</p> : null}</> : null}
          </div>
        </div>
        {b ? <div className="ob-chips">
          <span className="ob-chip"><b>{b.done.filter((c) => c.tone === 'green').length}</b> {BOARD.savedToday}</span>
          {state?.practice ? <span className="ob-chip">{practiceLine(state.practice)}</span> : null}
        </div> : null}
      </div>
      <LayoutGroup><div className="ob-cols">
        {lanes.map(([cls, k, cards]) => (
          <div className={`ob-col ob-${cls}`} key={k}>
            <h2>{BOARD.cols[k]} <span className="n">{plural(cards.length, 'helper', 'helpers')}</span></h2>
            {cards.length === 0 ? <p className="ob-empty">{k === 'needs' ? BOARD.emptyNeeds : BOARD.empty}</p> : (
              <ul>{cards.map((c, i) => {
                const big = k === 'needs' && i === 0;
                return (
                  <motion.li key={c.key} layout={animate} layoutId={c.key} transition={{duration: animate ? 0.35 : 0}} className={`ob-card ${c.tone}${big ? ' big' : ''}`}>
                    <Character project={c.project} pose={poseOf(c.tone)} animate={animate} big={big} checker={k === 'checking'} />
                    <div><p className="ob-who">{c.label}</p><div className="ob-bubble">{c.verb}</div>
                      {c.button ? <button type="button" className={`ob-btn${c.button === 'see' ? ' see' : ''}`} onClick={() => openHelper(c.key).then((ok) => setOpenErr(!ok)).catch(() => setOpenErr(true))}>{c.button === 'see' ? BOARD.see : `${BOARD.open} ${c.label}`}</button> : null}
                      <p className="ob-when"><time title={c.at}>{c.time}</time></p></div>
                  </motion.li>
                );
              })}</ul>
            )}
            {k === 'working' && b && b.quietLines.map((q) => <p key={q} className="ob-more">{q}</p>)}
          </div>
        ))}
      </div></LayoutGroup>
      {state?.away ? (
        <section className="ob-away" aria-label={BOARD.away}>
          <h2>{BOARD.away}</h2>
          <div className="ob-note"><Character project="Lab" pose="passed" animate={false} checker /><div>{state.away.sentence}{state.away.blocked ? ` ${state.away.blocked} ${BOARD.blocked}.` : ''}</div></div>
          {state.away.results.map((r, i) => <div key={i} className="ob-note"><Character project={r.project} pose={r.passed ? 'passed' : 'stuck'} animate={false} /><div><strong>{r.project}</strong> {r.passed ? BOARD.passedWord : BOARD.notPassedWord}: {r.text} <time>{r.at.slice(11, 16)}</time></div></div>)}
          {state.away.gaps.map((g, i) => <div key={i} className="ob-note"><div>{g}</div></div>)}
        </section>
      ) : null}
      {openErr ? <p role="alert" className="oa-error">{BOARD.openFailed}</p> : null}
    </section>
  );
}
