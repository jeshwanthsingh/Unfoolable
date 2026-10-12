# Focused review

Accepted after correcting three concrete integration/safety defects: external clones originally failed verifier public-root validation; installed dependencies would have polluted Candidate snapshots; an empty helper-record set could have been mistaken for certified cleanup. The fixes retain public root restrictions, use protected dependency exclusions, and require exact launch birth certificates. Native tests and the full suite verify these.

No generic command endpoint, model/runtime change, new paid route, grader mutation, source-repo mutation, push, merge, deploy or dependency addition. Old Candidate rechecking and current-only alarm summaries remain supported.

Residual limits are explicit: alarm delivery relies on macOS logging and can be absent/delayed; self-tests fail closed when the sensor is unavailable. Filesystem protection is the named-path/Projects boundary, not a home-wide allowlist. Unsupported dependency lock formats and missing BASE test prerequisites require reviewed setup.
