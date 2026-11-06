import {useEffect, useMemo, useRef, useState} from 'react';
import {figure} from './Character.tsx';
import {DIVIDERS, GUARD_AT, HARD_HAT, HATS, PLACE, ROOM, RUGS, SLOTS, SPRITE, WALLS, WINDOW, ZONES} from './room-map.ts';
import {BOARD, FUN} from './copy.ts';
import {boardOf, freshness, type Card} from '../../../observatory/office-board.ts';
import {shouldAnimate} from '../../../observatory/office-motion.ts';
import {sceneOf, type Figure, type Scene} from '../../../observatory/office-scene.ts';
import {AWAY_LINES, type Away} from '../../../observatory/office-away.ts';
import type {OfficeState} from '../../../observatory/office-reducer.ts';

// The pixel office: the SAME state and the same board model as the simple view, drawn as a room. Nothing here is a fact the board does not have.
// Pictures come from a local licensed folder through the server's /art route; they are never part of the repo.
type Live = OfficeState & {away?: Away};
const token = () => new URLSearchParams(location.hash.slice(1)).get('t') ?? '';
const MOOD = {'needs you': 'wave', working: 'focus', checking: 'focus', done: 'happy', "didn't pass": 'dizzy'} as const;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

async function openHelper(id: string): Promise<boolean> {
  const call = (resume: boolean) => fetch('/open', {method: 'POST', headers: {'x-office-token': token(), 'content-type': 'application/json'}, body: JSON.stringify({id, resume})});
  let r = await call(false);
  if (r.status === 409 && window.confirm(BOARD.confirm)) r = await call(true);
  return r.ok;
}

export function FunView({toolbar}: {toolbar?: React.ReactNode}) {
  const [state, setState] = useState<Live | null>(null);
  const [lastMsg, setLastMsg] = useState(0), [tick, setTick] = useState(Date.now()), [connected, setConnected] = useState(false);
  const [picked, setPicked] = useState<string | null>(null), [openErr, setOpenErr] = useState(false);
  const host = useRef<HTMLDivElement>(null), draw = useRef<((s: Scene, animate: boolean) => void) | null>(null);
  useEffect(() => {
    const t = token(); let es: EventSource | null = null, live = true;
    fetch(`/k/${t}`, {credentials: 'same-origin'}).then(() => { // the key becomes a same-site cookie first (EventSource cannot send headers)
      if (!live) return;
      es = new EventSource('/events');
      es.addEventListener('state', (e) => { setState(JSON.parse((e as MessageEvent).data) as Live); setLastMsg(Date.now()); setConnected(true); });
      es.onerror = () => setConnected(false);
    }).catch(() => setConnected(false));
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => { live = false; es?.close(); clearInterval(id); };
  }, []);
  const scene = useMemo(() => (state ? sceneOf(state) : null), [state]);
  const board = useMemo(() => (state ? boardOf(state) : null), [state]);
  const animate = shouldAnimate(state?.freshness.ageSeconds ?? null, matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => { // the room: drawn once, then only moved
    let gone = false, destroy = () => {};
    void (async () => {
      const PIXI = await import('pixi.js'); await import('pixi.js/unsafe-eval');
      const {Application, Container, Sprite, Texture, Rectangle, Graphics, Assets} = PIXI;
      const app = new Application(); await app.init({width: ROOM.w, height: ROOM.h, antialias: false, background: 0xd9d5e6, preference: 'webgl'});
      if (gone) { app.destroy(true); return; }
      host.current?.append(app.canvas); app.canvas.setAttribute('aria-hidden', 'true');
      Assets.setPreferences({preferWorkers: false}); // the page's CSP does not allow blob workers
      const sheet = await Assets.load('/art/office.png'); sheet.source.scaleMode = 'nearest';
      const floor = new Graphics().rect(0, 0, ROOM.w, ROOM.h).fill(0xcfcadd).rect(0, 0, ROOM.w, 92).fill(0x8d84a6).rect(0, 92, ROOM.w, 6).fill(0x6f6688);
      for (let x = 0; x < ROOM.w; x += 64) for (let y = 98; y < ROOM.h; y += 64) floor.rect(x, y, 32, 32).fill(0xd6d1e3).rect(x + 32, y + 32, 32, 32).fill(0xd6d1e3);
      floor.rect(352, 480, 288, 224).fill(0xdbe7df).rect(0, 480, 320, 224).fill(0xe6dccf).rect(0, 380, 14, 92).fill(0x4a4263); // checker's office, lounge, the door
      for (const [x, y, w, h, c] of RUGS) floor.rect(x, y, w, h).fill(c);
      floor.rect(WINDOW[0], WINDOW[1], WINDOW[2], WINDOW[3]).fill(0xbfe3f4).stroke({width: 3, color: 0x4a4263}).rect(WINDOW[0] + 34, WINDOW[1], 3, WINDOW[3]).fill(0x4a4263);
      for (const [x, y, w, h] of WALLS) floor.rect(x, y, w, h).fill(0xf7f5fb).stroke({width: 2, color: 0x4a4263});
      for (const [x, y, w, h] of DIVIDERS) floor.rect(x, y, w, h).fill(0xe9e5f2).stroke({width: 2, color: 0x4a4263});
      app.stage.addChild(floor);
      for (const [name, x, y] of PLACE) { const r = SPRITE[name]; const s = new Sprite(new Texture({source: sheet.source, frame: new Rectangle(r.x, r.y, r.w, r.h)})); s.position.set(x, y); app.stage.addChild(s); }
      const layer = new Container(); app.stage.addChild(layer);
      const sprites = new Map<string, {s: InstanceType<typeof Sprite>; tx: number; ty: number}>(), cache = new Map<string, Promise<InstanceType<typeof Texture>>>();
      const tex = (color: string, mood: string, checker: boolean, hat: number) => {
        const k = `${color}|${mood}|${checker}|${hat}`;
        if (!cache.has(k)) cache.set(k, (async () => {
          const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 104" width="104" height="104">${hat >= 2 ? figure(color, mood as 'focus', false).replace(HARD_HAT, HATS[hat]!) : figure(color, mood as 'focus', checker)}</svg>`);
          await img.decode();
          const c = document.createElement('canvas'); c.width = c.height = 30; c.getContext('2d')!.drawImage(img, 0, 0, 30, 30); // small, then scaled up with nearest-neighbour: the pixel look
          const t = Texture.from(c); t.source.scaleMode = 'nearest'; return t;
        })());
        return cache.get(k)!;
      };
      app.ticker.add(() => { for (const f of sprites.values()) { f.s.x += (f.tx - f.s.x) * 0.2; f.s.y += (f.ty - f.s.y) * 0.2; } });
      draw.current = (sc, anim) => {
        const keep = new Set<string>();
        const place = (key: string, at: readonly [number, number], color: string, mood: string, checker: boolean, hat: number) => {
          keep.add(key);
          void tex(color, mood, checker, hat).then((t) => {
            let f = sprites.get(key);
            if (!f) { const s = new Sprite(t); s.anchor.set(0.5, 1); s.scale.set(2); s.position.set(at[0], at[1]); layer.addChild(s); f = {s, tx: at[0], ty: at[1]}; sprites.set(key, f); }
            f.s.texture = t; f.tx = at[0]; f.ty = at[1];
            if (!anim) f.s.position.set(at[0], at[1]); // frozen log or reduced motion: no walking
          });
        };
        for (const f of sc.figures) { const at = SLOTS[f.spot][f.slot]; if (at) place(f.key, at, f.tint, MOOD[f.word], f.role === 'checker', f.hat); }
        if (sc.guard) place('guard', GUARD_AT, '#7A5AE0', 'focus', false, 2);
        for (const [k, f] of sprites) if (!keep.has(k)) { layer.removeChild(f.s); sprites.delete(k); }
      };
      destroy = () => { draw.current = null; app.destroy(true, {children: true}); };
      if (gone) destroy();
    })().catch(() => { /* if the pictures fail to load the side list and the tags still tell everything */ });
    return () => { gone = true; destroy(); };
  }, []);
  useEffect(() => { if (scene) draw.current?.(scene, animate); }, [scene, animate]);

  const fresh = freshness(connected, tick - lastMsg, state?.freshness.lastEventAt ?? null);
  const cards = board ? ([[BOARD.cols.needs, board.needs], [BOARD.cols.working, board.working], [BOARD.cols.checking, board.checking], [BOARD.cols.done, board.done], ...(board.failed.length ? [[BOARD.cols.failed, board.failed]] : [])] as [string, Card[]][]) : [];
  const sel = scene?.figures.find((f) => f.key === picked) ?? null, selCard = board ? [...board.needs, ...board.working, ...board.checking, ...board.done].find((c) => c.key === picked) : undefined;
  const at = (f: Figure) => SLOTS[f.spot][f.slot];
  const tintOf = (key: string) => scene?.figures.find((f) => f.key === key)?.tint ?? '#9AA8C0';
  return (
    <section className="fv" aria-label={FUN.office}>
      <div className="fv-head"><p className={`ob-fresh${fresh.startsWith('LIVE') ? '' : ' off'}`} role="status">{fresh}</p>{toolbar}</div>
      {board ? <><h1 className="ob-h1">{board.sentence}</h1>{board.sub ? <p className="ob-sub">{board.sub}</p> : null}</> : null}
      <div className="fv-row">
        <div className="fv-room" role="group" aria-label={FUN.alt}>
          <div ref={host} className="fv-canvas" />
          {ZONES.map(([t, x, y]) => <span key={t} className="fv-zone" style={{left: pct(x, ROOM.w), top: pct(y, ROOM.h)}}>{t}</span>)}
          {scene?.figures.map((f) => { const p = at(f); return p ? (
            <div key={f.key} className="fv-spot" style={{left: pct(Math.min(Math.max(p[0], 80), ROOM.w - 80), ROOM.w), top: pct(p[1] - 64, ROOM.h)}}>
              <button type="button" className={`fv-who${f.loud ? ' loud' : ''}${f.word === "didn't pass" ? ' bad' : ''}`} onClick={() => setPicked(f.key)}><b>{f.label}</b>{f.loud ? f.caption : f.word}</button>
            </div>) : null; })}
          {scene?.guard ? <div className="fv-spot" style={{left: pct(GUARD_AT[0] + 40, ROOM.w), top: pct(GUARD_AT[1] - 64, ROOM.h)}}><span className="fv-who"><b>Guard</b>{FUN.guardSays} {scene.guard.count}</span></div> : null}
        </div>
        <div className="fv-side">
          {cards.map(([name, list]) => (
            <section key={name} className={`fv-box${name === BOARD.cols.needs && list.length ? ' amber' : ''}`}><h2>{name} ({list.length})</h2>
              {list.length ? <ul>{list.map((c) => <li key={c.key}><button type="button" className="fv-li" onClick={() => setPicked(c.key)}><span><i className="fv-dot" style={{background: tintOf(c.key)}} aria-hidden="true" />{c.label}: {c.verb}</span><time>{c.time}</time></button></li>)}</ul> : <p className="oa-muted">{BOARD.empty}</p>}
            </section>))}
          {state?.away ? <section className="fv-box"><h2>{BOARD.away}</h2><p>{state.away.sentence}</p>{state.away.lines.slice(0, AWAY_LINES).map((l) => <p key={l.project}>{l.text}</p>)}{state.away.results.length > 0 ? <details className="ob-all"><summary>{BOARD.showAll}</summary><ul>{state.away.results.map((r, i) => <li key={i}>{r.project} {r.passed ? BOARD.passedWord : BOARD.notPassedWord}: {r.text}</li>)}</ul></details> : null}</section> : null}
          {board && board.quietLines.length ? <p className="oa-muted">{board.quietLines.join('. ')}.</p> : null}
          <p className="oa-muted">{FUN.hint}</p>
          <p className="fv-credit">{FUN.credit}</p>
        </div>
        {sel && selCard ? (
          <aside className="fv-panel" aria-label={sel.label}>
            <button type="button" className="ob-tool" onClick={() => setPicked(null)}>{FUN.close}</button>
            <h2>{sel.label}</h2><p className="fv-badge">{sel.word}</p>
            <h3>{sel.loud ? FUN.asked : FUN.status}</h3>
            <p className="fv-ask">{sel.word === 'needs you' ? FUN.wantsOk : sel.tone === 'red' && selCard.button === 'open' ? FUN.stuck : selCard.verb}</p>
            <p className="oa-muted">{selCard.time}</p>
            {selCard.button ? <button type="button" className="ob-btn" onClick={() => openHelper(sel.key).then((ok) => setOpenErr(!ok)).catch(() => setOpenErr(true))}>{selCard.button === 'see' ? BOARD.see : `${BOARD.open} ${sel.label}`}</button> : null}
            {openErr ? <p role="alert" className="oa-error">{BOARD.openFailed}</p> : null}
          </aside>) : null}
      </div>
    </section>
  );
}
