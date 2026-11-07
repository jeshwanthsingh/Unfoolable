// Office page server: loopback only, GET plus two small POST routes (/open, /ask), per-launch token, Host and Origin checked. Serves the built page and one JSON route.
import {createServer, type Server} from 'node:http';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {existsSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {join, extname} from 'node:path';
import {buildSnapshot} from './office-data.ts';
import {createLive, type Live} from './office-live.ts';
import {createAsker} from './office-act.ts';
import {createOpener, type OpenOpts} from './office-open.ts';
import {ART_FILES, artAvailable, artPath, defaultArtDir} from './office-art.ts';
const TYPES: Record<string, string> = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2'};
export function startOffice(opts: {vault: string; staticDir?: string; port?: number; token?: string; repos?: {name: string; path: string}[]; logPath?: string; live?: Live; open?: Partial<OpenOpts>; mailbox?: string; art?: {dir?: string}}): Promise<{server: Server; port: number; token: string; url: string}> {
  const token = opts.token ?? randomBytes(24).toString('hex');
  const live = opts.live ?? (opts.logPath ? createLive(opts.logPath) : null);
  const okKey = (given: string): boolean => { const got = Buffer.from(given), want = Buffer.from(token); return got.length === want.length && timingSafeEqual(got, want); };
  const cookieKey = (c: string | undefined): string => /(?:^|;\s*)office_key=([0-9a-f]+)/.exec(c ?? '')?.[1] ?? '';
  const opener = opts.open ? createOpener({logPath: join(opts.vault, 'logs/office-open.log'), ...opts.open}) : null;
  const asker = opts.mailbox ? createAsker({file: opts.mailbox, fs: {read: (p) => readFileSync(p, 'utf8'), write: (p, t) => { writeFileSync(`${p}.tmp`, t); renameSync(`${p}.tmp`, p); }}}) : null; // one atomic rewrite of the one mailbox file
  const server = createServer((req, res) => {
    const send = (code: number, body: string | Buffer, type = 'text/plain; charset=utf-8'): void => {
      res.writeHead(code, {'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"});
      res.end(body);
    };
    const port = (server.address() as {port: number}).port;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!hosts.includes(req.headers.host ?? '')) return send(403, 'Wrong host.');
    const origin = req.headers.origin;
    if (origin !== undefined && !hosts.some((h) => origin === `http://${h}`)) return send(403, 'Wrong origin.');
    const keyed = (): boolean => okKey(String(req.headers['x-office-token'] ?? '')) || okKey(cookieKey(req.headers.cookie)); // header, or the same-site HttpOnly cookie the link swapped it for
    if (req.method === 'POST' && opener && (req.url ?? '') === '/open') { // the only write route: the key AND a matching Origin are both required (the cookie is SameSite=Strict)
      if (origin === undefined) return send(403, 'Wrong origin.');
      if (!keyed()) return send(401, 'Needs the launch token.');
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 1000) req.destroy(); });
      req.on('end', async () => {
        let j: {id?: unknown; resume?: unknown} = {};
        try { j = JSON.parse(body) as typeof j; } catch { /* bad body is treated as no id */ }
        const r = await opener(j.id, j.resume === true);
        send(r.code, JSON.stringify(r.body), 'application/json');
      });
      return;
    }
    if (req.method === 'POST' && asker && (req.url ?? '') === '/ask') { // same rules as /open: the key AND a matching Origin
      if (origin === undefined) return send(403, 'Wrong origin.');
      if (!keyed()) return send(401, 'Needs the launch token.');
      let body = '', big = false;
      req.on('data', (c) => { body += c; if (body.length > 20000) { big = true; body = ''; } });
      req.on('end', () => {
        if (big) return send(413, JSON.stringify({ok: false, error: 'too long'}), 'application/json');
        let j: {text?: unknown} = {};
        try { j = JSON.parse(body) as typeof j; } catch { /* a bad body is treated as no text */ }
        const r = asker(j.text);
        send(r.code, JSON.stringify(r.body), 'application/json');
      });
      return;
    }
    if (req.method !== 'GET') return send(405, 'Read only.');
    const path = (req.url ?? '/').split('?')[0]!;
    if (path.startsWith('/k/')) { // opens the live link once: sets a same-site cookie because EventSource cannot send headers
      if (!okKey(path.slice(3))) return send(401, 'Needs the launch token.');
      res.writeHead(302, {location: '/', 'set-cookie': `office_key=${token}; Path=/; HttpOnly; SameSite=Strict`, 'cache-control': 'no-store'});
      return res.end();
    }
    if (opts.art && path.startsWith('/art/')) { // licensed art, read from a local folder, allowlisted names only, same key rule as the stream
      if (!okKey(String(req.headers['x-office-token'] ?? '')) && !okKey(cookieKey(req.headers.cookie))) return send(401, 'Needs the launch token.');
      const dir = opts.art.dir ?? defaultArtDir(), name = path.slice(5);
      if (name === 'manifest') return send(200, JSON.stringify({available: artAvailable(dir), files: Object.keys(ART_FILES)}), 'application/json');
      const file = artPath(dir, name);
      if (!file) return send(404, 'Not found.');
      try { return send(200, readFileSync(file), 'image/png'); } catch { return send(404, 'Not found.'); }
    }
    if (live && (path === '/state' || path === '/events')) {
      if (!keyed()) return send(401, 'Needs the launch token.');
      if (path === '/state') return send(200, JSON.stringify(live.state()), 'application/json');
      res.writeHead(200, {'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-content-type-options': 'nosniff'});
      const write = (s: {version: number}): void => { res.write(`id: ${s.version}\nevent: state\ndata: ${JSON.stringify(s)}\n\n`); };
      write(live.state()); // also answers Last-Event-ID: the full state replaces whatever the client had
      const off = live.subscribe(write);
      req.on('close', off);
      return;
    }
    if (path === '/api/office') {
      if (!keyed()) return send(401, 'Needs the launch token.');
      return send(200, JSON.stringify(buildSnapshot(opts.vault, new Date(), opts.repos)), 'application/json');
    }
    if (!opts.staticDir) return send(404, 'Not found.');
    const file = path === '/' ? 'index.html' : path.slice(1);
    if (!/^[\w.-]+(\/[\w.-]+)*$/.test(file) || file.includes('..') || !TYPES[extname(file)]) return send(404, 'Not found.');
    try { send(200, readFileSync(join(opts.staticDir, file)), TYPES[extname(file)]); } catch { send(404, 'Not found.'); }
  });
  return new Promise((ok, bad) => {
    server.once('error', bad);
    server.once('close', () => { if (!opts.live) live?.stop(); });
    server.listen(opts.port ?? 0, '127.0.0.1', () => {
      const port = (server.address() as {port: number}).port;
      ok({server, port, token, url: `http://127.0.0.1:${port}/#t=${token}`});
    });
  });
}
// Run directly: node apps/observatory/office-server.ts  (prints the one-time link)
if (import.meta.url === `file://${process.argv[1]}`) {
  const vault = process.env.OFFICE_VAULT ?? join(process.env.HOME ?? '', 'Projects/proof-lab');
  const staticDir = process.env.OFFICE_STATIC ?? join(import.meta.dirname, '../../.work/office-dist');
  const v1 = join(vault, 'logs/office-v1.jsonl'), logPath = existsSync(v1) ? v1 : join(vault, 'logs/usage.jsonl'); // the emitter's file when it exists, else the old log
  const r = await startOffice({vault, staticDir, repos: [{name: 'AgentRunLab', path: join(process.env.HOME ?? '', 'Projects/coding-agent-crash-tests')}], port: Number(process.env.OFFICE_PORT ?? 0), logPath, open: {}, art: {}, mailbox: join(vault, 'mailbox/to-code.md')});
  console.log(`Office page (read-only, this computer only): ${r.url}`);
}
