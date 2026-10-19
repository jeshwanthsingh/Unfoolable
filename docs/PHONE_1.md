# PHONE-1 plan

Branch from 86fdec3. Local WIP commit per numbered step. No scoring, grader or Builder sandbox changes. Temporary files in .work/phone1.

0. Polish: exact shorter review copy, rounded cards, 32px top-aligned mobile seals; render/style regressions and MCP screenshots.
1. Shared archive: immutable archive/restore events in SQLite, projected through the existing event stream. Only display preferences change; no ticket decision. Test shared views and reopen.
2. Private access: retain hardcoded 127.0.0.1 listener. Accept only a configured exact HTTPS *.ts.net origin, via Tailscale Serve. No public bind or Funnel. No Tailscale available means closed with a plain message. Test Host/Origin and loopback binding.
3. Pairing: owner-only QR creation, 256-bit one-use token, five minutes; phone creates platform passkey; pending device gets no work data. Mac confirms exact public-key binding using existing localhost passkey. Device sessions use hashed random Secure/HttpOnly/SameSite cookies, 12h absolute expiry. Authentication and pairing rate limited. Revocation invalidates sessions, pending decisions and streams. Tests fake authenticators only in isolated TEST data; real Face/Touch ID requires owner.
4. Home Screen: manifest, seal icons, no-store app data, safe areas, 44px touch targets. Offline keeps old work explicitly labelled, disables actions and says the Mac cannot be reached. WebKit iPhone tests, no claim of real iOS biometric or push validation.
5. Push: opt-in per paired device/type; encrypted standard Web Push; only sanitized title + plain state, no paths or code. VAPID private key under the already Builder-denied app data directory, never sent to the client or logged. Subscriptions restricted to known HTTPS push service endpoints, no arbitrary network destination. No model/API billing.
6. Phone decisions: separate phone RP credentials, same exact operation/evidence digest, one-use two-minute decision confirmation and persistence-sink revalidation. Existing local passkey/STOP behavior preserved; phone STOP additionally requires its passkey. Builder endpoint/read probes must remain denied. Full suite, extended protected-path probe, 12 unchanged negatives, build/typecheck and credential scan.

Security review: phone cookies must never become the local operator capability in the browser; only an authenticated server-side adapter may attach it to existing routes. Remote surface is allowlisted, never a proxy to legacy unauthenticated project APIs or enrollment/admin routes. A wrong, expired, removed or unapproved device fails closed. Only localhost owner can approve or remove devices. Pending approvals and QR fragments never appear in logs, push or service-worker cache.

Environment: Tailscale absent at audit; live VPN login/network-extension approval and real iPhone checks cannot be simulated. No automatic public fallback. Standard push can work only after the iPhone Home Screen user grants permission.
