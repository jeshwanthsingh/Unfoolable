"""Verified backup restore into a new disposable directory. Never repairs live data."""
import json, sys, time
from pathlib import Path
from backup import read_config, snapshot, restore_bundle
started=time.monotonic()
c=read_config()
if Path(c['dataDir']).resolve()!=Path(sys.argv[1]).resolve():
    raise ValueError('Backup configuration belongs to another data directory')
status=snapshot(c,force=True)
if status.get('skipped') or not status.get('archive') or not status.get('archiveSha256'):
    raise ValueError('A fresh backup snapshot was not completed: '+str(status.get('skipped','missing checkpoint')))

r=restore_bundle(Path(c['backupDir']),status,Path(sys.argv[2]).resolve())
print(json.dumps({'restored':r['allTableDigestsMatch'] and r['allFileDigestsMatch'] and r['integrityCheck']=='ok' and r['foreignKeyErrors']==0,'complete':True,'mode':'full','elapsedSeconds':time.monotonic()-started,'files':r['restoredFiles'],'proof':r}))
