from pathlib import Path
import json,collections,subprocess,re
root=Path.cwd();work=root/'.work/rules1';out=root/'artifacts/rules1';manifest=json.loads((out/'STUDY.json').read_text());source=json.loads((root/'.work/test-writer/data/scoring-set.json').read_text());rows=[]
def git(repo,*args):return subprocess.check_output(['git','--no-optional-locks','--no-replace-objects','-c','core.hooksPath=/dev/null','-C',repo,*args],text=True).splitlines()
def scope_flags(r):
 case=next(c for c in source['cases'] if c['id']==r['case']);ref=next(c for c in source['cases'] if c['truth']=='CORRECT' and c['task']==case['task']);allowed=set(git(ref['repo'],'diff','--name-only',ref['base'],ref['candidate']));base=set(git(r['candidate']['repo'],'ls-tree','-r','--name-only',r['base']));return [p for p in r['paths'] if p not in allowed and not (p not in base and re.search(r'(?:^|/)test_[^/]+\.py$|\.(?:test|spec)\.[cm]?[jt]sx?$',p))]

for trial in manifest['trials']:
 found=[]
 for start in (work/'data/trials').glob('*/STARTED.json'):
  x=json.loads(start.read_text())
  if x['case']==trial['case'] and x['arm']==trial['arm']:found.append(start.parent)
 if len(found)>1:raise RuntimeError('Duplicate real trial identity')
 if not found:continue
 folder=found[0];p=folder/('recheck.json' if (folder/'recheck.json').exists() else 'result.json')
 if not p.exists():continue
 r=json.loads(p.read_text())
 if p.name=='recheck.json':
  original=json.loads((folder/'result.json').read_text()); r['elapsedSeconds']+=original['elapsedSeconds']
 setup_only=r['usageTokens'] is None and r['candidate'] is None and r.get('instructionsSHA256') is None
 if setup_only:continue
 metrics=r['candidate'] is not None
 rows.append({k:r.get(k) for k in ['case','arm','verdict','usageTokens','elapsedSeconds','error','instructionsSHA256']}|{'candidate':r['candidate']['commit'] if metrics else None,'changedLines':r['changedLines'] if metrics else None,'filesTouched':r['filesTouched'] if metrics else None,'scopeFlags':scope_flags(r) if metrics else None,'budgetStop':r['candidate'] is None and (r['usageTokens'] or 0)>manifest['limits']['maxCodexTokens'],'rawAttemptStatus':r['verdict'],'scoringRepair':r.get('scoringRepair')})
summary={}
for arm in ['OFF','ON']:
 rs=[r for r in rows if r['arm']==arm];complete=[r for r in rs if r['candidate']];summary[arm]={'realTrials':len(rs),'frozenOutputs':len(complete),'budgetStops':sum(r.get('budgetStop',False) for r in rs),'verdicts':dict(collections.Counter(r['verdict'] for r in rs)),'checked':sum(r['verdict'] in ('VERIFIED','PASSED WITH GAPS') for r in rs),'recordedChangedLines':sum(r['changedLines'] for r in complete),'recordedFilesTouched':sum(r['filesTouched'] for r in complete),'potentialOutOfScopeFiles':sum(len(r['scopeFlags']) for r in complete),'reportedTokens':sum(r['usageTokens'] or 0 for r in rs),'unknownUsage':sum(r['usageTokens'] is None for r in rs),'tokensPerStartedTrial':sum(r['usageTokens'] or 0 for r in rs)/len(rs) if rs else None}
a,b=summary['OFF'],summary['ON'];complete=len(rows)==38 and all(s['frozenOutputs']==19 and not s['unknownUsage'] for s in summary.values());vc=lambda r,k:r['verdicts'].get(k,0)
checks={'completeComparableMetrics':complete,'ONCheckedAtLeastOFF':b['checked']>=a['checked'],'ONVerifiedAtLeastOFF':vc(b,'VERIFIED')>=vc(a,'VERIFIED'),'ONFailedNoMoreThanOFF':vc(b,'FAILED')<=vc(a,'FAILED'),'ONErrorsNoMoreThanOFF':vc(b,'ERROR')<=vc(a,'ERROR'),'ONNotCheckedNoMoreThanOFF':vc(b,'NOT CHECKED')<=vc(a,'NOT CHECKED'),'ONChangedLinesNoLarger':b['recordedChangedLines']<=a['recordedChangedLines'],'ONFilesNoMore':b['recordedFilesTouched']<=a['recordedFilesTouched'],'ONScopeFlagsNoMore':b['potentialOutOfScopeFiles']<=a['potentialOutOfScopeFiles']}
paired=[]
for case in dict.fromkeys(t['case'] for t in manifest['trials']):
 arows=[r for r in rows if r['case']==case and r['arm']=='OFF' and r['candidate']];brows=[r for r in rows if r['case']==case and r['arm']=='ON' and r['candidate']]
 if arows and brows:paired.append({'case':case,'OFF':arows[0],'ON':brows[0]})
paired_summary={'pairs':len(paired),'selection':'Both arms produced a frozen output; descriptive only, never substitutes for missing whole-set metrics.'}
for arm in ['OFF','ON']:paired_summary[arm]={'changedLines':sum(p[arm]['changedLines'] for p in paired),'filesTouched':sum(p[arm]['filesTouched'] for p in paired),'scopeFlags':sum(len(p[arm]['scopeFlags']) for p in paired)}
if not complete:
 for key in ['ONChangedLinesNoLarger','ONFilesNoMore','ONScopeFlagsNoMore']: checks[key]=None
report={'trials':len(rows),'planned':38,'summary':summary,'pairedFrozenDiffs':paired_summary,'promotionChecks':checks,'decision':'ON' if all(checks.values()) else 'OFF','notes':['19 paired rows, repeated tasks; old correct/wrong labels do not label new outputs.','Missing frozen outputs have unknown diff size; zero is never substituted.','No hidden-grading slots consumed. Existing guards do not prove unchecked intent.','Raw ERROR attempt statuses caused by a token stop are not protected-check ERROR verdicts; those attempts never reached checking.'],'rows':rows};(out/'comparison.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='rows'},indent=2))
