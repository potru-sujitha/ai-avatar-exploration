// Isolated POC script: runs the EXISTING, unmodified pipeline (src/visemeDetector.ts,
// src/visemeModel.ts, src/coarticulation.ts) against the existing test fixture audio,
// then dumps a sampled viseme-weight timeline + a playable WAV, for a separate browser
// page to apply to a TalkingHead-loaded avatar. Read-only against the main project.
import { readFileSync, writeFileSync } from "node:fs";
import { VisemeDetector } from "../../src/visemeDetector.ts";
import { parseVisemeModel } from "../../src/visemeModel.ts";

// Same ID -> Oculus-viseme-name table the existing project's own coarticulation.ts
// uses (copied, read-only, for this isolated POC's own event-to-name conversion;
// the existing file itself was not modified).
const VISEME_TO_OCULUS = [
  "sil", "aa", "aa", "O", "E", "E", "I", "U", "O", "aa", "O", "aa", "kk", "RR", "nn", "SS", "CH", "TH", "FF", "DD",
  "kk", "PP",
];

const bytes = (path: string) => {
  const buf = readFileSync(new URL(path, import.meta.url));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

const model = parseVisemeModel(bytes("../../model/viseme-model.bin"));
const audio = new Float32Array(bytes("../../test/fixtures/parity-audio.f32"));
const SR = 16000;

const events: { id: number; ms: number }[] = [];
const detector = new VisemeDetector(model, SR, 0, (e) => events.push(e));
for (let i = 0; i < audio.length; i += 1024) detector.push(audio.subarray(i, i + 1024));
detector.flush();
console.log(`detected ${events.length} viseme events over ${(audio.length / SR * 1000).toFixed(0)} ms`);

// TalkingHead's own speakAudio() wants explicit { visemes, vtimes, vdurations }
// (Oculus viseme name strings + per-event ms timing) -- this is its real,
// documented external-viseme integration point, not a raw mesh/morph poke.
const durationMs = (audio.length / SR) * 1000;
const visemes: string[] = [];
const vtimes: number[] = [];
const vdurations: number[] = [];
for (let i = 0; i < events.length; i += 1) {
  const name = VISEME_TO_OCULUS[events[i].id];
  if (name === "sil") continue; // TalkingHead has no viseme_sil target; silence = all visemes relax
  const next = i + 1 < events.length ? events[i + 1].ms : durationMs;
  visemes.push(name);
  vtimes.push(events[i].ms);
  vdurations.push(Math.max(60, next - events[i].ms));
}
writeFileSync(new URL("./timeline.json", import.meta.url), JSON.stringify({ visemes, vtimes, vdurations, durationMs }));
console.log(`wrote ${visemes.length} viseme events to timeline.json`);

// Convert the raw 16kHz mono f32 PCM fixture into a playable WAV for the browser page.
function writeWav(path: string, pcm: Float32Array, sampleRate: number) {
  const bytesPerSample = 2;
  const buf = Buffer.alloc(44 + pcm.length * bytesPerSample);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + pcm.length * bytesPerSample, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
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
writeWav(new URL("./parity-audio.wav", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), audio, SR);
console.log("wrote parity-audio.wav");
