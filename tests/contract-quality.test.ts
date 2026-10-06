import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkContractQuality} from '../scripts/contract-quality-check.ts';
import type {ContractPayload} from '../packages/shared/contracts.ts';
test('clear bug quality check accepts equivalent no-additional-effect behavior without exact English wording',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/contract-quality.json',import.meta.url),'utf8')).find((f:{name:string})=>f.name==='clear-bug');
 const payload=fixture.payload as ContractPayload;payload.requirements[0]!.text='Repeated delivery of the same logical event must not create additional persisted events.';
 assert.equal(checkContractQuality('clear-bug',payload),true);
 payload.requirements[0]!.text='Create additional persisted events for every repeated delivery.';
 assert.equal(checkContractQuality('clear-bug',payload),false);
 assert.throws(()=>checkContractQuality('unknown-case',payload));
});
