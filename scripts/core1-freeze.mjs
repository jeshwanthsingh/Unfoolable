// Run once on the pre-refactor source; refuses to replace the golden record.
import {readFileSync,writeFileSync,mkdirSync,chmodSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {scoreV1} from '../packages/shared/verification-v1.ts';
const output=resolve('artifacts/core1/golden.json');
const db=new DatabaseSync(resolve('.work/ticket-loop-v1/app-data/command-center.sqlite'),{readOnly:true});
try{
 db.exec('BEGIN');
 const tickets=db.prepare('SELECT id,status,check_verdict,attempt_count FROM tickets ORDER BY id').all();
 const checks=db.prepare("SELECT sequence,ticket_id,data_json,created_at FROM ticket_events WHERE kind='check_result' ORDER BY sequence").all().map(row=>({sequence:row.sequence,ticketId:row.ticket_id,at:row.created_at,record:JSON.parse(row.data_json)}));
 const runtime=db.prepare("SELECT sequence,ticket_id,kind,data_json,created_at FROM ticket_events WHERE kind IN ('state_changed','needs_you','cleanup') ORDER BY sequence").all().map(row=>{const d=JSON.parse(row.data_json);return {sequence:row.sequence,ticketId:row.ticket_id,at:row.created_at,kind:row.kind,...(d.to?{from:d.from,to:d.to}:{}),...(d.reason?{reason:d.reason}:{}),...(d.kind?{cause:d.kind}:{}),...(d.cleanupUncertain!==undefined?{cleanupUncertain:d.cleanupUncertain}:{})};});
 const runs=db.prepare('SELECT id,state,result_json,error FROM verify_only_runs ORDER BY id').all().map(row=>({id:row.id,state:row.state,error:row.error,result:row.result_json?JSON.parse(row.result_json):null}));
 const study=JSON.parse(readFileSync('artifacts/warning-signal/old/results.json','utf8')).map(row=>({id:row.case,expected:row.actualVerdict,reasons:row.gaps,layers:row.layers,writer:row.writer}));
 const replay=[];
 for(const row of study)if(row.layers.length)replay.push({id:'study:'+row.id,facts:{path:'native',layers:row.layers,gaps:row.reasons},expected:scoreV1(row.layers,row.reasons)});
 for(const run of runs)if(run.result?.v1){const v=run.result.v1;replay.push({id:'verification:'+run.id,facts:{path:'native',layers:v.layers,gaps:v.gaps},expected:scoreV1(v.layers,v.gaps)});}
 for(const check of checks){const d=check.record;if(d.playbookHash)replay.push({id:'playbook:'+check.sequence,facts:{path:'playbook',failures:d.failures,gaps:d.gaps},expected:{verdict:d.failures.length?'FAILED':'PASSED WITH GAPS',canLand:d.failures.length===0}});}
 const negatives=JSON.parse(readFileSync('artifacts/office3/negative-controls.json','utf8')).results;
 const payload={version:1,source:'3c94150',tickets,checks,runtime,runs,study,negativeControls:negatives,replay};
 const body=JSON.stringify(payload,null,2)+'\n';mkdirSync(resolve('artifacts/core1'),{recursive:true});writeFileSync(output,body,{flag:'wx',mode:0o444});
 writeFileSync(output+'.sha256',createHash('sha256').update(body).digest('hex')+'\n',{flag:'wx',mode:0o444});chmodSync(output,0o444);
 console.log(JSON.stringify({tickets:tickets.length,checkResults:checks.length,runtimeEvents:runtime.length,verificationRuns:runs.length,study:study.length,negativeControls:negatives.length,replay:replay.length}));
 db.exec('COMMIT');
}finally{db.close();}
