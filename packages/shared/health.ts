export const APP_VERSION = '0.0.1';
export type ApiError = {error:{code:string;message:string}};
export type HealthResponse =
 | {status:'ok';version:string;coordinator:'online';database:{status:'ready';schemaVersion:number}}
 | {status:'error';version:string;coordinator:'online';database:{status:'unavailable'};error:{code:string;message:string}};

// HTTP JSON is untrusted even when the server is local.
export function isHealthResponse(value:unknown):value is HealthResponse {
 if(!value || typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 if(typeof v.version!=='string'||v.coordinator!=='online'||!v.database||typeof v.database!=='object')return false;
 const d=v.database as Record<string,unknown>;
 if(v.status==='ok')return d.status==='ready'&&typeof d.schemaVersion==='number'&&Number.isInteger(d.schemaVersion)&&d.schemaVersion>0;
 if(v.status==='error'&&d.status==='unavailable'&&v.error&&typeof v.error==='object'){
  const e=v.error as Record<string,unknown>;return typeof e.code==='string'&&typeof e.message==='string';
 }
 return false;
}
