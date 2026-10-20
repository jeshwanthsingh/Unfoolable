# Policy proposals (not applied)

## Empty evidence should become ERROR?

Current compatibility rule: a supplied protected-verifier verdict is an explicit fact with verifier ID and evidence-hash provenance. The ticket adapter forwards that verdict when layers are empty, as 3c94150 did. The core still converts the existing missing-required-recipe ERROR case into NOT CHECKED. Builder text cannot supply this fact.

Proposal: require a complete authoritative evidence set before forwarding any supplied success; otherwise return ERROR. This would be a policy change, not a refactor. It requires new admission and migration decisions, updated expectations and explicit approval. CORE-1 does not implement it or change historical labels.
