// Nightly kid test on a LIVE screenshot of the board (raw-text drawers closed). A fresh model with no context sees only the picture;
// its answer is then JUDGED against the reducer's truth (never trusted alone). Subscription call (claude -p), no API key.
// Usage: node scripts/office-kid-test.ts            writes evals/ui-kid-test-<date>.md in the vault, exit 1 if any answer is wrong
//        node scripts/office-kid-test.ts --no-model  only takes the pictures and prints the truth (no model call)
import {chromium} from 'playwright-core';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir, homedir} from 'node:os';
import {join} from 'node:path';
import {startOffice} from '../apps/observatory/office-server.ts';

export const JARGON = ['hook', 'commit', 'diff', 'verdict', 'token', 'handoff', 'session', 'repo', 'eval', 'json', 'stderr', 'pid', 'verifier', 'gate', 'seq'];
export type Truth = {needs: number; working: number};
const NEG = /nothing (needs|requires)|no action|does not need|doesn't need|not need to|nothing for (the owner|you)|nothing to do|no need/i;
const POS = /(needs?|wants?|waiting for|asks?) (you|the owner|your)|owner (should|needs to|must|has to)|action (is )?(required|needed)|needs? (attention|action)/i;
// Right = the answer says the owner is needed exactly when the reducer says someone needs them, and uses no technical word.
export function judge(answer: string, truth: Truth): {correct: boolean; jargon: string[]} {
  const says = POS.test(answer) && !NEG.test(answer);
  const jargon = JARGON.filter((w) => new RegExp(`\\b${w}s?\\b`, 'i').test(answer));
  return {correct: truth.needs > 0 ? says : !says, jargon};
}

async function main(): Promise<void> {
  const noModel = process.argv.includes('--no-model');
  const vault = join(homedir(), 'Projects/proof-lab');
  const v1 = join(vault, 'logs/office-v1.jsonl');
  const r = await startOffice({vault, staticDir: join(import.meta.dirname, '../.work/office-dist'), logPath: existsSync(v1) ? v1 : join(vault, 'logs/usage.jsonl')});
  const b = await chromium.launch();
  const out = mkdtempSync(join(tmpdir(), 'kid-'));
  const rows: string[] = []; let bad = 0, truth: Truth = {needs: 0, working: 0};
  try {
    for (const w of [1280, 390]) {
      const page = await b.newPage({viewport: {width: w, height: w === 390 ? 844 : 900}});
      await page.goto(r.url); await page.waitForSelector('.ob-fresh'); await page.waitForTimeout(1500);
      const s = await (await fetch(`http://127.0.0.1:${r.port}/state`, {headers: {'x-office-token': r.token}})).json() as {summary: Record<string, number>};
      truth = {needs: s.summary.needs_you! + s.summary.stuck!, working: s.summary.working!};
      const dir = mkdtempSync(join(out, `w${w}-`)); // an empty folder holding only the one picture
      await page.screenshot({path: join(dir, 'board.png'), fullPage: true});
      if (noModel) { rows.push(`${w}px: picture at ${join(dir, 'board.png')}`); continue; }
      const ask = spawnSync('claude', ['-p', 'Read the image file ./board.png. In 2 sentences, what is happening on this screen, and does the owner need to do anything?', '--model', 'haiku', '--allowedTools', 'Read', '--no-session-persistence', '--setting-sources', 'project', '--strict-mcp-config', '--disable-slash-commands'], {cwd: dir, encoding: 'utf8', timeout: 180_000});
      const answer = (ask.stdout || '').trim(), j = judge(answer, truth);
      const ok = ask.status === 0 && answer.length > 0 && j.correct && j.jargon.length === 0;
      if (!ok) bad++;
      rows.push(`## ${w} px\n"${answer.replace(/\n+/g, ' ')}"\n- Truth: ${truth.needs} need the owner, ${truth.working} working.\n- Answer matches the truth: ${j.correct ? 'PASS' : 'FAIL'}\n- No jargon: ${j.jargon.length ? 'FAIL (' + j.jargon.join(', ') + ')' : 'PASS'}\n${ask.status === 0 ? '' : '- Model call failed: status ' + ask.status + '\n'}`);
    }
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
  const day = new Date().toISOString().slice(0, 10);
  const md = `# Office board kid test, ${day}\n\nLive screenshot, raw-text drawers closed. Fresh model (haiku), no context, only the picture. Its answer is judged against the reducer's truth.\n\n${rows.join('\n')}\n## Result: ${bad ? 'FAIL' : 'PASS'}\n`;
  if (!noModel) { mkdirSync(join(vault, 'evals'), {recursive: true}); writeFileSync(join(vault, `evals/ui-kid-test-${day}-board.md`), md); }
  console.log(md);
  process.exit(bad ? 1 : 0);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
