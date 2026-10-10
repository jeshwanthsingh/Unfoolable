# T3 authoring instability

The first scored T3 attempt (b0f4bf8d-7cbb-406f-bbeb-a06627cd2b3e) proposed four HUMAN HTTP-service claims, with empty componentPath/uiFixture. Its reasons incorrectly treated controlled JavaScript request fixtures as unavailable. The unconditional Vitest UI-component check rejected this proposal before handling the claims. This produced ERROR, not a Candidate failure.

A later exploratory attempt (825a81c0-cde7-4502-a051-7bdeb201be16) rendered unrelated AuthForm beside a probe of actual httpService.get. The service probe passed while the unrelated component satisfied the unnecessary component requirement. It was not evidence that the scorer had deterministic authoring.

This round separates VISIBLE_UI from NONVISUAL observation. Visible UI retains relevant imported/exercised component identity; nonvisual frontend checks name their actual BASE module/export and use a controlled fixture without an unrelated component. Comments and strings cannot satisfy structural use checks. Relevance is bounded lexical validation, not proof of reachability; BASE/correct/wrong admission remains the behavioral gate.

Focused tests repeat fixed HTTP/store proposals three times with the same server outcome. This proves fixed-output handling only. Live-model repeatability must be reported separately from these injected tests; it is not assumed.
