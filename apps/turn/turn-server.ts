// "Your Turn" server, slice 1: loopback only and READ ONLY. GET routes only (every other method answers 405), a per-launch
// key swapped for a same-site cookie, Host and Origin checked. It runs no program and writes nothing: git is read from files.
// The Host/Origin/key/cookie pattern is copied from apps/observatory/office-server.ts, not imported, so the page does not pull in the office.
import {createServer, type Server} from 'node:http';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {closeSync, constants, fstatSync, lstatSync, openSync, readdirSync, readSync, realpathSync} from 'node:fs';
import {basename, extname, join, resolve, sep} from 'node:path';
import {pendingCards, receipt, shipsWaiting, type Fs} from './turn-data.ts';

const TEXT_MAX = 200_000; // a rail file bigger than this reads as missing
const STATIC_MAX = 5_000_000;
const TYPES: Record<string, string> = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2'};
const HEADERS = {'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"};

// One bounded read: a regular file only, never through a symlink (O_NOFOLLOW), never more than `max` bytes.
// O_NONBLOCK: a file swapped for a FIFO must not freeze the server (the isFile check then rejects it).
function readBytes(path: string, max: number): Buffer | null {
  let fd = -1;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > max) return null;
    const buf = Buffer.alloc(st.size);
    return buf.subarray(0, readSync(fd, buf, 0, st.size, 0)); // a file truncated since fstat reads short, never padded with zeros
  } catch {
    return null;
  } finally {
    if (fd >= 0) closeSync(fd);
  }
}

export const realFs: Fs = {
  read: (path) => readBytes(path, TEXT_MAX)?.toString('utf8') ?? null,
  list: (path) => {
    try {
      return lstatSync(path).isDirectory() ? readdirSync(path) : null; // lstat: a symlinked directory is not followed
    } catch {
      return null;
    }
  },
};

// The commit id HEAD points at, read from the .git files (a plain repo or a linked worktree); null when anything is odd.
const HEX40 = /^[0-9a-f]{40}$/;
export function gitHead(repo: string): string | null {
  try {
    let gitdir = join(repo, '.git');
    const st = lstatSync(gitdir);
    if (st.isFile()) {
      const m = /^gitdir:\s*(.+)$/m.exec(realFs.read(gitdir) ?? '');
      if (!m) return null;
      gitdir = resolve(repo, m[1]!.trim());
    } else if (!st.isDirectory()) return null;
    const common = resolve(gitdir, realFs.read(join(gitdir, 'commondir'))?.trim() ?? '.');
    const head = realFs.read(join(gitdir, 'HEAD'))?.trim() ?? '';
    if (HEX40.test(head)) return head;
    const ref = /^ref:\s*(refs\/[\w./-]+)$/.exec(head)?.[1];
    if (!ref || ref.includes('..')) return null;
    const loose = realFs.read(join(common, ref))?.trim() ?? '';
    if (HEX40.test(loose)) return loose;
    for (const line of (readBytes(join(common, 'packed-refs'), STATIC_MAX)?.toString('utf8') ?? '').split(/\r?\n/)) { // a repo with many refs has a big packed-refs
      const [sha, name] = line.split(' ');
      if (name === ref && HEX40.test(sha ?? '')) return sha!;
    }
    return null;
  } catch {
    return null;
  }
}

export function startTurn(opts: {vault: string; repos: string[]; approvalsDir: string; staticDir?: string; port?: number; token?: string; fs?: Fs; headOf?: (repo: string) => string | null}): Promise<{server: Server; port: number; token: string; url: string}> {
  const token = opts.token ?? randomBytes(24).toString('hex');
  const fs = opts.fs ?? realFs;
  const headOf = opts.headOf ?? gitHead;
  const okKey = (given: string): boolean => { const got = Buffer.from(given), want = Buffer.from(token); return got.length === want.length && timingSafeEqual(got, want); };
  const cookieKey = (c: string | undefined): string => /(?:^|;\s*)turn_key=([\w-]+)/.exec(c ?? '')?.[1] ?? '';
  const server = createServer((req, res) => {
    const send = (code: number, body: string | Buffer, type = 'text/plain; charset=utf-8'): void => { res.writeHead(code, {'content-type': type, ...HEADERS}); res.end(body); };
    if (req.method !== 'GET') return send(405, 'Read only.'); // first, so any non-GET gets the same answer whatever its Host
    const port = (server.address() as {port: number}).port;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!hosts.includes(req.headers.host ?? '')) return send(403, 'Wrong host.');
    const origin = req.headers.origin;
    if (origin !== undefined && !hosts.some((h) => origin === `http://${h}`)) return send(403, 'Wrong origin.');
    const path = (req.url ?? '/').split('?')[0]!;
    if (path.startsWith('/k/')) { // opens the link once: swaps the key for a same-site cookie
      if (!okKey(path.slice(3))) return send(401, 'Needs the launch token.');
      res.writeHead(302, {location: '/', 'set-cookie': `turn_key=${token}; Path=/; HttpOnly; SameSite=Strict`, ...HEADERS});
      return res.end();
    }
    if (path === '/api/turn') {
      if (!okKey(String(req.headers['x-turn-token'] ?? '')) && !okKey(cookieKey(req.headers.cookie))) return send(401, 'Needs the launch token.');
      try {
        const pending = pendingCards(fs, opts.vault, opts.approvalsDir);
        const ships = shipsWaiting(fs, opts.repos, headOf);
        const receipts = opts.repos.flatMap((r) => receipt(fs, r, headOf) ?? []);
        // What could not be read at all: the page must say "Not live", never "Nothing needs you" from an empty read.
        const cardsDir = `${opts.vault}/cards`;
        // Files that are listed but cannot be read (too big, a symlink, a folder named like a file) or whose json is broken.
        // 'record' also needs an object; 'loose' flags only broken json, because the data layer skips a stray valid-json file.
        const bad = (dir: string, names: string[], mode: 'text' | 'loose' | 'record'): string[] => names.slice(0, 500).filter((n) => {
          const text = fs.read(`${dir}/${n}`);
          if (text === null) return true;
          if (mode === 'text') return false;
          try { const v: unknown = JSON.parse(text); return mode === 'record' && (v === null || typeof v !== 'object' || Array.isArray(v)); } catch { return true; }
        });
        const cards = fs.list(cardsDir), approvals = fs.list(opts.approvalsDir);
        const notLive = [
          ...(cards === null ? ['the cards folder'] : []),
          ...bad(cardsDir, (cards ?? []).filter((n) => n.endsWith('.md')), 'text').map((n) => `the card file ${n.slice(0, 60)}`),
          ...(approvals === null ? ['the approvals folder'] : []),
          ...bad(opts.approvalsDir, (approvals ?? []).filter((n) => n.endsWith('.json')), 'loose').map((n) => `the approval record ${n.slice(0, 60)}`),
          ...opts.repos.flatMap((r) => {
            if (fs.list(r) === null) return [`the project ${basename(r)}`];
            const known = fs.list(`${r}/.claude`) ?? []; // known limit: a .claude that is a symlink reads like an absent one
            const records = ['last-verify.json', 'last-ship.json'].filter((n) => known.includes(n));
            if (bad(`${r}/.claude`, records, 'record').length > 0) return [`a check record of the project ${basename(r)}`];
            return records.includes('last-verify.json') && headOf(r) === null ? [`the current version of the project ${basename(r)}`] : [];
          }),
        ];
        return send(200, JSON.stringify({at: new Date().toISOString(), notLive, pending, ships, receipts}), 'application/json');
      } catch {
        return send(500, JSON.stringify({ok: false, error: 'could not read the rail files'}), 'application/json');
      }
    }
    if (!opts.staticDir) return send(404, 'Not found.');
    const file = path === '/' ? 'index.html' : path.slice(1);
    if (!/^[\w.-]+(\/[\w.-]+)*$/.test(file) || file.includes('..') || !TYPES[extname(file)]) return send(404, 'Not found.');
    let real: string; // resolve symlinks in every part of the path, and stay inside the static folder
    try {
      real = realpathSync(join(opts.staticDir, file));
      if (!real.startsWith(realpathSync(opts.staticDir) + sep)) return send(404, 'Not found.');
    } catch {
      return send(404, 'Not found.');
    }
    const bytes = readBytes(real, STATIC_MAX);
    return bytes ? send(200, bytes, TYPES[extname(file)]) : send(404, 'Not found.');
  });
  return new Promise((ok, bad) => {
    server.once('error', bad);
    server.listen(opts.port ?? 0, '127.0.0.1', () => {
      const port = (server.address() as {port: number}).port;
      ok({server, port, token, url: `http://127.0.0.1:${port}/#t=${token}`});
    });
  });
}
