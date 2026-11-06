// Reads a growing log by byte offset: each poll returns only the new COMPLETE lines. Read-only.
// A file that got smaller (truncated) or was replaced (new inode) is read again from the start; `reset` says so.
import {closeSync, openSync, readSync, statSync} from 'node:fs';

export type Tail = {poll(): {lines: string[]; reset: boolean}};
// shortcut: first read starts at most maxStart bytes from the end (a partial first line is dropped); upgrade if older history is needed.
export function createTail(path: string, maxStart = 4_000_000): Tail {
  let offset = -1, ino = 0, rest = '';
  return {
    poll() {
      let st;
      try { st = statSync(path); } catch { return {lines: [], reset: false}; }
      let reset = false;
      if (offset < 0) { offset = Math.max(0, st.size - maxStart); ino = st.ino; if (offset > 0) rest = '\u0000'; }
      else if (st.ino !== ino || st.size < offset) { offset = 0; ino = st.ino; rest = ''; reset = true; }
      if (st.size === offset) return {lines: [], reset};
      const buf = Buffer.alloc(st.size - offset);
      const fd = openSync(path, 'r');
      try { readSync(fd, buf, 0, buf.length, offset); } finally { closeSync(fd); }
      offset += buf.length;
      const parts = (rest + buf.toString('utf8')).split('\n');
      rest = parts.pop() ?? '';
      if (parts[0]?.startsWith('\u0000')) parts.shift(); // first line began before our start point
      return {lines: parts.filter(Boolean), reset};
    }
  };
}
