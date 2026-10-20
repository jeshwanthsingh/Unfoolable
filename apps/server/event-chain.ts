import type {DatabaseSync} from 'node:sqlite';import {sha256} from './attestation-format.ts';
export const eventHash=(values:unknown[])=>sha256(JSON.stringify(values));
const legacyHash=(db:DatabaseSync,until:number)=>sha256(JSON.stringify(db.prepare('SELECT sequence,ticket_id,kind,data_json,created_at FROM ticket_events WHERE sequence<=? ORDER BY sequence').all(until)));
export function registerChainHash(db:DatabaseSync){db.function('sign1_event_hash',{deterministic:true,varargs:true},(...values)=>eventHash(values));}
export function migrateEventChain(db:DatabaseSync){
 db.exec(`CREATE TABLE seal_origin(id INTEGER PRIMARY KEY CHECK(id=1),legacy_sequence INTEGER NOT NULL,legacy_hash TEXT NOT NULL) STRICT;
 CREATE TABLE event_chain(sequence INTEGER PRIMARY KEY REFERENCES ticket_events(sequence) ON DELETE RESTRICT,previous_hash TEXT NOT NULL,event_hash TEXT NOT NULL) STRICT;
 CREATE TABLE event_chain_head(id INTEGER PRIMARY KEY CHECK(id=1),sequence INTEGER NOT NULL,event_hash TEXT NOT NULL) STRICT;
 CREATE TABLE verdict_attestations(event_sequence INTEGER PRIMARY KEY REFERENCES ticket_events(sequence) ON DELETE RESTRICT,ticket_id TEXT NOT NULL,dsse_json TEXT NOT NULL CHECK(json_valid(dsse_json))) STRICT;
 CREATE TABLE seal_errors(event_sequence INTEGER PRIMARY KEY REFERENCES ticket_events(sequence) ON DELETE RESTRICT,reason TEXT NOT NULL) STRICT;`);
 const until=Number(db.prepare('SELECT coalesce(max(sequence),0) AS n FROM ticket_events').get()!.n),hash=legacyHash(db,until);
 db.prepare('INSERT INTO seal_origin VALUES(1,?,?)').run(until,hash);db.prepare('INSERT INTO event_chain_head VALUES(1,?,?)').run(until,hash);
 db.exec(`CREATE TRIGGER sign1_chain AFTER INSERT ON ticket_events BEGIN
 INSERT INTO event_chain VALUES(NEW.sequence,(SELECT event_hash FROM event_chain_head WHERE id=1),sign1_event_hash((SELECT event_hash FROM event_chain_head WHERE id=1),NEW.sequence,NEW.ticket_id,NEW.kind,NEW.data_json,NEW.created_at));
 UPDATE event_chain_head SET sequence=NEW.sequence,event_hash=(SELECT event_hash FROM event_chain WHERE sequence=NEW.sequence) WHERE id=1; END;
 CREATE TRIGGER seal_no_update BEFORE UPDATE ON verdict_attestations BEGIN SELECT RAISE(ABORT,'Seals are immutable'); END;
 CREATE TRIGGER seal_no_delete BEFORE DELETE ON verdict_attestations BEGIN SELECT RAISE(ABORT,'Seals are immutable'); END;
 CREATE TRIGGER seal_no_replace BEFORE INSERT ON verdict_attestations WHEN EXISTS(SELECT 1 FROM verdict_attestations WHERE event_sequence=NEW.event_sequence) BEGIN SELECT RAISE(ABORT,'Seals are immutable'); END;`);
}
export function verifyEventChain(db:DatabaseSync){
 const origin=db.prepare('SELECT * FROM seal_origin WHERE id=1').get();if(!origin)throw Error('Log chain origin is missing');const until=Number(origin.legacy_sequence);if(legacyHash(db,until)!==origin.legacy_hash)throw Error('An older event was edited or deleted');
 let previous=String(origin.legacy_hash),last=until;
 const events=db.prepare('SELECT * FROM ticket_events WHERE sequence>? ORDER BY sequence').all(until),chain=db.prepare('SELECT * FROM event_chain ORDER BY sequence').all();if(chain.length!==events.length)throw Error('Log chain length changed (event added or deleted)');
 for(let i=0;i<events.length;i++){const e=events[i]!,c=chain[i]!,expected=eventHash([previous,e.sequence,e.ticket_id,e.kind,e.data_json,e.created_at]);if(c.sequence!==e.sequence||c.previous_hash!==previous||c.event_hash!==expected)throw Error('Log chain broken at event '+e.sequence);previous=expected;last=Number(e.sequence);}
 const head=db.prepare('SELECT * FROM event_chain_head WHERE id=1').get();if(!head||head.sequence!==last||head.event_hash!==previous)throw Error('Log chain head changed');return {sequence:last,hash:previous,legacySequence:until};
}
