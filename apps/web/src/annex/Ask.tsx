import {useState} from 'react';
import {ASK, FEED} from './copy.ts';

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
    <form className="oa-ask" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <textarea aria-label={ASK.placeholder} placeholder={ASK.placeholder} value={text} maxLength={2000} rows={2} onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="ob-btn" disabled={busy || !text.trim()}>{ASK.send}</button>
      <p className="oa-hint">{ASK.hint}</p>
      {msg ? <p className={msg.ok ? 'oa-sent' : 'oa-sent bad'} role="status"><span aria-hidden="true">{msg.ok ? '✉ ' : ''}</span>{msg.t}</p> : null}
    </form>
  );
}
