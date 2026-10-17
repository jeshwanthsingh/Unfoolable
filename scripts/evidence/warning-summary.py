"""Read-only Round A.1 reporting; no scoring, authoring or case modifications."""
import json,csv
from pathlib import Path
root=Path('artifacts/warning-signal')
for name in ['old','fresh']:
 rows=json.loads((root/name/'results.json').read_text());correct=[r for r in rows if r['truth']=='CORRECT'];wrong=[r for r in rows if r['truth']=='WRONG'];started=[r for r in rows if (r.get('writer')or{}).get('started')];unknown=[r['case'] for r in started if not (r.get('writer')or{}).get('usage')];tokens=sum(((r.get('writer')or{}).get('usage')or{}).get('totalTokens',0) for r in rows)
 summary={'set':name,'cases':len(rows),'correct':len(correct),'wrong':len(wrong),'confirmed':sum(r['studyVerdict']=='VERIFIED' for r in correct),'falseAccepts':sum(r['studyVerdict']=='VERIFIED' for r in wrong),'redWrong':sum(bool(r.get('redWarning')) for r in wrong),'redCorrect':sum(bool(r.get('redWarning')) for r in correct),'writerStarted':len(started),'tokens':None if unknown else tokens,'averageTokensPerTicket':None if unknown else tokens/len(rows),'averageTokensPerStartedWriter':None if unknown or not started else tokens/len(started),'unknownUsage':unknown,'blocked':[{'case':r['case'],'error':r.get('error'),'gaps':r.get('gaps',[])} for r in rows if r['studyVerdict']=='ERROR'],'notStarted':[r['case'] for r in rows if not (r.get('writer')or{}).get('started')],'writerCheckErrors':[{'case':r['case'],'checks':(r.get('writer')or{}).get('checks',[]),'reason':(r.get('writer')or{}).get('reason')} for r in rows if any('ERROR' in c.get('base',[]) or c.get('candidate')=='ERROR' for c in (r.get('writer')or{}).get('checks',[]))]}
 (root/name/'warning-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
 with (root/name/'cases.csv').open('w') as f:
  w=csv.writer(f);w.writerow(['case','truth','study_verdict','actual_verdict','red_warning','writer_started','tokens','seconds','reason'])
  for r in rows:
   writer=r.get('writer')or{};w.writerow([r['case'],r['truth'],r['studyVerdict'],r['actualVerdict'],r.get('redWarning',False),writer.get('started',False),(writer.get('usage')or{}).get('totalTokens','unavailable' if writer.get('started') else 0),round(r['elapsedSeconds'],2),r.get('error')or writer.get('reason')or ''])
 print(json.dumps({k:v for k,v in summary.items() if k not in ['blocked','notStarted']}))
