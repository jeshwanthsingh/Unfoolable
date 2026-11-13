// "Your Turn" Map: one project drawn as parts and pieces. Read only: it only GETs /api/map and shows what comes back.
// Every word of a piece comes from a hand-written vault file (agent-writable), so it is only ever rendered as plain text.
// A piece's state is computed by the server from the rail's own records; only "plan" pieces come from the file alone.
import {useEffect, useState} from 'react';
import './map.css';

type Piece = {id: string; name: string; plain: string; model: string; state: string; from: string; isPlan: boolean; card?: string; needs: string[]; blockedBy: string[]};
type Part = {id: string; name: string; plain: string; pieces: Piece[]};
type MapAnswer = {project: string; projects: string[]; map: {parts: Part[]} | null; notLive: string[]};
type View = {data: MapAnswer | null; down: boolean; old: boolean};

const str = (v: unknown): boolean => typeof v === 'string';
const strs = (v: unknown): boolean => Array.isArray(v) && v.every(str);
// The answer must have the shape the page renders: an odd answer must not blank the page.
const shape = (d: unknown): d is MapAnswer => {
  const x = d as MapAnswer | null;
  if (!x || typeof x !== 'object' || !str(x.project) || !strs(x.projects) || !strs(x.notLive)) return false;
  return x.map === null || (!!x.map && Array.isArray(x.map.parts) && x.map.parts.every((p) => !!p && str(p.id) && str(p.name) && str(p.plain) && Array.isArray(p.pieces)
    && p.pieces.every((q) => !!q && str(q.id) && str(q.name) && str(q.plain) && str(q.model) && str(q.state) && str(q.from) && typeof q.isPlan === 'boolean' && strs(q.needs) && strs(q.blockedBy))));
};

// The page does not know the project names yet: it asks once with a name nobody uses (the answer lists the maps), then asks for the first map.
async function ask(project: string): Promise<MapAnswer | 'old' | null> {
  const r = await fetch(`/api/map?project=${encodeURIComponent(project)}`, {credentials: 'same-origin', signal: AbortSignal.timeout(10000)});
  if (r.status === 401) return 'old';
  const data: unknown = r.ok ? await r.json() : null;
  return shape(data) ? data : null;
}

function useMap(): View {
  const [view, setView] = useState<View>({data: null, down: false, old: false});
  useEffect(() => {
    let stop = false, timer = 0;
    const tick = async (): Promise<void> => {
      try {
        let a = await ask('projects');
        if (a !== 'old' && a !== null && a.projects[0] && a.projects[0] !== 'projects') a = await ask(a.projects[0]);
        if (stop) return;
        if (a === 'old') { setView({data: null, down: false, old: true}); return; }
        if (a === null) throw new Error('bad answer');
        setView({data: a, down: false, old: false});
      } catch {
        if (!stop) setView((v) => ({...v, down: true}));
      }
      if (!stop) timer = window.setTimeout(() => void tick(), 10000);
    };
    void tick();
    return () => { stop = true; window.clearTimeout(timer); };
  }, []);
  return view;
}

const chip = (state: string): string => (state === 'Shipped' || state === 'Built' ? 'chip ok' : state === 'Waiting for your approval' ? 'chip wait' : state === 'not recorded' ? 'chip na' : 'chip');

function PieceCard({p}: {p: Piece}) {
  return (
    <article className="piece" data-testid="map-piece">
      <h4>{p.name}</h4>
      <p className="chips"><span className={chip(p.state)} data-testid="piece-state">{p.state}</span><span className="chip model">{p.model}</span>{p.isPlan && <span className="chip plan" data-testid="piece-plan">plan</span>}</p>
      <p className="plain">{p.plain}</p>
      <p className="from">from: {p.from}</p>
      {p.isPlan && <p className="from">no card yet</p>}
      {p.needs.length > 0 && <p className="needs">needs: {p.needs.join(', ')}</p>}
      {p.blockedBy.length > 0 && <p className="blocked">blocked by: {p.blockedBy.join(', ')}</p>}
    </article>
  );
}

export function MapView() {
  const {data, down, old} = useMap();
  if (old) return <main><div className="oldlink" data-testid="old-link"><h1>This link is old</h1><p>The page was restarted. Open a fresh link the same way you opened this one.</p></div></main>;
  if (!data) return <main>{down ? <p className="notlive" role="status">Not live: can't reach this page's server, trying again.</p> : <p className="quiet">Looking at the map…</p>}</main>;
  const unreadable = data.notLive.length > 0;
  return (
    <main className="mapwrap">
      {down && <p className="notlive" role="status">Not live: can't reach this page's server. What you see may be old.</p>}
      {unreadable && <p className="notlive" role="status">Not live: the map file cannot be read.</p>}
      {!unreadable && (data.map === null || data.map.parts.length === 0) && (
        <article className="card" data-testid="map-empty"><h1>No map yet</h1><p>A map is a plain file in the vault, <code>maps/&lt;project&gt;.json</code>. Nothing is drawn until one exists.</p></article>
      )}
      {data.map !== null && !unreadable && data.map.parts.length > 0 && (
        <>
          <h1 className="maptitle">Map: {data.project}</h1>
          <p className="quiet">Each state below comes from the rail's own records. Lines marked "plan" come only from the map file.</p>
          {data.projects.length > 1 && <p className="quiet">Other maps (not shown yet): {data.projects.filter((n) => n !== data.project).join(', ')}</p>}
          <div className="parts">
            {data.map.parts.map((pt) => (
              <section className="part" key={pt.id} data-testid="map-part" aria-label={pt.name}>
                <h3>{pt.name}</h3>
                <p className="plain">{pt.plain}</p>
                {pt.pieces.map((p) => <PieceCard key={p.id} p={p} />)}
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
