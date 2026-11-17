# Phase 12 — Live Avatar Browser Demo and User Evaluation

**This phase builds a working, interactive local demo for the user to open
and test personally — not a diagnostic script.** It was done directly
rather than dispatched to a background agent, since the deliverable is a
real server left running for the user, not a one-off report.

No production code, no engine file, and no GLB was modified. Only one new
file was created: `poc/mpfb-avatar-poc/phase12-demo.html`.

## 1. What was reused vs. built new

Everything needed already existed from Phases 1–10:

| Component | Path | Source |
|---|---|---|
| Avatar | `poc/mpfb-avatar-poc/avatar_v5.glb` | Phase 7 (final verified avatar) |
| Engine | `poc/mpfb-avatar-poc/phase8-talkinghead-experiment/TalkingHead/modules/talkinghead.mjs` | Phase 8 (idle-gaze fix), confirmed by Phase 10 to work correctly with v5 |
| Test audio + viseme timeline | `poc/mpfb-avatar-poc/parity-audio.wav`, `timeline.json` | Generated from the existing project's own real, unmodified `src/visemeDetector.ts`/`src/visemeModel.ts`, earlier in this investigation |
| Static file server | `poc/mpfb-avatar-poc/serve.cjs` | Already running throughout this investigation, port 8924 |
| Professional lighting + anisotropic filtering | `applyProfessionalLighting()` / `applyAnisotropicFiltering()` | Lifted directly from the existing `poc.html` harness (Phases 7–10), unchanged |

**New**: `poc/mpfb-avatar-poc/phase12-demo.html` — a real interactive page wiring the above together with visible buttons and a live event log, instead of a Puppeteer script. It points its import map at the **Phase 8 idle-gaze-fixed engine specifically** (not the original engine used by most earlier test harnesses), since that's the verified combination from Phase 10.

## 2. Available controls

All controls call real TalkingHead API methods on the live `head` instance — none are simulated or faked:

| Control | Calls |
|---|---|
| ▶ Play test audio | `streamStart()` + `streamAudio()` with the real detector-derived viseme timeline |
| ■ Stop | `streamStop()` |
| Trigger blink | `setValue('eyeBlinkLeft'/'eyeBlinkRight', 1, 120ms)` then back to 0 |
| Look up / Look down | `lookAt(x, y, 1200ms)` toward a point above/below the avatar on screen |
| Return to neutral | `lookAt(null, null, 1000ms)` (looks at the camera) |
| Happy / Sad / Fear / Neutral | `setMood(name)` |
| Reset avatar / camera | `setMood('neutral')` + `lookAt(null, null, 500ms)` + `resetLips()` |

Camera rotation: TalkingHead sets up its own `OrbitControls` instance internally (`head.controls`) and it's enabled by default — click-drag on the avatar to orbit, scroll to zoom. No extra wiring was needed for this.

## 3. Self-test performed before handing this to the user

Ran a Puppeteer script (`phase12-selftest.cjs`) that loads the real page in headless Chrome and clicks through every control in sequence, capturing console/page errors and a screenshot after each action.

**Result**: avatar loaded successfully (`ready: true`), status line confirms `Oculus visemes: 15, other morphs: 57`, `Engine: Phase 8 idle-gaze-fixed copy`, `Avatar: ./avatar_v5.glb`. One console error was captured — a 404 for `/favicon.ico`, the browser's automatic default-icon request, confirmed harmless and unrelated to the avatar or engine.

Every control fired without a thrown error: play → stop → blink → look up → look down → return to neutral → happy → sad → fear → reset, each followed by a screenshot. Visual confirmation:
- `phase12_demo_loaded.png` — neutral resting pose, suit renders cleanly (no hole — Phase 4's fix holds), real controls panel and live event log visible.
- `phase12_demo_lookdown.png` — gaze control visibly working: head/eyes clearly angled downward after clicking "Look down," event log shows `lookAt(down) called`.
- `phase12_demo_happy.png` — mood control fires correctly (`mood -> happy` logged); the visual change is subtle in a single frame taken ~2s after the click, consistent with Phase 10's finding that mood convergence takes up to ~9s to fully settle — this is expected behavior, not a demo defect.

All screenshots copied to `reports/mpfb_avatar_poc_assets/` with a `phase12_demo_` prefix.

## 4. Known limitations (carried over, not addressed here)

- Eye redness — visible in these screenshots too, unresolved since Phase 7/8 (out of scope for this phase, as instructed).
- Skin reads flat/waxy — Phase 6 finding, still open.
- `angry` mood — not wired into this demo's buttons at all, per the standing restriction against touching it.
- This demo loads `avatar_v5.glb` directly via `fetch`/`GLTFLoader` from a local static server — it is not integrated into the production app in any way.

## 5. How to open it

The server was already running from earlier phases (port 8924); confirmed alive and serving the new page before writing this report.

**Start the server** (only needed if it's not already running):
```
cd poc/mpfb-avatar-poc
node serve.cjs
```
It logs `serving ... on http://localhost:8924` when ready.

**Open in your browser:**

```
http://localhost:8924/phase12-demo.html
```

Wait for the status line to say "Ready..." (a few seconds), then use the buttons on the right. Click-drag on the avatar to rotate the camera; scroll to zoom.
