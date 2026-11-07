import {BOARD, OPEN_WHY} from './copy.ts';

const token = () => new URLSearchParams(location.hash.slice(1)).get('t') ?? '';
// Bring a helper's terminal forward. A helper that is not in a window needs a yes first (it may start a second copy).
// Returns '' when it worked, else the plain sentence to show.
export async function openHelper(id: string): Promise<string> {
  const call = (resume: boolean) => fetch('/open', {method: 'POST', headers: {'x-office-token': token(), 'content-type': 'application/json'}, body: JSON.stringify({id, resume})});
  let r = await call(false);
  if (r.status === 409 && window.confirm(BOARD.confirm)) r = await call(true);
  if (r.ok) return '';
  const why = ((await r.json().catch(() => ({}))) as {why?: string}).why;
  return why === 'timeout' ? OPEN_WHY.timeout : why === 'denied' ? OPEN_WHY.denied : BOARD.openFailed;
}
