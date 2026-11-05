// Every word the office page shows lives here, so the kid test can read all of it.
// DETAIL_WORDS are the only strings allowed to use technical terms (they sit behind "Show details").
export const COPY = {
  title: 'My helpers',
  badge: 'Not graded',
  badgeHelp: 'This page only reports what happened. It does not say if work is good.',
  loading: 'Looking for news...',
  noLink: 'Open the page with the link from the terminal.',
  offline: 'Cannot reach the office. Start it, then reload.',
  empty: 'Nothing here yet.',
  help: 'What is this?',
  showDetails: 'Show details',
  hideDetails: 'Hide details',
  updated: 'Checked at',
  light: {green: 'All calm', amber: 'Needs you', red: 'Something is wrong', grey: 'No news'},
  panels: {
    needs: {title: 'Needs you', help: 'A helper is stopped and waits for you. If this is empty, you can relax.'},
    night: {title: 'Last night', help: 'What your helpers did from 8 pm until 8 am.'},
    results: {title: 'Results', help: 'Practice tests, reports and the newest replies. They tell you what happened.'},
    today: {title: 'Today', help: 'How many helpers worked today, and what you spent.'}
  },
  today: {helpers: 'Helpers', steps: 'Steps done', guard: 'The guard said no', spent: 'Spent today'}
} as const;

export const DETAIL_WORDS = {
  source: 'Read from usage.jsonl, scoreboard.csv, to-chat.md and garden reports. Read only.'
} as const;

export const lightIcon = {green: '✓', amber: '!', red: '✕', grey: '?'} as const;

export function screenStrings(): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(COPY);
  return out;
}
