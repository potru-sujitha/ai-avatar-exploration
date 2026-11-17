// Phase 10: generate real-audio lip-sync test variants from the existing project's
// own test fixture, run through the EXISTING, unmodified pipeline
// (src/visemeDetector.ts, src/visemeModel.ts) -- no synthetic/assigned morph values.
// Read-only against the main project; only writes into this phase's own directory.
import { readFileSync, writeFileSync } from "node:fs";
import { VisemeDetector } from "../../../src/visemeDetector.ts";
import { parseVisemeModel } from "../../../src/visemeModel.ts";

const VISEME_TO_OCULUS = [
  "sil", "aa", "aa", "O", "E", "E", "I", "U", "O", "aa", "O", "aa", "kk", "RR", "nn", "SS", "CH", "TH", "FF", "DD",
  "kk", "PP",
];

const bytes = (path: string) => {
  const buf = readFileSync(new URL(path, import.meta.url));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

const model = parseVisemeModel(bytes("../../../model/viseme-model.bin"));
const fullClip = new Float32Array(bytes("../../../test/fixtures/parity-audio.f32"));
const SR = 16000;

function detect(audio: Float32Array) {
  const events: { id: number; ms: number }[] = [];
  const detector = new VisemeDetector(model, SR, 0, (e) => events.push(e));
  for (let i = 0; i < audio.length; i += 1024) detector.push(audio.subarray(i, i + 1024));
  detector.flush();
  return events;
}

function eventsToTimeline(events: { id: number; ms: number }[], durationMs: number) {
  const visemes: string[] = [];
  const vtimes: number[] = [];
  const vdurations: number[] = [];
  for (let i = 0; i < events.length; i += 1) {
    const name = VISEME_TO_OCULUS[events[i].id];
    if (name === "sil") continue;
    const next = i + 1 < events.length ? events[i + 1].ms : durationMs;
    visemes.push(name);
    vtimes.push(events[i].ms);
    vdurations.push(Math.max(60, next - events[i].ms));
  }
  return { visemes, vtimes, vdurations, durationMs };
}

function writeWav(path: string, pcm: Float32Array, sampleRate: number) {
  const bytesPerSample = 2;
  const buf = Buffer.alloc(44 + pcm.length * bytesPerSample);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + pcm.length * bytesPerSample, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buf.writeUInt16LE(bytesPerSample, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(pcm.length * bytesPerSample, 40);
  for (let i = 0; i < pcm.length; i += 1) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    buf.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2);
  }
  writeFileSync(path, buf);
}

function silence(ms: number): Float32Array {
  return new Float32Array(Math.round((ms / 1000) * SR));
}

function concat(...parts: Float32Array[]): Float32Array {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// Real-audio-only variants (no synthetic morph assignment, per task requirement).
// "short sentence": first ~1s of the real clip.
const shortClip = fullClip.slice(0, SR * 1);
// "continuous speech" / "long sentence": the real clip repeated back-to-back, 3x (9s).
const continuousClip = concat(fullClip, fullClip, fullClip);
// "pauses": real clip + 800ms real silence + real clip again, to exercise a mid-utterance gap.
const pausedClip = concat(fullClip, silence(800), fullClip);

const variants: Record<string, Float32Array> = {
  short: shortClip,
  continuous: continuousClip,
  paused: pausedClip,
};

for (const [name, audio] of Object.entries(variants)) {
  const events = detect(audio);
  const durationMs = (audio.length / SR) * 1000;
  const timeline = eventsToTimeline(events, durationMs);
  writeFileSync(new URL(`./timeline_${name}.json`, import.meta.url), JSON.stringify(timeline));
  writeWav(new URL(`./${name}.wav`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), audio, SR);
  console.log(`[${name}] duration=${durationMs.toFixed(0)}ms events=${events.length} visemes=${timeline.visemes.length}`);
}

console.log("NOTE: 'question' intonation and 'different speaking speed' variants were NOT generated --");
console.log("the only real audio fixture available (test/fixtures/parity-audio.f32) is a single");
console.log("neutral-reading 3s clip with no question intonation, and synthesizing a sped-up/slowed");
console.log("variant would require either resampling (changes pitch, not a real 'speed' test of the");
console.log("lip-sync pipeline) or assigning morph values manually (forbidden by this phase's task).");
console.log("These two sub-cases are reported as NOT TESTED due to no suitable real-audio fixture.");
