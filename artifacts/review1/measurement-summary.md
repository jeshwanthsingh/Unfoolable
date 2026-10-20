# Reviewer measurement (frozen; no retries)

| Role | Wrong study flagged | Correct falsely flagged | Controls flagged | Mean reported tokens | Validation errors | Default |
|---|---:|---:|---:|---:|---:|---|
| intent | 5/8 | 0/11 | 8/12 | 7824.870967741936 | 1 | OFF |
| readability | 5/8 | 0/11 | 8/12 | 7820.612903225807 | 1 | OFF |
| ui | 0/8 | 0/11 | 0/12 | not applicable | 0 | OFF |

UI: all 31 rows are ineligible/SKIPPED, so zero findings is not a measured zero false-alarm rate. Both text roles fail the preregistered no-error condition because each produced one finding not anchored to the supplied patch. The image transport smoke is separate from this study. No hidden graders, truth labels, Candidate files, Builder sessions or summaries entered reviewer inputs.
