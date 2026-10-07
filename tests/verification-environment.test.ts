import test from 'node:test';
import assert from 'node:assert/strict';
import {verifierEnvironment} from '../apps/server/verification-environment.ts';
import {verificationHash} from '../apps/server/verification-recipe.ts';
import {canonicalContractJson} from '../apps/server/contract-store.ts';
test('verifier environment identity is stable, bounded and contains only explicit toolchain and OS fields',()=>{const first=verifierEnvironment(),second=verifierEnvironment();assert.deepEqual(second,first);assert.equal(first.hash,verificationHash(canonicalContractJson(first.manifest)));assert.deepEqual(Object.keys(first.manifest).sort(),['version','platform','architecture','osRelease','nodeVersion','nodeExecutable','gitVersion','pythonExecutable','pythonVersion'].sort());assert.equal(first.manifest.nodeVersion,process.version);assert.equal(first.manifest.architecture,process.arch);assert.ok(Buffer.byteLength(JSON.stringify(first.manifest))<4096);assert.equal(Object.hasOwn(first.manifest,'environment'),false);});
