# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@interviewflowai/talking-avatar` is a free, open-source (MIT) npm package: real-time lip sync for 3D avatars in
the browser. It takes any audio (TTS, a WebRTC voice-agent stream, a microphone) and drives a `.glb` avatar's
mouth/blink/brow morph targets — entirely client-side, no server, no API key. It ships a framework-free core class
plus a thin React wrapper, a small trained lip-sync model, and two built-in 3D avatars (Microsoft Rocketbox, MIT).

There is no backend, no Docker, and no Terraform in this repository — it is a browser SDK only. (Up to v0.2.0 it
also contained clients for a separate paid "Realistic Avatars" service; those moved to their own package,
`@talkingavatar/sdk`, in v0.3.0 — see `CHANGELOG.md`.)

## Commands

```sh
npm install
npm test                                  # all test/*.test.ts via node:test, run with tsx
tsx --test test/coarticulation.test.ts    # a single test file
npm run typecheck                         # tsc -p tsconfig.json --noEmit
npm run build                             # dist/: ESM bundles + .d.ts + viseme-model.bin + avatars/
```

`npm run prepublishOnly` runs typecheck → test → build, in that order; CI (`.github/workflows/ci.yml`) runs
typecheck, test, build and `npm pack --dry-run` on Node 20, 22 and 24 for every push to `master` and every PR.

There is no lint script. There is no `dev`/`demo` npm script — `demo/` has its own `vite.config.ts` and
`index.html` but nothing in `package.json` wires it up; it must be pointed to directly with `vite` if run locally.

## Architecture

### Pipeline (`src/`)

```
audio ──► [resample 16 kHz] ──► [log-mel, 10 ms frames] ──► [causal conv net] ──► viseme IDs
                                                                                     │
avatar ◄── [morph targets, speed-limited] ◄── [coarticulation: smooth mouth weights] ◄┘
```

- **`TalkingAvatar.ts`** — the public class and the only stateful orchestrator. Owns the `AudioContext`, wires an
  `AudioWorklet` (`CAPTURE_WORKLET`, inlined as a string and loaded from a `blob:` URL) that hands live-stream
  audio from the audio thread to the model in 1024-sample blocks, and schedules/plays audio itself (clips via
  `speak()`, streams via `attachStream()` — the SDK always plays the audio, callers must not play it elsewhere).
  Converts raw model output into timestamped `VisemeEvent`s and, every render frame, asks `coarticulation.ts` for
  the current mouth weights at "now" (computed from the audio context's actual output timestamp, not wall clock).
- **`visemeModel.ts`** — `parseVisemeModel()` reads `model/viseme-model.bin` (custom binary: uint32 header length +
  JSON header + float32 tensors). `VisemeStream` is the inference engine: STFT → mel filterbank → a ~260k-parameter
  causal dilated Conv1d stack → one viseme ID (0–21) per 10 ms hop. Plain loops, no WebAssembly/ML runtime.
  `test/visemeModel.test.ts` checks this frame-by-frame against a PyTorch reference (`test/fixtures/parity-*`) —
  **any change to the feature pipeline or inference must keep this test passing**.
- **`resampler.ts`** — streaming windowed-sinc resampler (any input rate → the model's 16 kHz), used because
  streams/mics arrive at arbitrary sample rates; precomputes kernels for 128 fractional phases.
- **`visemeDetector.ts`** — wraps `Resampler` + `VisemeStream` into "audio samples in, timed `VisemeEvent`s out".
  Debounces one-frame flicker (`MIN_RUN_FRAMES`), compensates for the model's lookahead, and backdates events to
  when the sound actually started.
- **`coarticulation.ts`** — turns the discrete viseme timeline into smooth per-frame mouth weights using
  JALI-style rules (Edwards et al., SIGGRAPH 2016): tongue-only sounds borrow a neighboring vowel's lip shape,
  shapes ramp in/out around a hold, and p/b/m/f/v closures override everything overlapping them. Pure functions
  over `(viseme id, ms)` events — no avatar or DOM knowledge, hence directly unit-testable.
- **`renderer.ts`** — the only three.js-aware module. `AvatarRenderer` loads a `.glb` (meshopt-decoded), tunes
  Rocketbox PBR materials by inspecting mesh skinning/morphs (`refineMaterial`), frames the face in close-up from
  detected morph-displaced vertices (`faceCenter`), and every `requestAnimationFrame` applies: mouth weights from
  `TalkingAvatar` → viseme/ARKit morph targets (with per-morph slew-rate limiting so shapes glide, not snap),
  procedural blinks, idle/triggered smiles, and eased listening/thinking brow expressions. Morph target names are
  indirected through `MorphTargetMap` so avatars with non-standard names (or the auto-detected `h_expressions.*_h`
  convention) work via `morphTargets`.
- **`react.tsx`** — `TalkingAvatarView`: a thin wrapper that owns one `TalkingAvatar` instance per mount,
  re-synchronizes it with props (`avatarUrl`, `stream`, `status`) via effects, and exposes the instance through
  `ref`.
- **`index.ts`** — the package's public surface (`TalkingAvatar`, `AVATARS`, `DEFAULT_MODEL_URL`, types); this is
  also what `tsconfig.build.json` emits declarations from.

Everything downstream of `visemeDetector.ts` is pure/synchronous and avatar-agnostic; everything in `renderer.ts`
is where three.js and Rocketbox-specific tuning lives. When changing lip-sync behavior, prefer touching
`coarticulation.ts` (timing/shape rules) over `renderer.ts` (how weights are applied) unless the issue is about a
specific morph target or material.

### Build & packaging

- `vite.config.ts` builds a library (`src/index.ts` + `src/react.tsx`) to ESM only; `three`/`react`/`react-dom`
  stay externalized peer dependencies. `tsconfig.build.json` (extends `tsconfig.json`) then emits `.d.ts` only
  (`emitDeclarationOnly`). `npm run build` glues these together and copies `model/viseme-model.bin` and `avatars/`
  into `dist/`, which is what `package.json#files`/`#exports` publish.
  `DEFAULT_MODEL_URL`/`AVATARS` point at jsDelivr URLs pinned to `__VERSION__` (injected at build time from
  `package.json`'s version via `vite.config.ts`'s `define`), so these only resolve correctly in a built package,
  not when importing `src/` directly outside of tests.
- `tsconfig.json` is the dev/typecheck config (`noEmit`, includes `src` + `test`, allows `.ts` import extensions).

### Tests

Node's built-in test runner via `tsx`, no separate test framework/config. `test/helpers.ts` loads the real
`model/viseme-model.bin` and the PyTorch parity fixtures (`test/fixtures/parity-audio.f32`,
`parity-visemes.u8`) shared by multiple suites. Per CONTRIBUTING.md: add/update a `test/*.test.ts` for any logic
change, and lip-sync timing/coarticulation/mouth-mapping changes need evidence (test results plus a before/after
recording on an avatar) since they're otherwise hard to review from a diff.

### Repository layout beyond `src/`

- `demo/` — a manual, browser-based smoke-test page (mic input, file playback, avatar switcher) served from
  `demo/public/` so it works offline; not part of the published package.
- `test/` — `node:test` suites and binary fixtures (see above).
- `model/`, `avatars/` — the shipped lip-sync model and the two built-in `.glb` avatars (plus their Microsoft
  license) that get copied into `dist/` at build time.
- `poc/`, `work/`, `research_notes/`, `reports/` — untracked-by-default R&D scratch space (experiments with
  alternative avatar pipelines such as MakeHuman/MPFB and the third-party TalkingHead/HeadAudio projects, avatar
  photo-reskinning/hair-transplant experiments, and research notes on photo-to-avatar pipelines). These are not
  part of the SDK, have no build/test wiring, and mostly contain one-off scripts, Blender files and renders rather
  than maintained code.

## Guidelines (from CONTRIBUTING.md)

- Keep the public API small — new options/methods need a clear stated use case.
- Only the face moves (mouth, blinks, brows) — gaze/head motion is deliberately out of scope.
- Update `README.md` for user-visible changes and add an entry under "Unreleased" in `CHANGELOG.md`.
