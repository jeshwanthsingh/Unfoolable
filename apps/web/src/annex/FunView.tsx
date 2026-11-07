import {useFeed} from './feed.ts';
import {openHelper} from './open.ts';
import {useEffect, useMemo, useRef, useState} from 'react';
import {spriteCanvas, type SpriteMood} from './sprites.ts';
import {DIVIDERS, GUARD_AT, PLACE, ROOM, RUGS, SLOTS, SPRITE, WALLS, WINDOW, ZONES} from './room-map.ts';
import {FEED, BOARD, FUN} from './copy.ts';
import {boardOf, freshness, type Card} from '../../../observatory/office-board.ts';
import {shouldAnimate} from '../../../observatory/office-motion.ts';
import {sceneOf, type Figure, type Scene, type SeatMap} from '../../../observatory/office-scene.ts';
import {AWAY_LINES, type Away} from '../../../observatory/office-away.ts';
import type {OfficeState} from '../../../observatory/office-reducer.ts';

// The pixel office: the SAME state and the same board model as the simple view, drawn as a room. Nothing here is a fact the board does not have.
// Pictures come from a local licensed folder through the server's /art route; they are never part of the repo.
type Live = OfficeState & {away?: Away; seats?: SeatMap}; // seats: where the SERVER put every helper (never re-derived here)
const MOOD: Record<string, SpriteMood> = {'needs you': 'wave', working: 'focus', checking: 'focus', done: 'happy', "didn't pass": 'dizzy'};
const pct = (v: number, of: number) => `${(v / of) * 100}%`;


export function FunView({toolbar}: {toolbar?: React.ReactNode}) {
  const {state, connected, lastMsg, tick, attempt, snapshot, expired} = useFeed<Live>();
  const [picked, setPicked] = useState<string | null>(null), [openErr, setOpenErr] = useState('');
  const [scale, setScale] = useState(1), top = useRef<HTMLElement>(null); // the room is drawn at exactly 640 px wide, or exactly 320 when there is no room for that: never a fraction
  useEffect(() => { const el = top.current; if (!el) return; const f = () => setScale(el.clientWidth >= ROOM.w + 6 ? 1 : 0.5); f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect(); }, []);
  const host = useRef<HTMLDivElement>(null), draw = useRef<((s: Scene, animate: boolean) => void) | null>(null);
  const scene = useMemo(() => (state ? sceneOf(state) : null), [state]);
  const board = useMemo(() => (state ? boardOf(state) : null), [state]);
  const animate = shouldAnimate(state?.freshness.ageSeconds ?? null, matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => { // the room: drawn once, then only moved
    let gone = false, destroy = () => {};
    void (async () => {
      const PIXI = await import('pixi.js'); await import('pixi.js/unsafe-eval');
      const {Application, Container, Sprite, Texture, Rectangle, Graphics, Assets} = PIXI;
      const app = new Application(); await app.init({width: ROOM.w, height: ROOM.h, antialias: false, background: 0xd9d5e6, preference: 'webgl', preserveDrawingBuffer: true});
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
      const sprites = new Map<string, {s: InstanceType<typeof Sprite>; tx: number; ty: number; phase: 'steady' | 'out' | 'in'; frame: number}>(), cache = new Map<string, InstanceType<typeof Texture>>();
      // Our own pixel characters (sprites.ts), drawn at 2x like the floor: one sprite pixel is one 2 x 2 block, never blurred.
      const tex = (color: string, mood: SpriteMood, hat: number, frame: number) => {
        const k = `${color}|${mood}|${hat}|${frame}`;
        if (!cache.has(k)) { const t = Texture.from(spriteCanvas(color, mood, hat, frame)); t.source.scaleMode = 'nearest'; cache.set(k, t); }
        return cache.get(k)!;
      };
      // No gliding across the floor: a figure that changes spot fades out where it stood, then fades in at the new spot. Nothing else ever moves.
      app.ticker.add(() => { for (const f of sprites.values()) {
        if (f.phase === 'out') { f.s.alpha = Math.max(0, f.s.alpha - 0.14); if (f.s.alpha === 0) { f.s.position.set(f.tx, f.ty); f.phase = 'in'; } }
        else if (f.phase === 'in') { f.s.alpha = Math.min(1, f.s.alpha + 0.14); if (f.s.alpha === 1) f.phase = 'steady'; }
      } });
      draw.current = (sc, anim) => {
        const keep = new Set<string>();
        const place = (key: string, at: readonly [number, number], color: string, mood: SpriteMood, hat: number) => {
          keep.add(key);
          let f = sprites.get(key);
          const frame = f && anim ? 1 - f.frame : (f?.frame ?? 0); // it blinks when news arrives (this runs only when the state changed), never on a timer
          const t = tex(color, mood, hat, frame);
          if (!f) { const s = new Sprite(t); s.anchor.set(0.5, 1); s.scale.set(2); s.position.set(at[0], at[1]); layer.addChild(s); f = {s, tx: at[0], ty: at[1], phase: 'steady', frame}; sprites.set(key, f); }
          f.s.texture = t; f.frame = frame;
          if (f.tx !== at[0] || f.ty !== at[1]) { f.tx = at[0]; f.ty = at[1]; if (anim) { if (f.phase === 'steady') f.phase = 'out'; } else { f.s.position.set(at[0], at[1]); f.s.alpha = 1; f.phase = 'steady'; } } // reduced motion or a frozen log: the new place at once
        };
        for (const f of sc.figures) { const at = SLOTS[f.spot][f.slot]; if (at) place(f.key, at, f.tint, MOOD[f.word] ?? 'focus', f.hat); }
        if (sc.guard) place('guard', GUARD_AT, '#7A5AE0', 'focus', 2);
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
  const sel = scene?.figures.find((f) => f.key === picked) ?? null, selCard = board ? [...board.needs, ...board.working, ...board.checking, ...board.done, ...board.failed].find((c) => c.key === picked) : undefined;
  const at = (f: Figure) => SLOTS[f.spot][f.slot];
  // Tags that would land on each other (closer than 150 screen px side by side) are lifted one row (64 screen px) so no two name tags ever overlap; the room may be drawn at half size, so distances and the row step are counted in screen pixels.
  const step = 64 / scale, lifts = new Map<string, number>(), placed: {x: number; y: number}[] = [];
  for (const f of [...(scene?.figures ?? [])].sort((a, b) => (at(a)?.[0] ?? 0) - (at(b)?.[0] ?? 0))) {
    const p = at(f); if (!p) continue;
    let lift = 0; while (placed.some((q) => Math.abs(q.x - p[0]) * scale < 150 && Math.abs(q.y - (p[1] - lift * step)) * scale < 64)) lift++;
    placed.push({x: p[0], y: p[1] - lift * step}); lifts.set(f.key, lift);
  }
  const tintOf = (key: string) => scene?.figures.find((f) => f.key === key)?.tint ?? '#9AA8C0';
  return (
    <section className="fv" aria-label={FUN.office} ref={top}>
      <div className="fv-head"><p className={`ob-fresh${fresh.startsWith('LIVE') ? '' : ' off'}`} role="status">{fresh}</p>{toolbar}</div>
      {!state && attempt ? <><p className={expired ? 'ob-feedold' : 'ob-feedoff'} role="status">{expired ? FEED.old : FEED.off(attempt)}</p>{snapshot ? <h1 className="ob-h1">{snapshot}</h1> : null}</> : null}
      {board ? <><h1 className="ob-h1">{board.sentence}</h1>{board.sub ? <p className="ob-sub">{board.sub}</p> : null}</> : null}
      <div className="fv-row">
        <div className="fv-room" role="group" aria-label={FUN.alt} style={{width: ROOM.w * scale + 6, height: ROOM.h * scale + 6}}>
          <div ref={host} className="fv-canvas" />
          {ZONES.map(([t, x, y]) => <span key={t} className="fv-zone" style={{left: pct(x, ROOM.w), top: pct(y, ROOM.h)}}>{t}</span>)}
          {scene?.figures.map((f) => { const p = at(f); return p ? (
            <div key={`${f.key}@${f.spot}${f.slot}`} className="fv-spot" style={{left: pct(Math.min(Math.max(p[0], 80), ROOM.w - 80), ROOM.w), top: pct(p[1] - 64 - (lifts.get(f.key) ?? 0) * step, ROOM.h)}}>
              <button type="button" className={`fv-who${f.loud ? ' loud' : ''}${f.word === "didn't pass" ? ' bad' : ''}`} onClick={() => setPicked(f.key)}><b>{f.label}</b>{f.loud ? f.caption : f.word}</button>
              <div className="fv-face" aria-hidden="true" onClick={() => setPicked(f.key)} />{/* the character itself is clickable too (mouse); the tag button is the keyboard way in */}
            </div>) : null; })}
          {scene?.guard ? <div className="fv-spot" style={{left: pct(GUARD_AT[0] + 40, ROOM.w), top: pct(GUARD_AT[1] - 64, ROOM.h)}}><span className="fv-who"><b>Guard</b>{FUN.guardSays} {scene.guard.count}</span></div> : null}
        </div>
        <div className="fv-side">
          {openErr && !sel ? <p role="alert" className="oa-error">{openErr}</p> : null}
          {cards.map(([name, list]) => (
            <section key={name} className={`fv-box${name === BOARD.cols.needs && list.length ? ' amber' : ''}`}><h2>{name} ({list.length})</h2>
              {list.length ? <ul>{list.map((c) => <li key={c.key}><button type="button" className="fv-li" onClick={() => setPicked(c.key)}><span><i className="fv-dot" style={{background: tintOf(c.key)}} aria-hidden="true" />{c.label}: {c.verb}</span><time>{c.time}</time></button><button type="button" className="ob-btn see fv-open" onClick={() => openHelper(c.key).then(setOpenErr).catch(() => setOpenErr(BOARD.openFailed))}>{c.button === 'see' ? BOARD.see : BOARD.open}<span className="vh"> {c.label}</span></button></li>)}</ul> : <p className="oa-muted">{BOARD.empty}</p>}
            </section>))}
          {state?.away ? <section className="fv-box"><h2>{BOARD.away}</h2><p>{state.away.sentence}</p>{state.away.lines.slice(0, AWAY_LINES).map((l) => <p key={l.project}>{l.text}</p>)}{state.away.results.length > 0 ? <details className="ob-all"><summary>{BOARD.showAll}</summary><ul>{state.away.results.map((r, i) => <li key={i}>{r.project} {r.passed ? BOARD.passedWord : BOARD.notPassedWord}: {r.text}</li>)}</ul></details> : null}</section> : null}
          {board && board.quietLines.length ? <p className="oa-muted">{fresh.startsWith('LIVE') ? `${board.quietLines.join('. ')}.` : BOARD.quietUnknown}</p> : null}
          <p className="oa-muted">{FUN.hint}</p>
          <p className="fv-credit">{FUN.credit}</p>
        </div>
        {sel && selCard ? (
          <aside className="fv-panel" aria-label={sel.label}>
            <button type="button" className="ob-tool" onClick={() => setPicked(null)}>{FUN.close}</button>
            <h2>{sel.label}</h2><p className="fv-badge">{sel.word}</p>
            <h3>{sel.loud ? FUN.asked : FUN.status}</h3>
            <p className="fv-ask">{sel.word === 'needs you' ? FUN.wantsOk : sel.tone === 'red' && selCard.button === 'open' ? FUN.stuck : selCard.verb}</p>
            {selCard.button === 'see' ? (() => { const g = state?.helpers.find((h) => h.sid === sel.key)?.gate; return <>{g?.command ? <p className="fv-detail">{FUN.failedCommand} <code>{g.command}</code></p> : null}{g?.firstFailed ? <p className="fv-detail">{FUN.failedTest} {g.firstFailed}</p> : null}</>; })() : null}
            <p className="oa-muted">{selCard.time}</p>
            {selCard.button ? <button type="button" className="ob-btn" onClick={() => openHelper(sel.key).then(setOpenErr).catch(() => setOpenErr(BOARD.openFailed))}>{selCard.button === 'see' ? BOARD.see : `${BOARD.open} ${sel.label}`}</button> : null}
            {openErr ? <p role="alert" className="oa-error">{openErr}</p> : null}
          </aside>) : null}
      </div>
    </section>
  );
}
