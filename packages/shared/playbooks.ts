export type PlaybookRunner = 'unittest' | 'vitest' | 'node-script';
export type PlaybookCommand = {argv: string[]; cwd: string; report?: {format: 'cc-checks-v1'; expectedTestIds: string[]}};
export type ProjectPlaybookDefinition = {
  skipReviewers?: boolean;
  riskRules?: import('./review-risk.ts').ReviewRiskRule[];
  diffCap?: {lines:number;files:number};
  qualityGates?: {gates:import('./quality-gates.ts').QualityGateName[];policyHash:string};
  version: 'project-playbook-v1';
  exportFiles?: string[];
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
  repositoryIdentity?: string;
  repoRoot: string;
  baseCommit: string;
  definition: ProjectPlaybookDefinition;
  hash: string;
  approval: {hash: string; at: string;actor?:'test-fixture'|'passkey';source?:'node:test'|'webauthn';dataMode?:'TEST'|'LIVE';confirmationId?:string;credentialId?:string;evidenceHash?:string} | null;
  updatedAt: string;
};
