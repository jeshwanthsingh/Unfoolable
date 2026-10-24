export type ProjectRule={id:string;path:string;language:'python'|'javascript'|'typescript';pattern?:string;patternRegex?:string;message:string};
export type ProjectRuleFinding={rule:string;path:string;line:number;message:string};
export type ProjectRuleEvidence={version:'project-rules-v1';base:string;candidate:string;rulesHash:string;status:'PASS'|'FAIL';findings:ProjectRuleFinding[];preexisting:ProjectRuleFinding[]};
