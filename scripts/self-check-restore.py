"""Verified backup restore into a new disposable directory. Never repairs live data."""
import json, sys
from pathlib import Path
from backup import read_config, snapshot, restore_bundle
c=read_config()
if Path(c['dataDir']).resolve()!=Path(sys.argv[1]).resolve():
    raise ValueError('Backup configuration belongs to another data directory')
snapshot(c,force=True)
status=json.loads((Path(c['backupDir'])/'last-success.json').read_text())
r=restore_bundle(Path(c['backupDir']),status,Path(sys.argv[2]).resolve())
print(json.dumps({'restored':r['allTableDigestsMatch'] and r['allFileDigestsMatch'] and r['integrityCheck']=='ok' and r['foreignKeyErrors']==0,'proof':r}))
