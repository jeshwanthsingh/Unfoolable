import type {Snapshot} from '../../../observatory/office-data.ts';
import {FLOOR} from './copy.ts';

// A drawn picture of the same facts as the panels. Reuses the existing builder and checker sprites (48px frames).
// Solid = recorded. Faded + the word "maybe" = guessed. Nothing moves; no news means no change.
const SPOT: Record<string, {x: number; label: string}> = {
  bookshelf: {x: 60, label: FLOOR.bookshelf}, workbench: {x: 220, label: FLOOR.workbench}, terminal: {x: 380, label: FLOOR.terminal},
  globe: {x: 540, label: FLOOR.globe}, checker: {x: 700, label: FLOOR.checker}
};
const ROW = {bookshelf: 6, workbench: 5, terminal: 5, globe: 5, checker: 5, desk: 5} as const;

function Sprite({x, y, row, sheet, faded}: {x: number; y: number; row: number; sheet: string; faded?: boolean}) {
  return (
    <svg x={x} y={y} width={72} height={72} viewBox={`0 ${row * 48} 48 48`} opacity={faded ? 0.45 : 1}>
      <image href={sheet} width={192} height={576} style={{imageRendering: 'pixelated'}} />
    </svg>
  );
}

const wrap = (t: string, n = 19): string[] => {
  const out: string[] = [];
  for (const w of t.split(' ')) { const l = out[out.length - 1]; if (l !== undefined && (l + ' ' + w).length <= n) out[out.length - 1] = l + ' ' + w; else out.push(w); }
  return out.slice(0, 3);
};

export function Floor({snap}: {snap: Snapshot}) {
  const {desks, guard, checker, staff} = snap.floor;
  return (
    <figure className="oa-floor">
      <svg viewBox="0 0 960 445" role="img" aria-label={FLOOR.alt}>
        <rect width="960" height="445" fill="var(--uf-well)" />
        {Object.entries(SPOT).map(([k, s]) => (
          <g key={k}>
            <rect x={s.x - 8} y={16} width={120} height={56} rx={6} fill="var(--uf-surface)" stroke="var(--uf-border)" />
            <text x={s.x + 52} y={50} textAnchor="middle" fontSize="15" fill="var(--uf-text)">{s.label}</text>
          </g>
        ))}
        <g>
          <rect x={850} y={16} width={90} height={150} rx={6} fill="var(--uf-surface)" stroke="var(--uf-border)" />
          <text x={895} y={40} textAnchor="middle" fontSize="14" fill="var(--uf-text)">{FLOOR.door}</text>
          <text x={895} y={95} textAnchor="middle" fontSize="40" fill="var(--uf-text)">{guard.count}</text>
          {(guard.count ? [FLOOR.guardNo, `${FLOOR.guardLast} ${guard.last}`] : wrap(FLOOR.guardNone, 14)).map((t, k) => <text key={k} x={895} y={118 + k * 15} textAnchor="middle" fontSize="12" fill="var(--uf-muted)">{t}</text>)}
        </g>
        {desks.map((d, i) => {
          const home = {x: 30 + i * 135, y: 170}, stand = SPOT[d.station];
          const at = d.state === 'working' || d.state === 'maybe' ? {x: (stand?.x ?? home.x) + 10, y: 70} : home;
          const mark = d.state === 'needs' ? '!' : d.state === 'maybe' ? '?' : d.state === 'working' ? '✓' : d.state === 'home' ? '⌂' : '…';
          return (
            <g key={d.project}>
              <rect x={home.x} y={home.y + 74} width={118} height={30} rx={4} fill="var(--uf-surface)" stroke="var(--uf-border)" />
              {d.state !== 'home' && <Sprite x={at.x + (at === home ? 23 : 0)} y={at.y} row={d.state === 'needs' ? 10 : d.state === 'quiet' ? 0 : ROW[d.station]} sheet="./builder.png" faded={d.state === 'maybe' || d.state === 'quiet'} />}
              <text x={home.x + 59} y={home.y + 94} textAnchor="middle" fontSize="12" fill="var(--uf-text)">{mark} {d.project.length > 14 ? d.project.slice(0, 13) + '\u2026' : d.project}</text>
              {wrap(d.word).map((t, k) => <text key={k} x={home.x + 59} y={home.y + 120 + k * 13} textAnchor="middle" fontSize="11" fill="var(--uf-muted)">{t}</text>)}
            </g>
          );
        })}
        {checker && (
          <g>
            <Sprite x={SPOT.checker!.x + 44} y={70} row={ROW.checker} sheet="./builder.png" faded={!checker.fresh} />
            <text x={SPOT.checker!.x + 52} y={160} textAnchor="middle" fontSize="11" fill="var(--uf-muted)">{checker.fresh ? FLOOR.checkerAt : FLOOR.checkerEarlier} {checker.at}</text>
          </g>
        )}
        {staff.map((t, k) => (
          <g key={k}>
            <Sprite x={700 + k * 130} y={322} row={0} sheet="./builder.png" />
            {wrap(`${FLOOR.staff} ${t}`, 20).map((w, j) => <text key={j} x={736 + k * 130} y={402 + j * 13} textAnchor="middle" fontSize="11" fill="var(--uf-muted)">{w}</text>)}
          </g>
        ))}
        {[snap.mail.chat && `${FLOOR.mailChat} ${snap.mail.chat}`, snap.mail.code && `${FLOOR.mailCode} ${snap.mail.code}`].filter(Boolean).map((t, k) => (
          <g key={k}>
            <rect x={30 + k * 300} y={304} width={22} height={15} fill="var(--uf-surface)" stroke="var(--uf-text)" />
            <path d={`M${30 + k * 300} 304 l11 8 l11 -8`} fill="none" stroke="var(--uf-text)" />
            <text x={58 + k * 300} y={316} fontSize="12" fill="var(--uf-text)">{t}</text>
          </g>
        ))}
      </svg>
      <figcaption>{FLOOR.legend}</figcaption>
    </figure>
  );
}
