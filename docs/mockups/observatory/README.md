# Observatory preview (OBS-0)

Separate local design mockup. The real app stays on 3225 and is unchanged. No action in this preview can submit a task, record a viewed file, stop work or make a decision. All `/api/` requests other than GET are rejected by the preview dev server. Current state comes from the existing private SSE; historical views show recorded event prefixes.

From the repository root, with the normal app already running:

```sh
npm ci --prefix docs/mockups/observatory --legacy-peer-deps --ignore-scripts
npm run dev --prefix docs/mockups/observatory
# Another terminal, to connect the private screen without printing its capability:
node docs/mockups/observatory/open.mjs
```

URL: http://localhost:3260/ . Settings switches light/dark; View selects a current or explicitly recorded state. Replay and the scrubber cannot authorize decisions. Hold Alt or keyboard-focus room objects to see their labels. On phone, tap a task to open the swipeable Proof sheet. The two missing recorded states (production alarm and Night Shift morning report) are deliberately empty.

```sh
node --test docs/mockups/observatory/model.test.ts
npm run build --prefix docs/mockups/observatory
```

Production package.json, lockfile, application entry points and all backend files are unchanged. Vaul/Radix live only in this preview's separate manifest/lockfile. No integration until Jesh approves the mockups.
