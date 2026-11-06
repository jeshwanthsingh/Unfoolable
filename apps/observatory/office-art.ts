// Licensed art stays OUT of the repo: the server reads it from a local folder at run time and serves only an allowlist of names.
// Nothing here copies, lists or exposes any other file of that folder.
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';

export const ART_FILES: Readonly<Record<string, string>> = {'office.png': 'Modern_Office_32x32.png', 'rooms.png': '1_Room_Builder_Office/Room_Builder_Office_32x32.png'};
export const defaultArtDir = (): string => process.env.OFFICE_ART_DIR ?? join(homedir(), 'Projects/art/limezu/Modern_Office_Revamped_v1.2');

// The key from the URL (never a path) -> the real file, or null when the key is not on the list or the file is not there.
export function artPath(dir: string, key: string): string | null {
  const rel = Object.prototype.hasOwnProperty.call(ART_FILES, key) ? ART_FILES[key] : undefined;
  const p = rel ? join(dir, rel) : null;
  return p && existsSync(p) ? p : null;
}
export const artAvailable = (dir: string): boolean => Object.keys(ART_FILES).every((k) => artPath(dir, k) !== null);
