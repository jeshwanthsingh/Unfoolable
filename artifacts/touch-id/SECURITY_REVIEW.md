# Passkey security review

Independent read-only review found no remaining high-confidence security issue in the final diff. Reviewed operator-authenticated routes, WebAuthn challenge/signature/UV/origin/RP checks, native biometric bootstrap, enrollment concurrency, item/action/body/evidence binding, persistence guards, replay, async authority, fake-auth isolation, and UI/CLI paths.

Addressed findings: production native helper resolution works independently of cwd; initial enrollment requires macOS biometrics, is single-flight, and displays matched fingerprints; receipts are scoped, one-use, and revalidate evidence at the persistence sink; own chat reservation normalization retains underlying binding checks; LIVE data rejects fake authenticators; live approval availability requires an owner credential and approval still requires a verified scoped receipt.

Actual owner enrollment/biometric ceremony is NOT VERIFIED and remains pending user interaction. Same-user filesystem trust and future iPhone RP re-enrollment limitations are documented. Reviewer made no production changes or decisions.
