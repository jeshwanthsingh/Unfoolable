# OFFICE-3 visual and motion review

Official Playwright MCP 0.0.83, isolated Chrome, real 100% zoom. Recorded ticket: c9f83568-2d33-4e5f-9ef1-b836c4f49cf2 (README-only change). All mutating fixture requests refused. No task, approval or decision was executed for filming.

## Passes
1. Approved preview: day/night shots plus 10-second clip in preview/. Night was flat/dim; mobile controls overlapped. The user's review approved the direction and requested a separate stepped light map. First completed lighting screenshots in pass1/ exposed a stray lock path and a tiny fuzzy probe label.
2. pass2/: six-band light map, brightest cool lab, separate emissions, safety objects and compact HUD. Fixed stray lock path and replaced fuzzy label with original bitmap glyphs backed by the fresh 69-path probe. Landscape recording retained in pass2/landscape/. Native recording measured 58.7fps during the sampled wall interval, about 0.89ms paint.
3. pass3/ and final/: fixed integer-scale centering, widened the picker, sharpened overlay text, added title/payoff/end-card framing. Interaction review reproduced two UI bugs: Explore remained open after selection; the hidden Stop all control could not receive focus. Both were corrected and the entire browser interaction sequence passed.
4. Final screenshot audit caught native select text disappearing despite correct selected option/color/font metrics. Native semantics are retained, with CSS appearance:none; final screenshots show readable selected text. Also removed double darkening from the still illustration, added its practical light pools, and made the day shafts visible. Final light/dark captures at both widths are in final/screens/.

## Reference comparison (look only)
Official scene screenshots in refs/: Eastward, Graveyard Keeper night, Stardew Valley. Eastward's useful lesson is layered detail around open walking space, not copied props. Graveyard Keeper demonstrates a dark cool ambient field with small warm practical sources. Stardew keeps characters legible against quiet floor areas. Our assets are deliberately simpler and original; this work does not claim their production art quality. No game code or art enters the application. Sources are recorded in refs/sources.json and art-bible.md.

## Emil / interface review
| Before | After | Why |
| --- | --- | --- |
| Entire room and glow darkened together | Separate light-map multiplication and unshaded emissions | Practical sources lead the eye; no uniform night wash |
| Uniform/soft pool falloff | Six stepped bands; nearest-neighbor textures | Keep the pixel language |
| Camera zoom changed texture smoothing | Nearest-neighbor retained throughout 1.0–1.25× eased zoom | Cinematic movement without bilinear blur |
| Small blurred probe label | Original bitmap count/date glyphs | Rigorous data remains readable in the world |
| Overlapping phone controls | One safe-area Controls button, still room below | Keep targets out of the picture |
| Replay could waste frames behind finished end card | Final opaque end card settles to zero frames | No invisible perpetual render loop |
| Real result and missing result treated alike in a trailer | Stamp/end label requires recorded check result; otherwise explicitly no result | Do not fabricate work or success |

Motion review: UI keyboard actions snap; camera easing is a deliberate cinematic exception to sub-300ms UI guidance. Result press is 180ms; dust/glint finishes in 700ms. Pet, blinking and plants are explicitly decorative ambient life authorized for OFFICE-2/3. They never change a ticket or a check. Hidden rendering stops; reduced motion uses an actual still SVG illustration, no Pixi canvas. Optional sound stays off by default.

## Measurements and honest limits
A 10-second interaction sample measured 60.0fps, 0.565ms paint, one SSE and zero extra HTTP requests. Controlled visibility input verified zero hidden frames; the MCP focus emulation did not prove a natural OS tab-hide transition. 390px capture has no horizontal overflow and no HUD/scene overlap. These are local Chrome measurements, not a physical-iPhone or universal 60fps guarantee.

Pixi logs three bound-texture/sampler cleanup warnings on some scene switches. No page error or failed recording was observed; the warnings are retained in the capture logs. No library upgrade or protected-code change was made to hide them.

The default wide camera is room-bounded; portrait gives a tighter station crop. The video files contain the rendered scene only (no browser, screen, audio, or personal UI capture). The recorder requests 60fps and supplies a JSON sidecar. Final share files are losslessly remuxed to add embedded WebM duration; packet-stream hashes prove no inserted or re-encoded frames.
