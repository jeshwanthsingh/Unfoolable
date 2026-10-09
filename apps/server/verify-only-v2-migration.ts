import type {DatabaseSync} from 'node:sqlite';
export function migrateVerifyOnlyV2(db:DatabaseSync){
 db.exec(`ALTER TABLE verify_only_runs ADD COLUMN protocol_version INTEGER NOT NULL DEFAULT 1 CHECK(protocol_version IN(1,2));
 ALTER TABLE verify_only_runs ADD COLUMN ledger_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(ledger_json));
 CREATE TRIGGER verify_only_protocol_fixed BEFORE UPDATE OF protocol_version ON verify_only_runs WHEN NEW.protocol_version!=OLD.protocol_version BEGIN SELECT RAISE(ABORT,'Verifier protocol is immutable'); END;
 CREATE TRIGGER verify_only_required_fixed BEFORE UPDATE OF ledger_json ON verify_only_runs WHEN json_extract(OLD.ledger_json,'$.requiredList') IS NOT NULL AND json_extract(NEW.ledger_json,'$.requiredList') IS NOT json_extract(OLD.ledger_json,'$.requiredList') BEGIN SELECT RAISE(ABORT,'Required check list is immutable'); END;
 CREATE TRIGGER verify_only_decision_fixed BEFORE UPDATE OF ledger_json ON verify_only_runs WHEN (json_extract(OLD.ledger_json,'$.waiver') IS NOT NULL AND json_extract(NEW.ledger_json,'$.waiver') IS NOT json_extract(OLD.ledger_json,'$.waiver')) OR (json_extract(OLD.ledger_json,'$.abandonedAt') IS NOT NULL AND json_extract(NEW.ledger_json,'$.abandonedAt') IS NOT json_extract(OLD.ledger_json,'$.abandonedAt')) BEGIN SELECT RAISE(ABORT,'Human waiver and abandonment are immutable'); END;`);
}
