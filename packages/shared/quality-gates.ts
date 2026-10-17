export const qualityGateNames=['ruff','pyright','bandit','eslint','oxlint','tsc','opengrep','gitleaks','detect-secrets','osv'] as const;
export type QualityGateName=typeof qualityGateNames[number];
export type QualityFinding={path:string;line:number;rule:string;message:string};
export type QualityGateResult={gate:QualityGateName;status:'PASS'|'FAIL'|'ERROR'|'NOT APPLICABLE';reason?:string;findings:QualityFinding[];baselineCount:number;durationMs:number};
export type QualityGateEvidence={version:'quality-gates-v1';base:string;candidate:string;gates:QualityGateResult[];durationMs:number};
