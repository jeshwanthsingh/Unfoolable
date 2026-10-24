# PHONE-1 plan

Branch from 86fdec3. Local WIP commit per numbered step. No scoring, grader or Builder sandbox changes. Temporary files in .work/phone1.

0. Polish: exact shorter review copy, rounded cards, 32px top-aligned mobile seals; render/style regressions and MCP screenshots.
1. Shared archive: immutable archive/restore events in SQLite, projected through the existing event stream. Only display preferences change; no ticket decision. Test shared views and reopen.
2. Private access: retain hardcoded 127.0.0.1 listener. Accept only a configured exact HTTPS *[private tailnet domain] origin, via Tailscale Serve. No public bind or Funnel. No Tailscale available means closed with a plain message. Test Host/Origin and loopback binding.
3. Pairing: owner-only QR creation, 256-bit one-use token, five minutes; phone creates platform passkey; pending device gets no work data. Mac confirms exact public-key binding using existing localhost passkey. Device sessions use hashed random Secure/HttpOnly/SameSite cookies, 12h absolute expiry. Authentication and pairing rate limited. Revocation invalidates sessions, pending decisions and streams. Tests fake authenticators only in isolated TEST data; real Face/Touch ID requires owner.
4. Home Screen: manifest, seal icons, no-store app data, safe areas, 44px touch targets. Offline keeps old work explicitly labelled, disables actions and says the Mac cannot be reached. WebKit iPhone tests, no claim of real iOS biometric or push validation.
5. Push: opt-in per paired device/type; encrypted standard Web Push; only sanitized title + plain state, no paths or code. VAPID private key under the already Builder-denied app data directory, never sent to the client or logged. Subscriptions restricted to known HTTPS push service endpoints, no arbitrary network destination. No model/API billing.
6. Phone decisions: separate phone RP credentials, same exact operation/evidence digest, one-use two-minute decision confirmation and persistence-sink revalidation. Existing local passkey/STOP behavior preserved; phone STOP additionally requires its passkey. Builder endpoint/read probes must remain denied. Full suite, extended protected-path probe, 12 unchanged negatives, build/typecheck and credential scan.

Security review: phone cookies must never become the local operator capability in the browser; only an authenticated server-side adapter may attach it to existing routes. Remote surface is allowlisted, never a proxy to legacy unauthenticated project APIs or enrollment/admin routes. A wrong, expired, removed or unapproved device fails closed. Only localhost owner can approve or remove devices. Pending approvals and QR fragments never appear in logs, push or service-worker cache.

Environment: Tailscale absent at audit; live VPN login/network-extension approval and real iPhone checks cannot be simulated. No automatic public fallback. Standard push can work only after the iPhone Home Screen user grants permission.

## Implemented boundaries

Schema 18 adds shared append-only draft visibility, 19 adds device pairing, hashed sessions, one-use challenges, audit and rate limits, and 20 adds opt-in push subscriptions and a durable delivery cursor. Existing local passkeys remain unchanged. The phone RP is the exact private HTTPS hostname. Only that configured host/origin and the owner's Tailscale identity may reach the paired-device adapter. Unpaired requests receive no tickets. The local listener remains 127.0.0.1.

QR codes last five minutes and are consumed once. Phone sessions expire after 12 hours; each decision requires a fresh two-minute exact-item/evidence-bound platform passkey check. Removal invalidates sessions, decisions and event streams. Mac STOP remains immediate; phone STOP additionally needs its phone passkey. Standard WebAuthn user verification can use an OS passcode fallback or a synced passkey; this is not hardware-only biometric attestation.

Push is opt-in, per device and type, and restricted to Apple's HTTPS push service. The payload contains sanitized title and state only. Local VAPID keys are under the Builder-denied phone-private directory (0700/0600). Already transmitted notifications cannot be recalled after device removal. Existing Litestream SQLite backup does not include these key files: back up phone-private separately to preserve push identity. Never commit that directory.

The service worker caches no API responses or work. On disconnection the last list is explicitly dimmed and labelled unavailable; actions are disabled. A silent connection is detected within 45 seconds. No background polling is added to a healthy paired event stream.

## Local verification versus physical device

WebKit iPhone-profile checks use isolated TEST data, a test-only credential transport and loopback HTTPS proxy. They exercise the real routes and persistence but do not prove physical Face ID, Touch ID, iOS Home Screen installation, tailnet routing, Web Push delivery or safe-area behavior on actual hardware. Those require the checklist in artifacts/phone1/RESULT.md.

Primary references: https://tailscale.com/docs/features/tailscale-serve ; https://tailscale.com/docs/reference/tailscale-cli/serve ; https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ .

## Observed NordVPN conflict

On this Mac, Tailscale and Serve were configured correctly, but private DNS and direct private-IP HTTPS timed out with NordVPN connected. The owner paused NordVPN: normal private DNS/HTTPS worked, the genuine pairing screen loaded and unpaired data requests returned 401. NordVPN was restored immediately after the diagnostic, and private DNS failed again. Coexistence remains unresolved. No public fallback, certificate bypass, DNS change or permanent VPN disablement was used. Keep this limitation separate from the isolated WebKit and unit-test results.
