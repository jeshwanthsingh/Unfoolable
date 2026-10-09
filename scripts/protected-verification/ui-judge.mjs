// This process consumes inert JSON observations. It never loads candidate code.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
fs.readFileSync(0, 'utf8'); // Parent releases only after ownership is recorded.
const [observationsPath, oracleCodePath, exactTestName, depsRoot, scratch] = process.argv.slice(2);
fs.mkdirSync(scratch, { recursive: true });
// Bound module resolution to the trusted judge workspace, independent of its parent project.
fs.writeFileSync(path.join(scratch, 'package.json'), '{"type":"module"}\n');
fs.writeFileSync(path.join(scratch, 'tsconfig.json'), '{"compilerOptions":{"target":"ES2022","module":"ESNext"}}\n');
const data = JSON.parse(fs.readFileSync(observationsPath, 'utf8'));
if (data.version !== 'observations-v1' || !Array.isArray(data.observations)) throw new Error('invalid observations');
const testFile = path.join(scratch, 'oracle.test.ts');
fs.copyFileSync(oracleCodePath, testFile);
fs.writeFileSync(path.join(scratch, 'observations.mjs'), `const rows = ${JSON.stringify(data.observations)};\nconst byId = new Map(rows.map(row=>[row.id,row]));\nexport const observations = new Proxy(rows,{get:(target,key,receiver)=>typeof key==='string'&&!Reflect.has(target,key)&&byId.has(key)?byId.get(key):Reflect.get(target,key,receiver)});\nexport const getObservation = id => byId.get(id);\n`);
const configFile = path.join(scratch, 'vitest.config.mjs');
const reportFile = path.join(scratch, 'native-vitest-report.json');
if (fs.existsSync(reportFile)) fs.unlinkSync(reportFile);
fs.writeFileSync(configFile, `export default ${JSON.stringify({root:scratch,server:{host:'127.0.0.1'},resolve:{alias:{vitest:path.join(depsRoot,'vitest/dist/index.js')}},test:{environment:'node',include:['oracle.test.ts'],globals:false,watch:false,pool:'forks',maxWorkers:1,minWorkers:1,fileParallelism:false}})};\n`);
const result = spawnSync(process.execPath, [path.join(depsRoot, 'vitest/vitest.mjs'), 'run', '--config', configFile, '--reporter=json', '--outputFile', reportFile, '--testNamePattern', `^${exactTestName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`], { cwd:scratch, env:{PATH:path.dirname(process.execPath),HOME:scratch,TMPDIR:scratch,LANG:'C',LC_ALL:'C',TZ:'UTC',NODE_ENV:'test'}, encoding:'utf8', timeout:30000,maxBuffer:1048576 });
let report;
try { report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); } catch {}
const suites = report?.testResults ?? [];
const tests = suites.flatMap(s => s.assertionResults ?? []);
const exact = tests.length === 1 && tests[0].fullName === exactTestName && tests[0].status === 'passed' && suites.length === 1 && path.resolve(suites[0].name) === path.resolve(testFile);
const passed = result.status === 0 && !result.error && report?.success === true && report.numTotalTests === 1 && report.numPassedTests === 1 && report.numFailedTests === 0 && report.numPendingTests === 0 && report.numTodoTests === 0 && report.numTotalTestSuites === 1 && report.numPassedTestSuites === 1 && report.numFailedTestSuites === 0 && report.numPendingTestSuites === 0 && !(report.numUnhandledErrors > 0) && !report.snapshot?.failure && !(report.snapshot?.unchecked > 0) && exact;
const failed = report?.numFailedTests > 0 || tests.some(t=>t.status === 'failed');
const failureMessages = tests.flatMap(test => Array.isArray(test.failureMessages) ? test.failureMessages.filter(message => typeof message === 'string') : []).slice(0, 8).map(message => message.slice(0, 2048));
const errorNames = [...new Set(failureMessages.flatMap(message => [...message.matchAll(/(?:^|\n)\s*([A-Za-z]+Error):/g)].map(match => match[1])))];
const runtimeError = errorNames.some(name => ['ReferenceError', 'SyntaxError', 'TypeError', 'RangeError', 'EvalError', 'URIError'].includes(name));
const failureKind = !failed ? null : runtimeError ? 'RUNTIME' : errorNames.length > 0 && errorNames.every(name => name === 'AssertionError') ? 'ASSERTION' : 'UNKNOWN';
// A red product witness needs one exact collected assertion failure; runtime failures prove nothing about the requested change.
const assertionFailed = failed && failureKind === 'ASSERTION' && result.status === 1 && !result.error && report.success === false && report.numTotalTestSuites === 1 && report.numFailedTestSuites === 1 && report.numPassedTestSuites === 0 && report.numPendingTestSuites === 0 && report.numTotalTests === 1 && report.numFailedTests === 1 && report.numPassedTests === 0 && report.numPendingTests === 0 && report.numTodoTests === 0 && !(report.numUnhandledErrors > 0) && tests.length === 1 && tests[0].fullName === exactTestName && tests[0].status === 'failed' && suites.length === 1 && path.resolve(suites[0].name) === path.resolve(testFile);
console.log(JSON.stringify({status:passed?'PASS':assertionFailed?'FAIL':'INCONCLUSIVE',failureKind,errorNames,failureMessages,exitCode:result.status,signal:result.signal,error:result.error?.message ?? null,testsRun:report?.numTotalTests ?? 0,tests:tests.map(t=>({id:t.fullName,status:t.status})),nativeReport:report ?? null,stdout:result.stdout ?? '',stderr:result.stderr ?? ''}));
process.exitCode = passed ? 0 : 1;
