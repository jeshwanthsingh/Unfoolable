export type PlaybookRunner = 'unittest' | 'vitest' | 'node-script';
export type PlaybookCommand = {argv: string[]; cwd: string};
export type ProjectPlaybookDefinition = {
  version: 'project-playbook-v1';
  setup: PlaybookCommand | null;
  tests: PlaybookCommand[];
  env: Record<string, string>;
  runner: PlaybookRunner;
  timeoutSeconds: number;
  knownFailingTests: string[];
  knownFlakyTests: string[];
  notes: string[];
};
export type ProjectPlaybook = {
  repoRoot: string;
  baseCommit: string;
  definition: ProjectPlaybookDefinition;
  hash: string;
  approval: {hash: string; at: string} | null;
  updatedAt: string;
};
