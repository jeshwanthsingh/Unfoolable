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
    jobs: {title: 'Jobs', help: 'Each job a helper was sent to do. A job says done only when its save check passed.'},
    today: {title: 'Today', help: 'How many helpers worked today, and what you spent.'}
  },
  today: {helpers: 'Helpers', steps: 'Steps done', guard: 'The guard said no', spent: 'Spent today'}
} as const;

// The board (default view). Card sentences are made in observatory/office-board.ts from codes only.
export const BOARD = {
  more: 'More views', back: 'Back to the board', quiet: 'quiet helpers (no news for a while)',
  cols: {needs: 'Needs you', working: 'Working', checking: 'Checking', done: 'Done today'},
  open: 'Open', confirm: 'This helper is not in a window I can find. Open a new window that continues it? It may start a second copy of the helper.', openFailed: 'Could not open it.',
  away: 'While you were away', awayNone: 'Nothing to report.', awayResults: 'Checks', passedWord: 'passed', notPassedWord: 'did not pass', blocked: 'times the guard said no',
  soundOff: 'Sound is off', soundOn: 'Sound is on',
  tools: 'Tools', savedToday: 'saved today', see: 'See', emptyNeeds: 'When nobody needs you, this space stays empty.',
  empty: 'Nobody here.', noLink: 'Open the page with the link from the terminal.'
} as const;

export const DETAIL_WORDS = {
  source: 'Read from usage.jsonl, scoreboard.csv, to-chat.md and garden reports. Read only.'
} as const;

// The picture view. Words only; the picture itself shows recorded facts or a faded "maybe".
export const FLOOR = {
  alt: 'A picture of the office: each helper at a desk or at the place it is working.',
  bookshelf: 'Books', workbench: 'Workbench', terminal: 'Commands', globe: 'Web', checker: 'Checker',
  door: 'The guard', guardNo: 'said no today', guardLast: 'last at', guardNone: 'has not said no today',
  legend: 'Solid helper: seen working just now. Faded: maybe. Empty desk: finished.',
  mailChat: 'New mail for the planner at', mailCode: 'New mail for the builder at',
  checkerAt: 'Checker ran at', checkerEarlier: 'Checker ran earlier, at', staff: 'Visitor with a report:',
  viewPicture: 'Show the picture', viewSimple: 'Show the simple view'
} as const;

export const lightIcon = {green: '✓', amber: '!', red: '✕', grey: '?'} as const;

export function screenStrings(): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(COPY);
  walk(FLOOR);
  walk(BOARD);
  return out;
}
