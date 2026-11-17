import { TalkingAvatar } from "../src/index";

// Served from demo/public/ (copied from the repo's model/ and avatars/), so the demo works offline and
// doesn't depend on the jsDelivr-hosted build (which needs the __VERSION__ constant set at build time).
const LOCAL_AVATARS = {
  female: "/avatars/female.glb",
  femaleLooseHair: "/avatars/female-loose-hair.glb",
  femalePhotoSkin: "/avatars/female-photo-skin.glb",
  femalePhotoSkinV2: "/avatars/female-photo-skin-v2.glb",
  male: "/avatars/male.glb",
};

const container = document.getElementById("avatar")!;
const statusEl = document.getElementById("status")!;
const micBtn = document.getElementById("mic") as HTMLButtonElement;
const stopBtn = document.getElementById("stopmic") as HTMLButtonElement;
const fileInput = document.getElementById("file") as HTMLInputElement;
const avatarSelect = document.getElementById("avatarSelect") as HTMLSelectElement;
const smileBtn = document.getElementById("smileBtn") as HTMLButtonElement;

const avatar = new TalkingAvatar({
  container,
  avatarUrl: LOCAL_AVATARS.female,
  modelUrl: "/viseme-model.bin",
  onError: (error) => {
    statusEl.textContent = `Error: ${error.message}`;
    console.error(error);
  },
});

avatar.ready.then(() => {
  statusEl.textContent = "Avatar loaded. Start the microphone or play an audio file.";
});

smileBtn.addEventListener("click", () => avatar.smile());

avatarSelect.addEventListener("change", () => {
  const url = LOCAL_AVATARS[avatarSelect.value as keyof typeof LOCAL_AVATARS];
  statusEl.textContent = "Loading avatar…";
  avatar
    .setAvatar(url)
    .then(() => { statusEl.textContent = "Avatar loaded. Start the microphone or play an audio file."; })
    .catch((error) => { statusEl.textContent = `Error: ${(error as Error).message}`; });
});

let micStream: MediaStream | null = null;

micBtn.addEventListener("click", async () => {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await avatar.attachStream(micStream);
    micBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = "Listening to the microphone — talk!";
  } catch (error) {
    statusEl.textContent = `Microphone error: ${(error as Error).message}`;
  }
});

stopBtn.addEventListener("click", () => {
  avatar.detachStream();
  micStream?.getTracks().forEach((track) => track.stop());
  micStream = null;
  micBtn.disabled = false;
  stopBtn.disabled = true;
  statusEl.textContent = "Microphone stopped.";
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  statusEl.textContent = `Playing ${file.name}…`;
  try {
    await avatar.speak(await file.arrayBuffer());
    statusEl.textContent = "Done.";
  } catch (error) {
    statusEl.textContent = `Playback error: ${(error as Error).message}`;
  }
});
