export const qualityGateNames=['ruff','pyright','bandit','eslint','oxlint','tsc','opengrep','gitleaks','detect-secrets','osv'] as const;
export type QualityGateName=typeof qualityGateNames[number];
export type QualityFinding={path:string;line:number;rule:string;message:string};
export type QualityGateResult={gate:QualityGateName;status:'PASS'|'FAIL'|'ERROR'|'NOT APPLICABLE';reason?:string;findings:QualityFinding[];baselineCount:number;durationMs:number};
export type QualityGateEvidence={version:'quality-gates-v1';base:string;candidate:string;gates:QualityGateResult[];durationMs:number};

export type TestTamperingEvidence={status:'CLEAR'|'FLAGGED'|'ERROR';flags:{path:string;line:number;reason:string}[];reason?:string;durationMs:number};

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object';
export function isQualityEvidence(v:unknown):v is QualityGateEvidence{return object(v)&&v.version==='quality-gates-v1'&&typeof v.base==='string'&&typeof v.candidate==='string'&&typeof v.durationMs==='number'&&Array.isArray(v.gates)&&v.gates.every(g=>object(g)&&qualityGateNames.includes(g.gate as QualityGateName)&&['PASS','FAIL','ERROR','NOT APPLICABLE'].includes(String(g.status))&&typeof g.baselineCount==='number'&&typeof g.durationMs==='number'&&Array.isArray(g.findings)&&g.findings.every(f=>object(f)&&typeof f.path==='string'&&typeof f.line==='number'&&typeof f.rule==='string'&&typeof f.message==='string'));}
export function isTamperingEvidence(v:unknown):v is TestTamperingEvidence{return object(v)&&['CLEAR','FLAGGED','ERROR'].includes(String(v.status))&&typeof v.durationMs==='number'&&Array.isArray(v.flags)&&v.flags.every(f=>object(f)&&typeof f.path==='string'&&typeof f.line==='number'&&typeof f.reason==='string');}
export type TicketReviewEvidence={qualityGates?:QualityGateEvidence;testTampering?:TestTamperingEvidence;mutationCoverage:string};
export function isReviewEvidence(v:unknown):v is TicketReviewEvidence{return object(v)&&typeof v.mutationCoverage==='string'&&(v.qualityGates===undefined||isQualityEvidence(v.qualityGates))&&(v.testTampering===undefined||isTamperingEvidence(v.testTampering));}
