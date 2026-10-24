export const changeKinds=['comment/docs-only','string-literal-only','test code','logic','config/CI/build','dependency/lockfile'] as const;
export type ChangeKind=typeof changeKinds[number];
export type ClassifiedHunk={oldStart:number;oldLines:number;newStart:number;newLines:number;kind:ChangeKind;functions:string[];reason:string};
export type ChangeClassification={version:'change-classification-v1';baseCommit:string;candidateCommit:string;files:{path:string;beforeHash:string;afterHash:string;hunks:ClassifiedHunk[]}[];parserVersions:Record<string,string>};
export function isChangeClassification(value:unknown):value is ChangeClassification {
 if(!value||typeof value!=='object')return false;const v=value as ChangeClassification;
 return v.version==='change-classification-v1'&&/^[a-f0-9]{40,64}$/.test(v.baseCommit)&&/^[a-f0-9]{40,64}$/.test(v.candidateCommit)&&Array.isArray(v.files)&&v.files.length<=200&&v.files.every(f=>typeof f.path==='string'&&f.path.length<=4096&&/^[a-f0-9]{64}$/.test(f.beforeHash)&&/^[a-f0-9]{64}$/.test(f.afterHash)&&Array.isArray(f.hunks)&&f.hunks.length<=200&&f.hunks.every(h=>changeKinds.includes(h.kind)&&['oldStart','oldLines','newStart','newLines'].every(k=>Number.isSafeInteger(h[k as keyof ClassifiedHunk])&&Number(h[k as keyof ClassifiedHunk])>=0)&&Array.isArray(h.functions)&&h.functions.length<=100&&h.functions.every(n=>typeof n==='string'&&n.length<=200)&&typeof h.reason==='string'&&h.reason.length<=1000))&&!!v.parserVersions&&typeof v.parserVersions==='object'&&Object.entries(v.parserVersions).length<=10&&Object.entries(v.parserVersions).every(([k,x])=>k.length<=100&&typeof x==='string'&&x.length<=100);
}
export function summarizeChanges(value:unknown,expected?:{baseCommit:string;candidateCommit:string}):string {
 if(!isChangeClassification(value)||expected&&(value.baseCommit!==expected.baseCommit||value.candidateCommit!==expected.candidateCommit))return 'The type of change has not been checked. Inspect the complete changes.';
 const hunks=value.files.flatMap(f=>f.hunks),files=value.files.length,names=value.files.slice(0,3).map(f=>f.path.split('/').at(-1)).join(', '),where=`${files} ${files===1?'file':'files'}${names?' ('+names+(files>3?', …':'')+')':''}`;
 if(!hunks.length)return 'No changed text hunks were recorded. Inspect the complete changes.';
 if(hunks.every(h=>h.kind==='comment/docs-only'))return `Changed comments or documentation in ${where}. No executable syntax change was found.`;
 if(hunks.every(h=>['comment/docs-only','string-literal-only'].includes(h.kind)))return `Changed literal text in ${where}. Code structure is unchanged; behavior may still change.`;
 const functions=[...new Set(hunks.filter(h=>h.kind==='logic').flatMap(h=>h.functions))];
 if(hunks.some(h=>h.kind==='logic'))return functions.length?`Changed logic in ${functions.length} ${functions.length===1?'function':'functions'}: ${functions.slice(0,6).join(', ')}${functions.length>6?', …':''}. Inspect every changed file.`:`Changed logic or unrecognized syntax in ${where}. Inspect every changed file.`;
 return `Changed ${[...new Set(hunks.map(h=>h.kind))].join(' and ')} in ${where}. Inspect every changed file.`;
}
