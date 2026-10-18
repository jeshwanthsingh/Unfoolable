#!/usr/bin/env python3
"""Local Litestream installation, private file checkpoints and offline restore proof."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import sqlite3
import subprocess
import sys
import tarfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
HOME = Path.home()
SETTINGS = HOME / '.config/unfoolable/backup.json'
ENV = {'HOME': str(HOME), 'PATH': '/usr/bin:/bin', 'TZ': 'UTC', 'LANG': 'en_US.UTF-8'}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    tmp = path.with_name(path.name + '.new')
    tmp.write_text(json.dumps(value, indent=2) + '\n')
    tmp.chmod(0o600)
    tmp.replace(path)


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def database_identity(path):
    db = sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)
    try:
        db.execute('BEGIN')
        tables = {}
        rows = db.execute("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' ORDER BY name").fetchall()
        for name, schema in rows:
            values = sorted(repr(tuple(r)) for r in db.execute('SELECT * FROM "' + name.replace('"', '""') + '"'))
            tables[name] = {'rows': len(values), 'sha256': hashlib.sha256((schema + '\n' + '\n'.join(values)).encode()).hexdigest()}
        return tables
    finally:
        db.close()


def require_protected_store(path, home=HOME):
    resolved = path.resolve()
    # Reuse existing Builder deny roots. Never create a new readable oracle copy.
    if not any(resolved.is_relative_to((home / root).resolve()) for root in ['.config', '.bench-private']):
        raise ValueError('Backup storage must resolve inside ~/.config or ~/.bench-private, already denied to Builder')
    return resolved


def exclude_data_file(path):
    return path.parts[0].startswith('command-center.sqlite') or path.parts[0] in {'.coordinator.lock', '.coordinator-recovery.lock'}


def safe_member(name):
    p = Path(name)
    if p.is_absolute() or '..' in p.parts or not p.parts:
        raise ValueError('Unsafe backup member path')
    return p


def run(argv, timeout=120):
    return subprocess.check_output([str(v) for v in argv], env=ENV, stderr=subprocess.PIPE, timeout=timeout, text=True)


def read_config():
    c = json.loads(SETTINGS.read_text())
    c['backupDir'] = str(require_protected_store(Path(c['backupDir'])))
    return c


def install(args):
    data = Path(args.data_dir).expanduser().resolve()
    if not (data / 'command-center.sqlite').is_file():
        raise ValueError('Choose an existing Unfoolable data directory; no empty database will be created')
    tool = Path(args.litestream).expanduser().resolve()
    if run([tool, 'version']).strip() != '0.5.17':
        raise ValueError('This configuration was verified with Litestream 0.5.17')
    agents = HOME / 'Library/LaunchAgents'
    for name in ['local.unfoolable.litestream', 'local.unfoolable.backup-files']:
        if (agents / (name + '.plist')).exists():
            raise FileExistsError('Existing backup agent left untouched; stop/remove only these agents before reconfiguring')
    friendly = Path(args.backup_dir).expanduser()
    if friendly == HOME / 'UnfoolableBackups' and not friendly.exists() and not friendly.is_symlink():
        target = HOME / '.config/unfoolable/backups'
        target.mkdir(parents=True, exist_ok=True, mode=0o700)
        friendly.symlink_to(target, target_is_directory=True)
    backup = require_protected_store(friendly)
    backup.mkdir(parents=True, exist_ok=True, mode=0o700)
    backup.chmod(0o700)
    config_dir = SETTINGS.parent
    config_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    config_dir.chmod(0o700)
    c = {'dataDir': str(data), 'backupDir': str(backup), 'friendlyPath': str(friendly), 'litestream': str(tool), 'socket': str(config_dir / 'ls.sock'), 'fileIntervalSeconds': 300, 'fileSnapshotsKept': 3}
    write_json(SETTINGS, c)
    yaml = 'logging:\n  level: warn\nsocket:\n  enabled: true\n  path: ' + json.dumps(c['socket']) + '\nsnapshot:\n  interval: 24h\n  retention: 168h\ndbs:\n  - path: ' + json.dumps(str(data / 'command-center.sqlite')) + '\n    replica:\n      type: file\n      path: ' + json.dumps(str(backup / 'sqlite')) + '\n      sync-interval: 1s\n'
    (config_dir / 'litestream.yml').write_text(yaml)
    (config_dir / 'litestream.yml').chmod(0o600)
    agents = HOME / 'Library/LaunchAgents'
    agents.mkdir(parents=True, exist_ok=True)
    for name, command, extra in [
        ('local.unfoolable.litestream', [sys.executable, str(Path(__file__).resolve()), 'replicate'], {'KeepAlive': True, 'ThrottleInterval': 30}),
        ('local.unfoolable.backup-files', [sys.executable, str(Path(__file__).resolve()), 'snapshot'], {'StartInterval': c['fileIntervalSeconds']}),
    ]:
        plist = {'Label': name, 'ProgramArguments': command, 'WorkingDirectory': str(ROOT), 'RunAtLoad': True, 'Umask': 63, 'StandardOutPath': str(config_dir / (name + '.log')), 'StandardErrorPath': str(config_dir / (name + '.log')), **extra}
        path = agents / (name + '.plist')
        if path.exists():
            raise FileExistsError('Existing launch agent left untouched: ' + str(path))
        path.write_bytes(plistlib.dumps(plist)); path.chmod(0o600)
        subprocess.run(['/bin/launchctl', 'bootstrap', 'gui/' + str(os.getuid()), str(path)], check=True, env=ENV)
    print('Local replication and five-minute private file checkpoints installed. No cloud destination.')


def external_roots(data):
    db = sqlite3.connect((data / 'command-center.sqlite').as_uri() + '?mode=ro', uri=True)
    try:
        roots = set()
        for (raw,) in db.execute("SELECT data_json FROM ticket_events WHERE kind='candidate_frozen'"):
            repo = Path(json.loads(raw)['candidate']['repo']).resolve()
            if repo.is_relative_to(data):
                continue
            if not any(repo.is_relative_to(p) for p in [HOME / '.cc-work', ROOT / '.work/builder-workspaces']):
                raise ValueError('External Candidate location requires an explicit backup review')
            if not repo.is_dir():
                raise FileNotFoundError('Referenced Candidate repository is missing: ' + str(repo))
            roots.add(repo.parent)
        return sorted(roots)
    finally:
        db.close()


def snapshot(c):
    data, backup = Path(c['dataDir']), Path(c['backupDir'])
    with (backup / 'files.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return {'skipped': 'A file checkpoint is already running'}
        db_path = data / 'command-center.sqlite'
        db = sqlite3.connect(db_path.as_uri() + '?mode=ro', uri=True)
        active = db.execute("SELECT count(*) FROM tickets WHERE status IN ('queued','building','checking','fixing')").fetchone()[0]; db.close()
        if active:
            return {'skipped': 'File checkpoint waits for idle; SQLite replication continues'}
        before = database_identity(db_path)
        application_hash = hashlib.sha256(json.dumps(before, sort_keys=True).encode()).hexdigest()
        previous = backup / 'last-success.json'
        if previous.exists() and json.loads(previous.read_text()).get('applicationIdentitySha256') == application_hash:
            return {'skipped': 'No application changes since last complete checkpoint'}
        sources = [('data', data)] + [('external/' + str(i), p) for i, p in enumerate(external_roots(data))]
        checkpoint = 'snapshot-' + time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + uuid.uuid4().hex[:8]
        scratch = ROOT / '.work/cleanup' / checkpoint
        scratch.mkdir(parents=True, mode=0o700)
        archive = scratch / (checkpoint + '.tar.gz')
        entries = []
        try:
            with tarfile.open(archive, 'w:gz', compresslevel=1, dereference=False) as tar:
                for label, source in sources:
                    for parent, dirs, files in os.walk(source, followlinks=False):
                        for name in sorted(dirs + files):
                            path = Path(parent) / name
                            rel = path.relative_to(source)
                            if label == 'data' and exclude_data_file(rel):
                                if name in dirs: dirs.remove(name)
                                continue
                            if not (path.is_symlink() or path.is_file() or path.is_dir()):
                                raise ValueError('Cannot checkpoint special file: ' + str(path))
                            entry = str(Path(label) / rel)
                            before_stat = path.lstat()
                            tar.add(path, arcname=entry, recursive=False)
                            if path.is_symlink(): entries.append({'path': entry, 'link': os.readlink(path)})
                            elif path.is_file():
                                entries.append({'path': entry, 'sha256': digest(path)})
                                after_stat = path.lstat()
                                if (before_stat.st_size, before_stat.st_mtime_ns) != (after_stat.st_size, after_stat.st_mtime_ns):
                                    raise ValueError('A file changed during checkpoint; previous checkpoint kept')
                run([c['litestream'], 'sync', '-socket', c['socket'], '-wait', '-timeout', '60', db_path])
                restored = scratch / 'database.sqlite'
                run([c['litestream'], 'restore', '-integrity-check', 'full', '-o', restored, (backup / 'sqlite').as_uri()])
                after = database_identity(db_path)
                if before != after or before != database_identity(restored):
                    raise ValueError('Application changed during checkpoint; previous checkpoint kept')
                manifest = {'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'sources': [{'label': a, 'originalPath': str(b)} for a, b in sources], 'tables': before, 'entries': entries, 'databaseSha256': digest(restored)}
                write_json(scratch / 'manifest.json', manifest)
                tar.add(restored, arcname='database.sqlite', recursive=False)
                tar.add(scratch / 'manifest.json', arcname='manifest.json', recursive=False)
            published = backup / archive.name
            shutil.copyfile(archive, published.with_suffix('.partial'))
            published.with_suffix('.partial').chmod(0o600)
            published.with_suffix('.partial').replace(published)
            status = {'archive': published.name, 'archiveSha256': digest(published), 'createdAt': manifest['createdAt'], 'files': len(entries), 'bytes': published.stat().st_size, 'sourceRoots': len(sources), 'applicationIdentitySha256': application_hash}
            write_json(backup / 'last-success.json', status)
            for old in sorted(backup.glob('snapshot-*.tar.gz'))[:-c['fileSnapshotsKept']]: old.unlink()
            return status
        finally:
            shutil.rmtree(scratch)


def restore_bundle(backup, status, output):
    if output.exists() or output.is_symlink():
        raise FileExistsError('Restore output must not exist; nothing was overwritten')
    archive = backup / safe_member(status['archive'])
    if digest(archive) != status['archiveSha256']:
        raise ValueError('Backup archive changed')
    output.mkdir(parents=True, mode=0o700)
    with tarfile.open(archive, 'r:gz') as tar:
        members = tar.getmembers()
        for m in members: safe_member(m.name)
        # Restore symlinks last, so no extraction write can traverse one.
        tar.extractall(output, members=[m for m in members if not m.issym()], filter='data')
        for m in members:
            if m.issym():
                target = output / safe_member(m.name)
                target.parent.mkdir(parents=True, exist_ok=True)
                os.symlink(m.linkname, target)
    manifest = json.loads((output / 'manifest.json').read_text())
    for entry in manifest['entries']:
        p = output / safe_member(entry['path'])
        if 'link' in entry:
            if not p.is_symlink() or os.readlink(p) != entry['link']: raise ValueError('Restored link mismatch')
        elif p.is_symlink() or digest(p) != entry['sha256']:
            raise ValueError('Restored evidence file mismatch')
    restored_db = output / 'database.sqlite'
    if digest(restored_db) != manifest['databaseSha256'] or database_identity(restored_db) != manifest['tables']:
        raise ValueError('Restored database identity mismatch')
    db = sqlite3.connect(restored_db.as_uri() + '?mode=ro', uri=True)
    try:
        if db.execute('PRAGMA integrity_check').fetchall() != [('ok',)] or db.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('Restored database integrity failed')
    finally:
        db.close()
    return {'restoredFiles': len(manifest['entries']), 'databaseTables': len(manifest['tables']), 'passkeys': manifest['tables'].get('human_passkey', {}).get('rows', 0), 'ticketEvents': manifest['tables'].get('ticket_events', {}).get('rows', 0), 'allTableDigestsMatch': True, 'allFileDigestsMatch': True, 'integrityCheck': 'ok', 'foreignKeyErrors': 0, 'output': str(output)}


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    install_parser = sub.add_parser('install')
    install_parser.add_argument('--data-dir', required=True)
    install_parser.add_argument('--backup-dir', default=str(HOME / 'UnfoolableBackups'))
    install_parser.add_argument('--litestream', default=str(ROOT / '.work/backup-tools/v0.5.17/litestream'))
    sub.add_parser('replicate'); sub.add_parser('snapshot'); sub.add_parser('status')
    restore_parser = sub.add_parser('restore'); restore_parser.add_argument('--output', required=True)
    args = parser.parse_args()
    if args.command == 'install': return install(args)
    c = read_config()
    if args.command == 'replicate':
        if not (Path(c['dataDir']) / 'command-center.sqlite').is_file(): raise ValueError('Source database missing; refusing to create one')
        os.execve(c['litestream'], [c['litestream'], 'replicate', '-no-expand-env', '-config', str(SETTINGS.parent / 'litestream.yml')], ENV)
    if args.command == 'snapshot': print(json.dumps(snapshot(c)))
    elif args.command == 'status': print(run([c['litestream'], 'info', '-json', '-socket', c['socket']]))
    elif args.command == 'restore': print(json.dumps(restore_bundle(Path(c['backupDir']), json.loads((Path(c['backupDir']) / 'last-success.json').read_text()), Path(args.output).expanduser().resolve())))

if __name__ == '__main__':
    main()
