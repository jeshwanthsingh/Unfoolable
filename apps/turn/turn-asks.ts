// "Your Turn": ANSWER and TRY IT cards, read from plain files in <vault>/questions/<name>.json. Read only: nothing here writes, moves or deletes.
// Every file is agent-written data: capped, cleaned of control and direction characters, and only ever drawn as plain text. A file that cannot
// be used is skipped and NAMED in `unreadable` (the page says it cannot read it), never ignored silently.
import type {Fs} from './turn-data.ts';

export type Ask = {id: string; kind: 'answer' | 'try'; title: string; repo: string; card?: string; question?: string; why?: string; where?: string; options: string[]; checklist: string[]};

const MAX_FILES = 20, MAX_CHARS = 20_480, MAX_OPTIONS = 4, MAX_CHECK = 8, LINE = 120;
const NAME = /^[a-z0-9-]{1,60}\.json$/;
const clean = (s: string): string => s.replace(/[\p{C}‪-‮⁦-⁩]/gu, '').trim();
const cap = (s: string, n: number): string => clean(s).slice(0, n);
const isStr = (v: unknown): v is string => typeof v === 'string';
const strs = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

export function readAsks(fs: Fs, vault: string): {asks: Ask[]; unreadable: string[]} {
  const dir = `${vault}/questions`;
  const asks: Ask[] = [], unreadable: string[] = [];
  const listed = fs.list(dir);
  if (listed === null) return {asks, unreadable};
  const names = [...listed].sort();
  for (const name of names.slice(0, MAX_FILES)) {
    const bad = (): void => { unreadable.push(clean(name).slice(0, 60)); };
    if (!NAME.test(name)) { bad(); continue; }
    let text: string | null;
    try { text = fs.read(`${dir}/${name}`); } catch { text = null; }
    if (text === null || text.length > MAX_CHARS) { bad(); continue; }
    let v: unknown;
    try { v = JSON.parse(text); } catch { bad(); continue; }
    if (v === null || typeof v !== 'object' || Array.isArray(v)) { bad(); continue; }
    const o = v as Record<string, unknown>;
    const title = isStr(o.title) ? cap(o.title, 120) : '';
    const fieldsOk = [o.repo, o.card, o.question, o.why, o.where].every((x) => x === undefined || isStr(x)) && (o.options === undefined || strs(o.options)) && (o.checklist === undefined || strs(o.checklist));
    if ((o.kind !== 'answer' && o.kind !== 'try') || title === '' || !fieldsOk) { bad(); continue; }
    const repo = isStr(o.repo) ? cap(clean(o.repo).split('/').filter(Boolean).pop() ?? '', 200) : '';
    asks.push({
      id: name, kind: o.kind, title, repo,
      ...(isStr(o.card) ? {card: cap(o.card, 120)} : {}), ...(isStr(o.question) ? {question: cap(o.question, 400)} : {}),
      ...(isStr(o.why) ? {why: cap(o.why, 300)} : {}), ...(isStr(o.where) ? {where: cap(o.where, 200)} : {}),
      options: (strs(o.options) ? o.options : []).slice(0, MAX_OPTIONS).map((s) => cap(s, LINE)),
      checklist: (strs(o.checklist) ? o.checklist : []).slice(0, MAX_CHECK).map((s) => cap(s, LINE)),
    });
  }
  if (names.length > MAX_FILES) unreadable.push(`${names.length - MAX_FILES} more files not read`);
  return {asks, unreadable};
}
