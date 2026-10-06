type StartupCode='INVALID_CONFIG'|'DATABASE_IN_USE'|'UNSUPPORTED_SCHEMA';
export const failure=(code:StartupCode,message:string)=>Object.assign(new Error(message),{code});
export function publicStartupError(error:unknown):{code:string;message:string} {
 if(error instanceof Error && 'code' in error){
  if(['INVALID_CONFIG','DATABASE_IN_USE','UNSUPPORTED_SCHEMA'].includes(String(error.code)))return {code:String(error.code),message:error.message};
  if(error.code==='EADDRINUSE')return {code:'ADDRESS_IN_USE',message:'The configured local port is already in use'};
 }
 return {code:'STARTUP_FAILED',message:'Unable to initialize the local application; check data directory permissions and runtime'};
}
