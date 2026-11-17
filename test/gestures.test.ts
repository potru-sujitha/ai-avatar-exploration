import assert from "node:assert/strict";
import { test } from "node:test";
import { SMILE_HOLD_MS, SMILE_IN_MS, SMILE_OUT_MS, SMILE_PEAK, SMILE_TOTAL_MS, smileWeight } from "../src/renderer.ts";

test("a smile is 0 before it starts and after it ends, and never exceeds its peak", () => {
  assert.equal(smileWeight(-1), 0);
  assert.equal(smileWeight(SMILE_TOTAL_MS + 1), 0);
  for (let t = 0; t <= SMILE_TOTAL_MS; t += 10) {
    const w = smileWeight(t);
    assert.ok(w >= 0 && w <= SMILE_PEAK + 1e-9, `${w} out of [0, ${SMILE_PEAK}] at ${t}ms`);
  }
});

test("a smile ramps in, holds at its peak, then ramps out, without snapping", () => {
  assert.ok(smileWeight(SMILE_IN_MS / 2) < SMILE_PEAK, "midway through the ramp-in it hasn't reached peak yet");
  assert.equal(smileWeight(SMILE_IN_MS), SMILE_PEAK);
  assert.equal(smileWeight(SMILE_IN_MS + SMILE_HOLD_MS / 2), SMILE_PEAK); // held
  assert.ok(smileWeight(SMILE_IN_MS + SMILE_HOLD_MS + SMILE_OUT_MS / 2) < SMILE_PEAK, "it's releasing by mid ramp-out");
  let previous = 0;
  for (let t = -50; t <= SMILE_TOTAL_MS + 50; t += 1000 / 60) {
    const w = smileWeight(t);
    assert.ok(Math.abs(w - previous) < 0.1, `snap of ${(w - previous).toFixed(2)} at ${t.toFixed(0)}ms`);
    previous = w;
  }
});
