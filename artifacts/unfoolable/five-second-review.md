# Screenshot-only read-only comprehension test

A fresh read-only Codex session inspected only pass-3/main-1440.png, with no code, docs or other state.

It interpreted: first task done with an unchecked part, so inspect changes/proof; second task's checks out of date, so Try again; third task accepted and saved separately, with no immediate action. It explicitly did not infer correctness from a mark.

Findings: the count included another pending row below the visible area, and Accepted did not explain whether merging happened. Both were corrected in copy. The reviewer also found the user-authored task names technical; those are not rewritten or invented. Full original wording remains accessible in Proof.

The same read-only session inspected the updated screenshot only. It confirmed the accepted-state ambiguity was resolved and the count now covered offscreen work, but asked how to find the other waiting task. The final summary explicitly says to scroll to see all. Visible next actions were correctly identified for every shown task. No additional code or state was supplied to that reviewer.

## Final screenshot-only follow-up

Image only: final/look-assay-1440.png. The same fresh read-only session saw no code or docs. It correctly explained: first task done with unchecked parts, inspect changes/proof; second task refresh checks with Try again; third task accepted with unchecked parts, saved separately and not merged. It explicitly confirmed that “3 waiting; scroll to see all” resolves the offscreen-count ambiguity. Remaining limitation: literal technical task titles take effort, but status and next steps were understandable. Confidence reported high. Original user-authored titles were preserved rather than silently rewritten.
