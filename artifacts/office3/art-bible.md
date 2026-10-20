# OFFICE-3 art bible — review preview

Original 2D pixel workshop, not sampled game art. ENDESGA 32 by ENDESGA is the only source-art palette (32 colors), from https://lospec.com/palette-list/endesga-32 . Lospec states all palettes are free to use: https://lospec.com/palette-list/endesga-64 . This is a free-use permission, not an invented CC0 claim. Original room and figures remain CC0-1.0; upstream palette credited here.

480 × 288 logical room. 48 × 48 figure frames (the previous 32px drawing baked at 1.5× using nearest neighbor). The base world scale uses integers. Approved replay camera moves smoothly from 1.0 to 1.25×; nearest-neighbor sampling stays on throughout that cinematic zoom. Text and additive lighting are composited separately; lit output naturally contains intermediate colors. No texture interpolation, fractional camera zoom, 3D, sampled art or game assets.

Morning: warm window light, angled beams. Noon: neutral room, pale sky. Evening: orange sky and warmer practical lights. Night: dark blue room and sky, pools around brass lamps, teal monitors and inspection equipment. Production lighting reads the real local clock. Review captures freeze the browser clock explicitly at noon and 23:00; those are lighting previews, not claims about current local time.

Soft contact shadows anchor desks and feet. Original couch and sleeping cat fill the unused bench. Larger figures keep the four real roles. Decorative life never indicates work; task/tool poses still derive from recorded events.

## References — mood only
- Eastward (Pixpil / Chucklefish): https://eastwardgame.com/media/ — strong warm/cool separation; small practical lights lead the eye.
- Graveyard Keeper (Lazy Bear / tinyBuild): https://www.graveyardkeeper.com/home — dense, useful props and a readable working room.
- Stardew Valley (ConcernedApe): https://www.stardewvalley.net/media/ — broad quiet floors between detailed furniture; warm interior night pools.
No code, sprites, palettes or proprietary art copied from those games.

## Preview shot list (10 seconds)
1. Wide view of the recorded README ticket in the room.
2. Replay actual events, with larger figures and coherent local-clock lighting.
3. Hold the room; no synthetic task or check events.

The preview gate was approved. The finished display uses a 38-second actual-event trailer, safety objects with sourced disclosures, a wandering decorative cat, and landscape/portrait recording. See RESULT.md and visual-review.md for final proof.

## Final lighting
A separate 480×288 light texture holds deep blue-violet ambient light plus six stepped additive bands per practical light. The scene is multiplied by that map. Screens, clock, lamps, tube LEDs and restrained bloom are composited afterward. The lab ceiling and its cool pool form the brightest night volume. Day shafts use four hard bands with slow dust. No smooth falloff texture, copied game art or 3D renderer.

## Honesty boundary
The drawer count/date is a build-time attestation from the latest OFFICE-3 real Builder probe; it is explicitly dated, not represented as live monitoring. Dim tripwire lines show the configured sensor location, not a sensor-health guarantee. The inspector says when no alarm has been recorded. Budget is the stored Builder total, explicitly labelled when viewed in replay.
