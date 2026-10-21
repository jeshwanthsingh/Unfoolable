# Changelog

## Observatory (OBS-1–3, merge-ready local branch)

- Real task list and Wallet-style Proof, with Classic view fallback.
- Live pixel room, sourced safety labels, linked highlights and exact-event replay.
- Calm stop/alarm sheet, recorded Night Shift briefing, one-shot seal feedback and optional muted-by-default sounds.
- Local landscape/portrait replay clips, accessibility audit and patched Vite.
- Protected verdict, permissions, sealing and human decisions unchanged.

Rollback before release: Settings → Classic view restores the existing main screen immediately. No database migration is part of OBS-1–3. For a code rollback after a future merge, revert the Observatory feature commits in a new local branch and run the full safety checks; do not reset or delete user data. Keep Classic view available for this release.
