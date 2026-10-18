import importlib.util
import sqlite3
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("backup", Path(__file__).resolve().parents[1] / "scripts/backup.py")
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)

class BackupTests(unittest.TestCase):
    def test_application_digest_ignores_replication_metadata(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "db.sqlite"
            c = sqlite3.connect(p)
            c.executescript("CREATE TABLE human_passkey(id, public_key BLOB); INSERT INTO human_passkey VALUES(1,x'1234'); CREATE TABLE _litestream_seq(id); INSERT INTO _litestream_seq VALUES(1);")
            c.commit()
            before = backup.database_identity(p)
            c.execute("UPDATE _litestream_seq SET id=2"); c.commit()
            self.assertEqual(before, backup.database_identity(p))
            c.execute("UPDATE human_passkey SET public_key=x'5678'"); c.commit()
            self.assertNotEqual(before, backup.database_identity(p)); c.close()

    def test_backup_store_must_be_inside_existing_denied_root(self):
        with tempfile.TemporaryDirectory() as d:
            home = Path(d)
            protected = home / ".config/unfoolable/backups"; protected.mkdir(parents=True)
            backup.require_protected_store(protected, home)
            with self.assertRaises(ValueError): backup.require_protected_store(home / "public", home)

    def test_friendly_link_resolves_to_protected_store(self):
        with tempfile.TemporaryDirectory() as d:
            home = Path(d); target = home / ".config/backup"; target.mkdir(parents=True)
            link = home / "UnfoolableBackups"; link.symlink_to(target)
            backup.require_protected_store(link, home)
            outside = home / ".config/escape"; outside.symlink_to(home / "public")
            with self.assertRaises(ValueError): backup.require_protected_store(outside, home)

    def test_live_database_and_lock_files_are_not_raw_copied(self):
        for name in ["command-center.sqlite", "command-center.sqlite-wal", "command-center.sqlite-shm", ".coordinator.lock"]:
            self.assertTrue(backup.exclude_data_file(Path(name)))
        self.assertFalse(backup.exclude_data_file(Path("playbooks/current.json")))
        self.assertFalse(backup.exclude_data_file(Path("ticket-operator.key")))

    def test_restore_rejects_existing_destination(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(FileExistsError): backup.restore_bundle(Path(d), {}, Path(d))

    def test_archive_paths_reject_traversal(self):
        for path in ["../escape", "/etc/file", "data/../../escape"]:
            with self.assertRaises(ValueError): backup.safe_member(path)
        self.assertEqual(backup.safe_member("data/oracles/check.py"), Path("data/oracles/check.py"))

if __name__ == "__main__": unittest.main(verbosity=2)
