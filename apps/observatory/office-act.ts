// "Ask": the office writes one plain-text entry into the builder's mailbox file. It never runs, parses or forwards the text.
// The file system is passed in, so tests fake it. Nothing here starts a program.
export type AskFs = {read: (path: string) => string; write: (path: string, text: string) => void};
export type AskResult = {code: number; body: {ok: boolean; error?: string}};
const CONTROL = /[\u0000-\u0009\u000b-\u001f\u007f]/; // only newline is allowed

export function createAsker(o: {file: string; fs: AskFs; now?: () => number}) {
  const now = o.now ?? Date.now;
  let last = -Infinity;
  return (text: unknown): AskResult => {
    const t = now();
    if (t - last < 1000) return {code: 429, body: {ok: false, error: 'too fast'}};
    last = t;
    if (typeof text !== 'string' || text.trim() === '') return {code: 400, body: {ok: false, error: 'empty'}};
    if (text.length > 2000) return {code: 413, body: {ok: false, error: 'too long'}};
    if (CONTROL.test(text)) return {code: 400, body: {ok: false, error: 'odd characters'}};
    const d = new Date(t), p = (n: number) => String(n).padStart(2, '0');
    const first = text.split('\n').find((l) => l.trim() !== '')!.trim().slice(0, 80);
    const entry = [`- ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} · from the office · ${first} [todo, office]`, ...text.split('\n').map((l) => '  ' + l)].join('\n') + '\n\n';
    try {
      let file = ''; try { file = o.fs.read(o.file); } catch (e) { if ((e as {code?: string}).code !== 'ENOENT') throw e; /* only a missing file starts empty; any other read error must not overwrite the mailbox */ }
      const lines = file.split('\n'), at = lines.findIndex((l) => l.startsWith('- ')); // newest on top: before the first entry
      const pos = at < 0 ? file.length : lines.slice(0, at).reduce((n, l) => n + l.length + 1, 0);
      o.fs.write(o.file, file.slice(0, pos) + entry + file.slice(pos));
      return {code: 200, body: {ok: true}};
    } catch { return {code: 500, body: {ok: false, error: 'could not write'}}; }
  };
}
