// "Your Turn": the rail strip (one line) and the "This week" panel. Read only: it draws numbers the server computed from the rail's own records.
// A figure the server could not source arrives as null and is drawn as "not recorded": never 0, never a guess. Every value is checked here too.
export type StripData = {building: number | null; needYou: number | null; mapShipped: number | null; mapTotal: number | null; costToday: number | null};
export type FigureData = {now: number | null; before: number | null; source: string};
export type WeekData = {shipped: FigureData; problems: FigureData; stepIns: FigureData; typicalTime: FigureData; cost: FigureData};

const NOT = 'not recorded';
const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const count = (v: unknown): string => (ok(v) ? String(Math.round(v)) : NOT);
const dollars = (v: unknown): string => (ok(v) ? `$${v.toFixed(2)}` : NOT);
const span = (v: unknown): string => (!ok(v) ? NOT : v < 60 ? `${Math.round(v)} s` : v < 3600 ? `${Math.round(v / 60)} min` : `${(v / 3600).toFixed(1)} h`);

export function RailStrip({s}: {s: StripData}) {
  const pieces = ok(s.mapShipped) && ok(s.mapTotal) ? ` · ${s.mapShipped} of ${s.mapTotal} pieces shipped with proof` : '';
  return <p className="strip" data-testid="rail-strip">{`${count(s.building)} building · ${count(s.needYou)} need you${pieces} · AI work today: ${dollars(s.costToday)}`}</p>;
}

const ROWS: [keyof WeekData, string, (v: unknown) => string][] = [
  ['shipped', 'Pieces shipped with proof', count], ['problems', 'Problems found after shipping', count], ['stepIns', 'Times you had to step in', count],
  ['typicalTime', 'Typical start-to-checked time', span], ['cost', 'AI work (estimate)', dollars],
];

export function WeekPanel({w}: {w: WeekData}) {
  return (
    <section className="week" data-testid="week-panel">
      <h2>This week</h2>
      <div className="weekrows">
        {ROWS.map(([key, label, fmt]) => (
          <div className="wk" key={key} data-testid="week-row" title={typeof w[key]?.source === 'string' ? w[key].source.slice(0, 200) : undefined}>
            <span className="wl">{label}</span>
            <span className={ok(w[key]?.now) ? 'wn' : 'wn na'} data-testid="week-now">{fmt(w[key]?.now)}</span>
            <span className="wb" data-testid="week-before">{`last week: ${fmt(w[key]?.before)}`}</span>
          </div>
        ))}
      </div>
      <p className="quiet" data-testid="week-note">Every number comes from the rail's records only. "not recorded" means nothing writes it yet.</p>
    </section>
  );
}
