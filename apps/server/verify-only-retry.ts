import {AnalysisError} from './analysis-errors.ts';
import {appendFileSync,existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {canonicalContractJson} from './contract-store.ts';
import type {OracleExecution} from './oracle-execution.ts';

export function retryableHarnessError(error:unknown):boolean {
 return error instanceof AnalysisError && error.cleanupCertified && ['ANALYSIS_OWNERSHIP_UNKNOWN','ANALYSIS_TIMEOUT','CODEX_UNAVAILABLE'].includes(error.code);
}
export function retryableExecution(result:OracleExecution):boolean {
 if(!result.cleanup.verified||result.cleanup.ambiguous||result.cleanup.remaining.length||result.status==='PASS'||result.status==='FAIL'||result.truncated)return false;
 try {const rows=JSON.parse(result.output).observations;return Array.isArray(rows)&&rows.some((r:{exception?:{phase?:string;type?:string;name?:string}})=>['suite','concurrent','cli'].includes(r.exception?.phase??'')&&['PermissionError','FileNotFoundError','OSError'].includes(r.exception?.type??r.exception?.name??''));}catch{return false;}
}
export async function harnessRetry<T>(step:string,directory:string,signal:AbortSignal,job:(attempt:0|1)=>Promise<T>,retryResult:(value:T)=>boolean=()=>false):Promise<T> {
 for(const attempt of [0,1] as const){
  try {const value=await job(attempt);if(attempt===1||signal.aborted||!retryResult(value))return value;
   appendFileSync(join(directory,'harness-retries.jsonl'),canonicalContractJson({step,attempt:1,reason:'Certified environment failure',result:value,at:new Date().toISOString()})+'\n',{mode:0o600});
  } catch(error) {if(attempt===1||signal.aborted||!retryableHarnessError(error))throw error;
   appendFileSync(join(directory,'harness-retries.jsonl'),canonicalContractJson({step,attempt:1,reason:error instanceof AnalysisError?error.code:'Harness error',at:new Date().toISOString()})+'\n',{mode:0o600});
  }
 }
 throw Error('Unreachable retry state');
}

export function retryEvidence(directory:string):{path:string;hash:string}[]{
 const path=join(directory,'harness-retries.jsonl');if(!existsSync(path))return [];
 const paths=[path];for(const line of readFileSync(path,'utf8').trim().split('\n')){const record=JSON.parse(line);const observation=record.result?.environment?.observationPath;if(typeof observation==='string')paths.push(observation);}
 return [...new Set(paths)].map(path=>({path,hash:createHash('sha256').update(readFileSync(path)).digest('hex')}));
}
