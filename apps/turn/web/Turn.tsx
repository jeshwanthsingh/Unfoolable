// "Your Turn", slice 1: shows what the rail is waiting for, read only. Nothing on this page changes anything:
// no form, no POST. Everything it shows is text from rail files (written by agents), so it is only ever rendered as plain text.
import {useEffect, useState, type ReactElement, type ReactNode} from 'react';

type Pending = {name: string; repo: string; scope: string; approveLine: string | null};
type Ship = {repo: string; head: string; title?: string};
type Older = {name: string; repo: string};
type Receipt = {repo: string; shipped: boolean; title?: string; titleSource?: string; fields: Record<string, string>};
type Data = {at: string; notLive: string[]; pending: Pending[]; older: Older[]; settled: string[]; ships: Ship[]; receipts: Receipt[]};
type Feed = {data: Data | null; state: 'loading' | 'ok' | 'down' | 'old'; tries: number};

const base = (p: string): string => p.split('/').filter(Boolean).pop() ?? p;
const words = (n: string): string => { const t = n.replace(/[-_]+/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
const str = (v: unknown): boolean => typeof v === 'string';
const obj = (v: unknown): boolean => !!v && typeof v === 'object';
// The answer must have the shape the page renders: an odd record must not blank the page.
const shape = (d: unknown): d is Data => {
  const x = d as Data | null;
  return obj(x) && Array.isArray(x!.pending) && Array.isArray(x!.ships) && Array.isArray(x!.receipts) && Array.isArray(x!.notLive)
    && x!.notLive.every(str) && x!.pending.every((p) => obj(p) && str(p.name) && str(p.repo) && str(p.scope) && (p.approveLine === null || str(p.approveLine)))
    && Array.isArray(x!.older) && x!.older.every((o) => obj(o) && str(o.name) && str(o.repo)) && Array.isArray(x!.settled) && x!.settled.every(str)
    && x!.ships.every((s) => obj(s) && str(s.repo) && (s.title === undefined || str(s.title))) && x!.receipts.every((r) => obj(r) && str(r.repo) && (r.title === undefined || str(r.title)) && obj(r.fields) && typeof r.shipped === 'boolean');
};
const SAFE_LINE = /^~\/Projects\/proof-lab\/scripts\/approve-card [A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

// Asks /api/turn every 5 s. A failed ask retries with backoff (1 s, 2 s, 4 s ... 30 s) and counts the tries; a 401 means the link is old
// (the page restarted with a new key), which no retry can fix, so it stops.
function useFeed(): Feed {
  const [feed, setFeed] = useState<Feed>({data: null, state: 'loading', tries: 0});
  useEffect(() => {
    let stop = false, timer = 0, tries = 0;
    const tick = async (): Promise<void> => {
      try {
        const r = await fetch('/api/turn', {credentials: 'same-origin', signal: AbortSignal.timeout(10000)}); // a server that never answers counts as down
        if (stop) return;
        if (r.status === 401) { setFeed((f) => ({...f, state: 'old'})); return; }
        const data: unknown = r.ok ? await r.json() : null;
        if (stop) return;
        if (!shape(data)) throw new Error('bad answer');
        tries = 0;
        setFeed({data, state: 'ok', tries: 0});
        timer = window.setTimeout(() => void tick(), 5000);
      } catch {
        if (stop) return;
        tries += 1;
        setFeed((f) => ({...f, state: 'down', tries}));
        timer = window.setTimeout(() => void tick(), Math.min(30000, 1000 * 2 ** (tries - 1)));
      }
    };
    void tick();
    return () => { stop = true; window.clearTimeout(timer); };
  }, []);
  return feed;
}

function Seal({p}: {p: Pending}) {
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');
  const line = p.approveLine;
  // The server already sends a line only for a safe file name; the page checks again before it offers to copy.
  if (line === null || !SAFE_LINE.test(line)) return <p className="warn" data-testid="unsafe-name">This card's file name is not safe to paste into a terminal. Rename the file first.</p>;
  const copy = (): void => { void navigator.clipboard?.writeText(line).then(() => setCopied('yes'), () => setCopied('failed')); if (!navigator.clipboard) setCopied('failed'); };
  return (
    <div>
      <p className="say">Seal it yourself: run this line in your own Terminal, then type yes.</p>
      <div className="sealrow">
        <code data-testid="approve-line">{line}</code>
        <button type="button" className="btn" data-testid="copy-button" onClick={copy}>{copied === 'yes' ? 'Copied' : copied === 'failed' ? 'Could not copy: select the line' : 'Copy line'}</button>
      </div>
    </div>
  );
}

function Decision({pending, ship}: {pending?: Pending | undefined; ship?: Ship | undefined}) {
  if (pending) {
    return (
      <article className="card" data-testid="decision" aria-label="A decision for you">
        <p><span className="tag" data-testid="kind">APPROVE</span><span className="proj" data-testid="project">{base(pending.repo) || 'unknown project'}</span></p>
        <h1>{words(pending.name)}</h1>
        <dl>
          <div className="row"><dt>THE CARD SAYS</dt><dd data-testid="scope">{pending.scope || '(the card has no scope line)'}</dd></div>
          <div className="row"><dt>CARD FILE</dt><dd>{pending.name}.md</dd></div>
        </dl>
        <p className="ans" data-testid="cant-vouch">This is the card's own text. This page can't check that it is true: read it before you seal.</p>
        <Seal p={pending} />
      </article>
    );
  }
  const repo = ship?.repo ?? '';
  return (
    <article className="card" data-testid="decision" aria-label="A decision for you">
      <p><span className="tag" data-testid="kind">SHIP</span><span className="proj" data-testid="project">{base(repo)}</span></p>
      <h1>{ship?.title ? words(ship.title) : base(repo)} passed its last check</h1>
      <dl>
        <div className="row"><dt>WHAT HAPPENED</dt><dd>It passed its checks. It has not been shipped at this version.</dd></div>
        <div className="row"><dt>NEXT</dt><dd>In Claude Code, say /ship for this project. Each step after that needs your yes.</dd></div>
      </dl>
    </article>
  );
}

const LABELS: Record<string, string> = {
  'checks': 'Checks', 'tests written first': 'Written before the code', 'reviewer': 'Reviewer (P1 / P2 / P3)',
  'files touched': 'Files touched', 'started': 'Started', 'finished': 'Finished', 'tried by you': 'You tried it', 'proof': 'Proof beyond tests', 'cost': 'AI work (estimate)',
};

function ReceiptView({r}: {r?: Receipt | undefined}) {
  if (!r) return <div className="rc empty" data-testid="no-receipt"><p>No receipt yet</p><p>A receipt appears here once a piece has passed its checks.</p></div>;
  const seal = r.fields['seal'] ?? 'not recorded';
  return (
    <div className="rc" data-testid="receipt">
      <h3 data-testid="receipt-title">{r.title ? words(r.title) : base(r.repo)}</h3>
      <p className="c" data-testid="receipt-project">{base(r.repo)}</p>
      {r.title && r.titleSource !== 'job' && <p className="c" data-testid="receipt-title-note">The card now approved for this project. It may not be the card the last check ran under.</p>}
      <hr />
      <p className={r.shipped ? 'big' : 'big not'} data-testid="receipt-banner">{r.shipped ? 'Really done. Checked, not claimed.' : 'Checked. Not shipped yet.'}</p>
      <hr />
      {Object.entries(LABELS).map(([key, label]) => {
        const v = r.fields[key] ?? 'not recorded';
        const cls = v === 'not recorded' ? 'na' : key === 'reviewer' ? (v.startsWith('0 /') ? 'ok' : 'bad') : key === 'files touched' ? (v.includes('outside the card') ? 'bad' : '') : key === 'checks' ? 'ok' : '';
        return <div className="l" key={key} data-testid="receipt-row"><span>{label}</span><span className={cls}>{v}</span></div>;
      })}
      <hr />
      <p className="c">{seal === 'not recorded' ? 'no seal recorded' : `seal ${seal}…`}</p>
      <div className="bar" aria-hidden="true" />
    </div>
  );
}

export function Turn() {
  const {data, state, tries} = useFeed();
  const live = state === 'ok' && data !== null && data.notLive.length === 0;
  const clock = data ? new Date(data.at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '';
  const shell = (body: ReactNode): ReactElement => (
    <div className="page">
      <header className="top">
        <p className="brand">Your <i>Turn</i></p>
        <p className={live ? 'live' : 'live off'}><b aria-hidden="true" />{live ? `Live · checked ${clock}` : 'Not live'}</p>
      </header>
      {body}
    </div>
  );
  const banner = state === 'down'
    ? `Not live: can't reach this page's server, trying again (${tries}).`
    : data && data.notLive.length > 0 ? `Not live: can't read ${data.notLive.join(', ')}. What you see may be old.` : '';
  if (state === 'old') {
    return shell(<main><div className="oldlink" data-testid="old-link"><h1>This link is old</h1><p>The page was restarted. Open a fresh link the same way you opened this one.</p></div></main>);
  }
  if (!data) {
    return shell(<main>{banner ? <p className="notlive" role="status" data-testid="not-live">{banner}</p> : <p className="quiet">Looking at the rail…</p>}</main>);
  }
  const first = data.pending[0];
  const firstShip = first ? undefined : data.ships[0];
  const rest = [
    ...data.pending.slice(1).map((p) => ({kind: 'APPROVE', text: words(p.name), key: `a:${p.repo}:${p.name}`})),
    ...data.ships.slice(first ? 0 : 1).map((s) => ({kind: 'SHIP', text: `${s.title ? words(s.title) : base(s.repo)} passed its last check`, key: `s:${s.repo}:${s.head}`})),
  ];
  const receipt = data.receipts.find((x) => x.shipped) ?? data.receipts[0];
  const decided = first || firstShip;
  return shell(
    <>
      {banner && <p className="notlive" role="status" data-testid="not-live">{banner}</p>}
      <main className="grid">
        <aside className="left" aria-label="Next in your hand">
          <p className="lab">NEXT IN YOUR HAND</p>
          {rest.slice(0, 6).map((i) => <div className={i.kind === 'SHIP' ? 'mini ship' : 'mini'} key={i.key} data-testid="next-item"><em>{i.kind}</em>{i.text}</div>)}
          {rest.length > 6 && <p className="quiet">and {rest.length - 6} more</p>}
          {decided && rest.length === 0 && live && <p className="quiet">Nothing else needs you.</p>}
          {data.older.length > 0 && (
            <details className="older" data-testid="older">
              <summary>Older (hidden): {data.older.length}{data.older.length >= 200 ? '+' : ''} {data.older.length === 1 ? 'card' : 'cards'}</summary>
              <p className="quiet">Drafts not approved as far as this page can tell, and more than 3 days old or of unknown age. Names only: no approve line.</p>
              {data.older.slice(0, 50).map((o) => <p className="oldrow" key={`${o.repo}:${o.name}`} data-testid="older-item">{o.name.slice(0, 80)}<span>{base(o.repo)}</span></p>)}
              {data.older.length > 50 && <p className="quiet">and {data.older.length - 50} more</p>}
            </details>
          )}
          {data.settled.length > 0 && <p className="quiet" data-testid="settled-note">{data.settled.length}{data.settled.length >= 200 ? '+' : ''} {data.settled.length === 1 ? 'card is' : 'cards are'} already approved and not shown here.</p>}
        </aside>
        <section className="center" aria-label="Your turn">
          {decided ? <Decision pending={first} ship={firstShip} /> : live ? (
            <article className="card" data-testid="empty"><h1>Nothing needs you.</h1><p>No card is waiting for your approval and nothing is waiting to ship, in the projects this page watches.</p>{data.older.length > 0 && <p>Older drafts are listed under "Older (hidden)".</p>}</article>
          ) : (
            <article className="card" data-testid="cant-tell"><h1>Can't tell what needs you</h1><p>Some of the rail could not be read: see the note above.</p></article>
          )}
        </section>
        <aside className="right" aria-label="Proof">
          <p className="rcl">{receipt?.shipped ? 'PROOF · SHIPPED PIECE' : receipt ? 'PROOF · CHECKED PIECE' : 'PROOF'}</p>
          <ReceiptView r={receipt} />
        </aside>
      </main>
    </>,
  );
}
