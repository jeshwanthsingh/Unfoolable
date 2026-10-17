# Visual review log

## Pass 1 → pass 2
Viewed all six first captures, including the actual 3D scene. The initial prototypes had clearer materials but still buried the decision: the replay toolbar was too large and the full request dominated the frame. On phone the hero began too low. The Vault handle stroke was invisible because an object-bounding-box gradient was applied to a zero-width SVG path. An intended screen-reader label was visible because the legacy stylesheet had no sr-only class.

Moved replay controls below the hero, kept only a bounded display preview (full exact request available by disclosure), tightened chrome, made Overview / Vault actually change detail density, fixed the SVG handle with a solid brass stroke, and added an isolated visually-hidden class. All changes preserve recorded state and disabled historical decisions.

The three directions are not ranked. Same data, different composition/materials. Current tickets have no real RED review risk; the Recorded stop control shows the same ticket’s real historical harness-error state in red, with explicit historical language.

## Pass 2 → pass 3
Viewed all six second captures. The first viewport now contains the object and decision on desktop, but cutting the request at an arbitrary character made it read like broken copy. Use a verbatim first-sentence preview when available; the full original remains one disclosure away. Make the historical/read-only label visible at the top, not only beneath the decision. The 3D room was too hard-edged and its shadows harsh: reuse Three’s rounded-box geometry, softer shadow filtering and a very slight stationary edge-focus treatment. Phone hero scale shrinks a little so intent and verdict are legible earlier. Direction links have explicit accessible names.

## Pass 3 → final recapture
Viewed all six third captures. A and B now present one object/decision; C is spatial without ambient motion. Final refinements address the independent reviewer’s concrete findings: check states are now in the SVG accessible name even in Overview; the Canvas instruction points to the real Vault control; replay explicitly says one event per second; disclosures and direction controls meet 44px; compact status text wraps as a unit rather than stranding its dot. Reduced phone object scale keeps decisions closer. The sound remains opt-in and only responds to observed lock transitions.

## What remains simple / reserved
The existing operational UI remains untouched. These alternatives replay captured history, not simulated live progress; historical Keep/Discard stay disabled and link to the live exact-item review. There is no new agent, queue or approval model. No current ticket has RED review risk, so red evidence is a real recorded harness error, not a fabricated current risk. C is original code geometry rather than a commissioned asset scene, and its phone view intentionally uses no 3D canvas. No winner selected.

## Independent verdict pass
A separate read-only reviewer used ibelick baseline-ui and the principles, viewed all six final recaptures, and scored its five earlier findings resolved: permanent historical label, accessible check-state names in Overview, truthful keyboard instruction, accelerated cadence disclosure, and 44px targets. This finding-specific pass did not claim a screen-reader session or aesthetic certification.

## Final compatibility check
Console inspection found Three 0.186.1 warns that PCFSoftShadowMap was removed and already falls back to PCFShadowMap. Replace that obsolete name with its actual current fallback (same rendering behavior), then rebuild and refresh final captures/tests. React Three Fiber itself still emits a Three.Clock deprecation warning; that is an upstream compatibility warning, not a runtime failure. One old module-load MIME error occurred during a production rebuild while a prior page remained open; final navigation uses the completed build and is checked separately.
