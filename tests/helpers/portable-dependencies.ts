import {existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {join} from 'node:path';
export const oracleDependencies=process.env.ORACLE_TEST_DEPENDENCIES??fileURLToPath(new URL('../fixtures/oracle-ui/node_modules',import.meta.url));
export const uiDependencySkip=existsSync(join(oracleDependencies,'vitest/vitest.mjs'))&&existsSync(join(oracleDependencies,'esbuild/package.json'))?false:'Install the pinned fixture with npm ci --prefix tests/fixtures/oracle-ui, or set ORACLE_TEST_DEPENDENCIES.';
export const browserFixtureSkip=uiDependencySkip||(process.env.CC_BROWSER_ORACLE_TESTS==='1'?false:'Set CC_BROWSER_ORACLE_TESTS=1 with the certified local Chromium tooling installed.');
export const nativeBuilderSkip=process.env.CC_NATIVE_BUILDER_TESTS==='1'?false:'Set CC_NATIVE_BUILDER_TESTS=1 with the certified Codex launcher and local subscription runtime installed.';
export const nativeToolSkip=process.env.CC_NATIVE_TOOLS_TESTS==='1'?false:'Set CC_NATIVE_TOOLS_TESTS=1 after installing the pinned offline quality/tree-sitter tools in .work.';
