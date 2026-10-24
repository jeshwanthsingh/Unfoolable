import {changeKinds} from '../../packages/shared/change-classification.ts';
import {repositoryIdentity} from './repository-identity.ts';
import {qualityGateNames} from '../../packages/shared/quality-gates.ts';
import {proposeQualityGates,qualityPolicyHash} from './quality-gates.ts';
import {requireHuman} from './human-context.ts';
import {dataMode,fixtureApprovalsEnabled,assertDataEntry} from './data-mode.ts';
import {createHash, randomUUID} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, realpathSync, lstatSync} from 'node:fs';
import {join, isAbsolute} from 'node:path';
import {canonicalContractJson} from './contract-store.ts';
import {absoluteRepoPath} from './repository.ts';
import {careerSafePlaybook} from './career-safe-playbook.ts';
import {safeBuildGit, safeBuildPath} from './build-workspace.ts';
import type {ProjectPlaybook, ProjectPlaybookDefinition, PlaybookCommand} from '../../packages/shared/playbooks.ts';

export class ProjectPlaybookError extends Error {
  readonly status: number;
  readonly code: 'PLAYBOOK_REQUIRED' | 'INVALID_PLAYBOOK' | 'PLAYBOOK_CHANGED' | 'HUMAN_APPROVAL_REQUIRED';
  constructor(code: 'PLAYBOOK_REQUIRED' | 'INVALID_PLAYBOOK' | 'PLAYBOOK_CHANGED' | 'HUMAN_APPROVAL_REQUIRED', message: string) {
    super(message); this.code = code; this.status = code === 'INVALID_PLAYBOOK' ? 400 : code==='HUMAN_APPROVAL_REQUIRED'?403:409;
  }
}
const invalid = (message: string): never => {throw new ProjectPlaybookError('INVALID_PLAYBOOK', message);};
const hash = (value: unknown) => createHash('sha256').update(canonicalContractJson(value)).digest('hex');
const rootOf = (repo: string) => realpathSync(absoluteRepoPath(repo));
const safeText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max && !/[\u0000-\u0008\u000b-\u001f\u007f]/.test(v);
function command(value: unknown): PlaybookCommand {
  if (!value || typeof value !== 'object') return invalid('Commands require argv and a repository-relative cwd.');
  const c = value as PlaybookCommand;
  if (!Array.isArray(c.argv) || c.argv.length < 1 || c.argv.length > 40 || !c.argv.every(x => safeText(x, 4096))) return invalid('Invalid command arguments.');
  if (!['node', 'npm', 'python3'].includes(c.argv[0]!)) return invalid('Use an explicit node, npm, or python3 command, without a shell.');
  if (!safeText(c.cwd, 1024) || !c.cwd || isAbsolute(c.cwd) || c.cwd.split(/[\\/]/).includes('..') || c.cwd.includes('\\')) return invalid('Command cwd must remain inside the exported repository.');
  if (Object.keys(c).some(k => !['argv', 'cwd', 'report'].includes(k))) return invalid('Unexpected command field.');
  if(c.report !== undefined && (!c.report || typeof c.report !== 'object' || c.report.format !== 'cc-checks-v1' || Object.keys(c.report).some(k=>!['format','expectedTestIds'].includes(k)) || !Array.isArray(c.report.expectedTestIds) || !c.report.expectedTestIds.length || c.report.expectedTestIds.length>100 || c.report.expectedTestIds.some(id=>!safeText(id,256)||!id.trim()) || new Set(c.report.expectedTestIds).size!==c.report.expectedTestIds.length)) return invalid('Invalid explicit test-count contract.');
  return structuredClone(c);
}
export function validatePlaybookDefinition(value: unknown): ProjectPlaybookDefinition {
  if (!value || typeof value !== 'object' || JSON.stringify(value).length > 32768) return invalid('Invalid or oversized playbook.');
  const d = value as ProjectPlaybookDefinition;
  const fields = ['riskRules', 'skipReviewers', 'diffCap', 'qualityGates', 'version', 'exportFiles', 'setup', 'tests', 'env', 'runner', 'timeoutSeconds', 'knownFailingTests', 'knownFlakyTests', 'notes'];
  if (Object.keys(d).some(k => !fields.includes(k)) || d.version !== 'project-playbook-v1' || !['unittest', 'vitest', 'node-script'].includes(d.runner)) return invalid('Unsupported playbook definition.');
  if (!Array.isArray(d.tests) || d.tests.length < 1 || d.tests.length > 12) return invalid('Provide between one and twelve test commands.');
  if (!Number.isInteger(d.timeoutSeconds) || d.timeoutSeconds < 1 || d.timeoutSeconds > 1800) return invalid('Timeout must be between 1 and 1800 seconds.');
  if (!d.env || typeof d.env !== 'object' || Array.isArray(d.env) || Object.keys(d.env).length > 12) return invalid('Invalid environment configuration.');
  const allowedEnv = ['NODE_ENV', 'CI', 'HOST', 'BIND_ADDRESS', 'TZ', 'LANG', 'LC_ALL', 'PYTHONDONTWRITEBYTECODE'];
  for (const [key, val] of Object.entries(d.env)) if (!allowedEnv.includes(key) || !safeText(val, 256)) return invalid('Environment key or value is unsafe.');
  if ((d.env.HOST && d.env.HOST !== '127.0.0.1') || (d.env.BIND_ADDRESS && d.env.BIND_ADDRESS !== '127.0.0.1')) return invalid('Fixture binds must use loopback.');
  for (const key of ['knownFailingTests', 'knownFlakyTests', 'notes'] as const) if (!Array.isArray(d[key]) || d[key].length > 100 || !d[key].every(x => safeText(x, 1024) && x.trim())) return invalid('Invalid test annotations.');
  if(d.exportFiles !== undefined && (!Array.isArray(d.exportFiles)||!d.exportFiles.length||d.exportFiles.length>100||d.exportFiles.some(p=>!safeText(p,1024)||!safeBuildPath(p)||/[:*?\[\]]/.test(p)||!p||isAbsolute(p)||p.split('/').some(x=>!x||x==='.'||x==='..')||p.includes('\\'))||new Set(d.exportFiles).size!==d.exportFiles.length)) return invalid('Invalid export file whitelist.');
  if(d.qualityGates!==undefined&&(!d.qualityGates||Object.keys(d.qualityGates).some(k=>!['gates','policyHash'].includes(k))||!Array.isArray(d.qualityGates.gates)||!d.qualityGates.gates.length||new Set(d.qualityGates.gates).size!==d.qualityGates.gates.length||d.qualityGates.gates.some(g=>!qualityGateNames.includes(g))||!/^([a-f0-9]{64})$/.test(d.qualityGates.policyHash)))return invalid('Invalid quality gate policy.');
  if(d.diffCap!==undefined&&(!d.diffCap||Object.keys(d.diffCap).some(k=>!['lines','files'].includes(k))||!Number.isSafeInteger(d.diffCap.lines)||d.diffCap.lines<1||d.diffCap.lines>100000||!Number.isSafeInteger(d.diffCap.files)||d.diffCap.files<1||d.diffCap.files>1000))return invalid('Diff caps require 1–100,000 lines and 1–1,000 files.');
  if(d.riskRules!==undefined&&(!Array.isArray(d.riskRules)||d.riskRules.length>40||d.riskRules.some(r=>!r||Object.keys(r).some(k=>!['path','kind','raiseTo','message'].includes(k))||!safeText(r.path,200)||!r.path||!(/^[A-Za-z0-9_.*/-]+$/).test(r.path)||r.path.startsWith('/')||r.path.split('/').some(p=>p==='..'||p==='.')||!['GREEN','AMBER','RED'].includes(r.raiseTo)||r.kind!==undefined&&!changeKinds.includes(r.kind)||r.kind==='comment/docs-only'&&r.raiseTo!=='GREEN'||!safeText(r.message,240)||!r.message.trim())))return invalid('Invalid raise-only project risk rule.');
  if(d.skipReviewers!==undefined&&typeof d.skipReviewers!=='boolean')return invalid('Reviewer switch must be a boolean.');
  return {...(d.riskRules===undefined?{}:{riskRules:structuredClone(d.riskRules)}),...(d.skipReviewers===undefined?{}:{skipReviewers:d.skipReviewers}),...(d.diffCap?{diffCap:{...d.diffCap}}:{}),...(d.qualityGates?{qualityGates:structuredClone(d.qualityGates)}:{}),...(d.exportFiles?{exportFiles:[...d.exportFiles]}:{}),version: d.version, setup: d.setup === null ? null : command(d.setup), tests: d.tests.map(command), env: {...d.env}, runner: d.runner, timeoutSeconds: d.timeoutSeconds, knownFailingTests: [...d.knownFailingTests], knownFlakyTests: [...d.knownFlakyTests], notes: [...d.notes]};
}

export function createProjectPlaybookStore(dataDir: string) {
  dataMode(dataDir);const fixtureOnly=fixtureApprovalsEnabled(dataDir);
  const root = join(realpathSync(dataDir), 'playbooks'); assertDataEntry(root,'directory'); mkdirSync(root, {recursive: true, mode: 0o700});
  const folder = (repo: string) => join(root, repositoryIdentity(repo));
  const file = (repo: string) => join(folder(repo), 'current.json');
  const show = (repo: string): ProjectPlaybook | null => {
    const identity=repositoryIdentity(repo),dir=join(root,identity),path=join(dir,'current.json'); if (!existsSync(path)) {const legacy=join(root,hash(rootOf(repo)),'current.json');if(!existsSync(legacy))return null;if(lstatSync(legacy).isSymbolicLink()||lstatSync(join(root,hash(rootOf(repo)))).isSymbolicLink())throw new ProjectPlaybookError('PLAYBOOK_CHANGED','Legacy storage identity changed.');const old=JSON.parse(readFileSync(legacy,'utf8')) as ProjectPlaybook;const definition=validatePlaybookDefinition(old.definition);if(old.repoRoot!==rootOf(repo)||old.hash!==hash(definition))throw new ProjectPlaybookError('PLAYBOOK_CHANGED','Legacy playbook changed.');return {...old,repositoryIdentity:repositoryIdentity(repo),definition,approval:null};}
    if (lstatSync(dir).isSymbolicLink() || lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) throw new ProjectPlaybookError('PLAYBOOK_CHANGED', 'Playbook storage identity changed.');
    const record = JSON.parse(readFileSync(path, 'utf8')) as ProjectPlaybook;
    record.definition = validatePlaybookDefinition(record.definition);
    if (record.repositoryIdentity !== identity || record.hash !== hash(record.definition) || (record.approval && record.approval.hash !== record.hash)) throw new ProjectPlaybookError('PLAYBOOK_CHANGED', 'Playbook content or approval changed.');
    if (record.approval) {
      const saved = join(dir, record.hash + '.approved.json');
      if (!existsSync(saved) || lstatSync(saved).isSymbolicLink() || canonicalContractJson({...JSON.parse(readFileSync(saved,'utf8')),repoRoot:record.repoRoot}) !== canonicalContractJson(record)) throw new ProjectPlaybookError('PLAYBOOK_CHANGED', 'Immutable playbook approval changed.');
    }
    return {...record,repoRoot:rootOf(repo)};
  };
  const save = (repo: string, record: ProjectPlaybook) => {
    const dir = folder(repo); mkdirSync(dir, {recursive: true, mode: 0o700});
    if (lstatSync(dir).isSymbolicLink()) throw new ProjectPlaybookError('PLAYBOOK_CHANGED', 'Playbook storage identity changed.');
    record={...record,repositoryIdentity:repositoryIdentity(repo)};
    const tmp = join(dir, randomUUID() + '.tmp'); writeFileSync(tmp, canonicalContractJson(record), {flag: 'wx', mode: 0o600}); renameSync(tmp, file(repo)); return record;
  };
  const edit = (repo: string, definition: unknown): ProjectPlaybook => {
    requireHuman(dataDir,{item:'playbook:'+rootOf(repo),action:'edit_playbook'});const previous = show(repo), validated = validatePlaybookDefinition(definition);
    return save(repo, {repoRoot: rootOf(repo), baseCommit: previous?.baseCommit ?? '', definition: validated, hash: hash(validated), approval: null, updatedAt: new Date().toISOString()});
  };
  const approve = (repo: string, expectedHash: string): ProjectPlaybook => {
    const receipt=requireHuman(dataDir,{item:'playbook:'+rootOf(repo),action:'approve_playbook'});
    if(!fixtureOnly&&!receipt)throw new ProjectPlaybookError('HUMAN_APPROVAL_REQUIRED','New live playbook approvals are paused until human confirmation is configured; automated approval is disabled.');
    const record = show(repo); if (!record) throw new ProjectPlaybookError('PLAYBOOK_REQUIRED', 'Propose a project playbook before approving it.');
    if (record.hash !== expectedHash) throw new ProjectPlaybookError('PLAYBOOK_CHANGED', 'Review the current playbook before approving it.');
    if (record.approval) return record;
    const path = join(folder(repo), record.hash + '.approved.json');
    // Identical reapproval reuses the immutable approval; editing still requires this explicit action.
    if (existsSync(path)) {
      if (lstatSync(path).isSymbolicLink()) throw new ProjectPlaybookError('PLAYBOOK_CHANGED', 'Immutable approval identity changed.');
      const saved = JSON.parse(readFileSync(path, 'utf8')) as ProjectPlaybook;
      if (saved.repositoryIdentity !== repositoryIdentity(repo) || saved.hash !== record.hash || hash(validatePlaybookDefinition(saved.definition)) !== record.hash || saved.approval?.hash !== record.hash) throw new ProjectPlaybookError('PLAYBOOK_CHANGED', 'Immutable approval content changed.');
      return save(repo, {...saved,repoRoot:rootOf(repo)});
    }
    mkdirSync(folder(repo),{recursive:true,mode:0o700});if(lstatSync(folder(repo)).isSymbolicLink())throw new ProjectPlaybookError('PLAYBOOK_CHANGED','Approval storage identity changed.');
    record.repositoryIdentity=repositoryIdentity(repo);
    record.approval = {hash: record.hash, at: new Date().toISOString(),...(!fixtureOnly&&receipt?{actor:'passkey' as const,source:'webauthn' as const,dataMode:'LIVE' as const,confirmationId:receipt.id,credentialId:receipt.credentialId,evidenceHash:receipt.evidenceHash}:{actor:'test-fixture' as const,source:'node:test' as const,dataMode:'TEST' as const})};
    writeFileSync(path, canonicalContractJson(record), {flag: 'wx', mode: 0o400}); return save(repo, record);
  };
  const requireApproved = (repo: string): ProjectPlaybook => {
    const record = show(repo); if (!record?.approval) throw new ProjectPlaybookError('PLAYBOOK_REQUIRED', 'Approve this project’s proposed test playbook before running its ticket.'); return record;
  };
  const propose = async (repo: string, base: string): Promise<ProjectPlaybook> => {
    const existing = show(repo); if (existing) return existing;
    const repoRoot = rootOf(repo), baseCommit = (await safeBuildGit(repoRoot, ['rev-parse', '--verify', base + '^{commit}'], 1024)).toString().trim();
    const names = (await safeBuildGit(repoRoot, ['ls-tree', '-r', '--name-only', baseCommit], 1024 * 1024)).toString().split('\n');
    let definition: ProjectPlaybookDefinition = {version: 'project-playbook-v1', setup: null, tests: [{argv: ['python3', '-m', 'unittest', 'discover', '-s', 'tests', '-v'], cwd: '.'}], env: {HOST: '127.0.0.1', BIND_ADDRESS: '127.0.0.1', CI: '1'}, runner: 'unittest', timeoutSeconds: 180, knownFailingTests: [], knownFlakyTests: [], notes: ['Proposal only; commands have not run. BASE admission is required before results count.']};
    if(names.includes('sdk/python/pyproject.toml')){definition.tests[0]!.cwd='sdk/python';definition.notes.push('Credential-dependent live tests need explicitly reviewed exclusions or named BASE failures; they never count as passing.');}
    const packagePath = names.includes('frontend/package.json') ? 'frontend/package.json' : names.includes('package.json') ? 'package.json' : null;
    if (names.includes('test-all.mjs') && names.includes('liveness-core.mjs')) {
      definition = careerSafePlaybook();
    } else if (packagePath) {
      const raw = (await safeBuildGit(repoRoot, ['show', baseCommit + ':' + packagePath], 65536)).toString();
      const pkg = JSON.parse(raw) as {scripts?: Record<string, unknown>};
      if (typeof pkg.scripts?.test === 'string' && pkg.scripts.test.includes('vitest')) {
        const cwd = packagePath === 'package.json' ? '.' : 'frontend';
        definition.runner = 'vitest'; definition.tests = [{argv: ['npm', 'test', '--', '--run'], cwd}];
        definition.notes.push('Dependencies must already be available through the protected verifier’s approved dependency paths. No network installation is implied.');
      } else definition.notes.push('No recognized native test script found; review this proposed unittest command before approval.');
    }
    definition = validatePlaybookDefinition(definition);
    return save(repo, {repoRoot, baseCommit, definition, hash: hash(definition), approval: null, updatedAt: new Date().toISOString()});
  };
  const proposeGates=async(repo:string,base:string)=>{
    const previous=await propose(repo,base),policyHash=qualityPolicyHash();
    if(previous.definition.qualityGates?.policyHash===policyHash)return previous;
    const paths=(await safeBuildGit(rootOf(repo),['ls-tree','-r','--name-only',base],1024*1024)).toString().split('\n').filter(p=>!previous.definition.exportFiles||previous.definition.exportFiles.some(e=>p===e||p.startsWith(e+'/')));
    const definition=validatePlaybookDefinition({...previous.definition,qualityGates:{gates:proposeQualityGates(paths),policyHash}});
    return save(repo,{...previous,definition,hash:hash(definition),approval:null,updatedAt:new Date().toISOString()});
  };
  return {root, show, propose, proposeGates, edit, approve, requireApproved,approvalEnabled:fixtureOnly};
}
