export type ContextErrorCode='REPOSITORY_CHANGED_DURING_CAPTURE'|'REPOSITORY_UNAVAILABLE'|'REPOSITORY_IDENTITY_MISMATCH'|'CONTEXT_CAPTURE_LIMIT'|'CONTEXT_CAPTURE_FAILED'|'CONTEXT_STORAGE_FAILED'|'CONTEXT_CAPTURE_BUSY';
export class ContextError extends Error {
 readonly code:ContextErrorCode;readonly status:number;
 constructor(code:ContextErrorCode,message:string,status:number){super(message);this.code=code;this.status=status;}
}
