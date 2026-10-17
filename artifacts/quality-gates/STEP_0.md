# Step 0 — preview truncation

The 32 KiB display preview had incorrectly set the native evidence truncation flag. Complete native observations remain stored separately and pipe-bounded. Preview truncation is now a separate metadata field; actual runner/judge truncation still fails closed.

Verification: native protected tests 11/11 passed, including large complete evidence vs genuinely truncated evidence. Historical cases were not rerun.
