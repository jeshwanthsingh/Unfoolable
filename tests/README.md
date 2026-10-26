# Test prerequisites and portable fixtures

Use Node 24 and Git on PATH. Run `npm ci`, then `npm test`; no Therapy2 or other personal checkout is required. Application fixtures use their own project roots. Historical migration fixtures read this Git checkout, not a home-directory repository.

For native UI tests, install the small locked fixture:

```sh
npm ci --prefix tests/fixtures/oracle-ui --ignore-scripts
npm test
```

It pins Vitest 4.0.18, React/React DOM 19.3.0, jsdom 27.4.0 and esbuild 0.25.12 with a committed lockfile. Alternatively set `ORACLE_TEST_DEPENDENCIES` to an explicitly supplied compatible dependency directory. Missing UI dependencies produce a named setup skip, never a pass. No package installation occurs in a Builder sandbox.

Optional integration switches:

- `CC_NATIVE_BUILDER_TESTS=1`: certified Codex 0.160.0 launcher, subscription runtime and macOS permissions/profile tooling installed on the host. This is the only test group that uses the configured Mac's private Builder installation.
- `CC_BROWSER_ORACLE_TESTS=1`: certified local Chromium/Playwright runtime installed; otherwise the browser-only fixture is explicitly skipped.
- `CC_NATIVE_TOOLS_TESTS=1`: locked offline quality/secret scanners, SkillSpector and tree-sitter installation under `.work/`, including the predownloaded scanner database. Missing tooling is an error when this group is explicitly enabled.

The default suite does not silently borrow another repository's dependencies. Optional skips must be counted separately from passes. The full maintainer run sets all three switches after installing the certified tools. Dependencies are test-only: Vitest MIT, React/React DOM MIT, jsdom MIT, esbuild MIT. Exact transitive versions/integrities are in `fixtures/oracle-ui/package-lock.json`.
