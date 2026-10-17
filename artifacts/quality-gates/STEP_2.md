# Step 2 — AST review flags

Local ast-grep rules compare changed test files between BASE and Candidate: added skips, assert True, removed assertions and changed expectations. Existing unchanged skips do not produce new flags. Flags are review evidence; restored BASE tests remain authoritative. Only exported whitelisted paths are considered.

Native sandbox test: 3/3 passed, including real Python and TypeScript files with skips and deleted/changed assertions. Network is denied. No custom source parser was added.
