import type {DatabaseSync} from 'node:sqlite';import type {BuilderIdentity} from './attestation-format.ts';
/** Only the certified runtime callback emits this kind; Builder prose is never consulted. */
export function builderIdentity(db:DatabaseSync,ticketId:string,beforeEvent:number):BuilderIdentity{
 const frozen=db.prepare("SELECT data_json,sequence FROM ticket_events WHERE ticket_id=? AND kind='candidate_frozen' AND sequence<? ORDER BY sequence DESC LIMIT 1").get(ticketId,beforeEvent);const attempt=frozen?JSON.parse(String(frozen.data_json)).attemptId:null;
 const unknown:BuilderIdentity={model:'unknown',modelVersion:'unknown',codexCliVersion:'unknown',source:'unknown'};if(typeof attempt!=='string')return unknown;
 const row=db.prepare("SELECT data_json FROM ticket_events WHERE ticket_id=? AND sequence<? AND kind='agent_event' AND json_extract(data_json,'$.kind')='builder_identity' AND json_extract(data_json,'$.attemptId')=? ORDER BY sequence DESC LIMIT 1").get(ticketId,Number(frozen!.sequence),attempt);if(!row)return unknown;
 const data=JSON.parse(String(row.data_json)).data;if(data?.source!=='certified-runtime'||data.model!=='gpt-6.1-sol'||data.codexCliVersion!=='0.160.0')throw Error('Recorded Builder identity is invalid.');return {model:data.model,modelVersion:'unknown',codexCliVersion:data.codexCliVersion,source:'certified-runtime'};
}
