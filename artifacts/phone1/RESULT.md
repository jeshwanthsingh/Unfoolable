# PHONE-1 verification

Branch: codex/phone-v1, from 86fdec3. Local WIP commits only.

## Implemented

Rounded mobile cards and 32px seals; server-shared reversible draft archive; private Tailscale Serve configuration; one-use five-minute pairing with Mac confirmation; expiring phone sessions and exact-item two-minute passkey decisions; Home Screen metadata and network-only service worker; optional per-device Apple Web Push. No scoring, grader or Builder permission-profile changes.

## Verification

- Focused phone tests: 24/24.
- Historical migration and stream regressions after fixture update: 176/176.
- Final full suite: 1048/1048 pass, 0 failures/skips/cancellations; 381.478 seconds. Tested commit 9a65934, source unchanged throughout. Typecheck and production build pass.
- Builder probe: 69 protected paths denied; six endpoint connection attempts denied; owned workspace Git/SQLite operations succeed. See after-probe.json.
- WebKit: all 11 scenario groups pass. See webkit/RESULT.json.
- Dependency scan: no known vulnerabilities in the pre-downloaded OSV npm database snapshot.
- Credential scan: zero unresolved findings; one exact unchanged synthetic redaction-test fixture triaged.

The initial full run was 1032/1048: 15 outdated schema expectations/minimal fixtures plus one existing correction-fixture timing timeout. The isolated correction case subsequently passed without modifying its test, timeout or oracle. Full initial evidence is retained in full-suite-initial.json/log; no result was relabelled.

## Browser evidence and limits

Same-data 390px screenshots: webkit/390-light.png and webkit/390-dark.png. These use synthetic isolated TEST data, not a real ticket or decision. Official Playwright MCP drives WebKit iPhone 13 at actual 390 CSS pixels, 100% zoom. The separate ignored TEST build substitutes only the biometric client transport; production uses the real SimpleWebAuthn client. Real routes, persistence, session revocation, expiry, stale rejection and access checks remain exercised.

Real iPhone Face ID, Mac Touch ID pairing confirmation, Home Screen installation, physical safe-area behavior, notification permission/delivery and background wake still need the owner. WebAuthn user verification can permit an OS passcode fallback and synced passkeys. This is not hardware-only biometric attestation.

The Builder read/network probe is a real Codex session under its unchanged permission profile; every tested endpoint connection failed before HTTP. Independent real HTTP integration tests exercise the new endpoint authentication.

## Visual review refinements

The real WebKit loop caught same-page QR-fragment navigation, a missing phone archive allowlist entry, 40px primary-button specificity, and an inner SVG that remained 48px despite a 32px outer well. These were corrected and the full 11-scenario loop was rerun. Final measurements use the SVG's actual bounds, not the wrapper. Failed phone confirmation now shows its real plain error instead of leaving a stale waiting notice.

## Remaining operational limits

Keep the Mac awake and connected to Tailscale. Offline work remains explicitly stale and cannot authorize actions. A silent connection is detected within 45 seconds. Push delivery is best effort and already sent alerts cannot be recalled after removal. Litestream's existing database-only backup does not include phone-private key/config files; back those up separately without committing them. No new paid API billing was enabled.

## iPhone checklist

1. Connect Tailscale on Mac and iPhone using your own account.
2. Open Unfoolable on the Mac and choose Settings, then Add my phone.
3. Scan the five-minute QR code on the iPhone and create its passkey.
4. Compare the displayed code, then approve that phone on the Mac with Touch ID.
5. On iPhone Safari, choose Share, then Add to Home Screen; open that app.
6. Try a decision; verify Face ID and stale-decision rejection. Accept/Reject are your choices.
7. Optionally select alert types and enable notifications from the Home Screen app.
8. Disconnect the Mac to check the offline notice, then reconnect; test Remove from Mac Settings when ready.

## Live setup

Tailscale 1.104.1 is installed and connected, verified through the native UI and CLI. The real coordinator was backed up, gracefully restarted after proving no active tickets, and migrated to schema 20. Health is online/ready and pre-existing security/evidence table counts were preserved. See live-upgrade.json.

The owner enabled HTTPS with Funnel unchecked. Private Serve now proxies only to http://127.0.0.1:3225. Normal DNS and HTTPS certificate validation passed while the owner paused NordVPN: the page and unpaired-session endpoint returned 200; tickets, projects and chat returned 401 without a paired session. The browser visibly showed only the pairing screen. See private-https.json and private-pairing.png. No public sharing was enabled. Device names enter public certificate transparency logs as disclosed by Tailscale; app contents remain private to the tailnet.

Operational blocker: with NordVPN connected, private hostname lookup failed and direct private-IP HTTPS timed out. Pausing NordVPN restored normal DNS/HTTPS; restoring NordVPN caused ENOTFOUND again. NordVPN was restored and visibly Connected/Secured after the test. No DNS, route, certificate-validation, app or sandbox policy was changed to work around it. Persistent coexistence configuration remains unresolved. Physical phone pairing and push remain untested.
