// Office page server: loopback only, GET only, per-launch token, Host and Origin checked. Serves the built page and one JSON route.
import {createServer, type Server} from 'node:http';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join, extname} from 'node:path';
import {buildSnapshot} from './office-data.ts';
const TYPES: Record<string, string> = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png'};
export function startOffice(opts: {vault: string; staticDir?: string; port?: number; token?: string; repos?: {name: string; path: string}[]}): Promise<{server: Server; port: number; token: string; url: string}> {
  const token = opts.token ?? randomBytes(24).toString('hex');
  const server = createServer((req, res) => {
    const send = (code: number, body: string | Buffer, type = 'text/plain; charset=utf-8'): void => {
      res.writeHead(code, {'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'"});
      res.end(body);
    };
    const port = (server.address() as {port: number}).port;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!hosts.includes(req.headers.host ?? '')) return send(403, 'Wrong host.');
    const origin = req.headers.origin;
    if (origin !== undefined && !hosts.some((h) => origin === `http://${h}`)) return send(403, 'Wrong origin.');
    if (req.method !== 'GET') return send(405, 'Read only.');
    const path = (req.url ?? '/').split('?')[0]!;
    if (path === '/api/office') {
      const got = Buffer.from(String(req.headers['x-office-token'] ?? '')), want = Buffer.from(token);
      if (got.length !== want.length || !timingSafeEqual(got, want)) return send(401, 'Needs the launch token.');
      return send(200, JSON.stringify(buildSnapshot(opts.vault, new Date(), opts.repos)), 'application/json');
    }
    if (!opts.staticDir) return send(404, 'Not found.');
    const file = path === '/' ? 'index.html' : path.slice(1);
    if (!/^[\w.-]+(\/[\w.-]+)*$/.test(file) || file.includes('..') || !TYPES[extname(file)]) return send(404, 'Not found.');
    try { send(200, readFileSync(join(opts.staticDir, file)), TYPES[extname(file)]); } catch { send(404, 'Not found.'); }
  });
  return new Promise((ok, bad) => {
    server.once('error', bad);
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
  const r = await startOffice({vault, staticDir, repos: [{name: 'AgentRunLab', path: join(process.env.HOME ?? '', 'Projects/coding-agent-crash-tests')}], port: Number(process.env.OFFICE_PORT ?? 0)});
  console.log(`Office page (read-only, this computer only): ${r.url}`);
}
