# SCION-1 notes

Project rules use the already pinned Opengrep CLI with local inline rules, metrics off and network denied. A rule with any BASE finding is disclosed as pre-existing and does not score the Candidate. A BASE-clean rule can fail only for a finding on a changed line. Invalid rules, parse errors, missing reports and uncertain cleanup are errors, never clean passes. Rule definitions are part of the existing Touch ID-approved playbook hash. No current approval is edited automatically.
