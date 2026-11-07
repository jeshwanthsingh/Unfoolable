import {BOARD} from './copy.ts';

const token = () => new URLSearchParams(location.hash.slice(1)).get('t') ?? '';
// Bring a helper's terminal forward. A helper that is not in a window needs a yes first (it may start a second copy).
export async function openHelper(id: string): Promise<boolean> {
  const call = (resume: boolean) => fetch('/open', {method: 'POST', headers: {'x-office-token': token(), 'content-type': 'application/json'}, body: JSON.stringify({id, resume})});
  let r = await call(false);
  if (r.status === 409 && window.confirm(BOARD.confirm)) r = await call(true);
  return r.ok;
}
