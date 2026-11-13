/**
 * Web Worker de detecção: recebe amostras direto do AudioWorklet (MessagePort),
 * roda o detector a cada passo e devolve leituras em lote para a interface.
 *
 * Tempo das leituras: segundos no relógio do AudioContext (currentFrame / sampleRate),
 * no centro da janela analisada.
 */
import type { PitchFrame } from "../core/analysis";
import { rmsDb } from "../core/music";
import { createDetector, type DetectorName, type PitchDetectorLike } from "../core/pitch";

export type WorkerIn =
  | { type: "init"; sampleRate: number; detector: DetectorName; frameSize: number; hopSec: number; port: MessagePort }
  | { type: "detector"; detector: DetectorName };

export type WorkerOut = { type: "frames"; frames: PitchFrame[]; busyMs: number };

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerIn>) => void) | null;
  postMessage(msg: WorkerOut): void;
};

let detector: PitchDetectorLike;
let sampleRate = 48000;
let frameSize = 2048;
let hop = 480;
// Anel com as últimas amostras e o índice global da próxima amostra a escrever.
let ring = new Float32Array(8192);
let written = 0; // índice global (frames do AudioContext) após a última amostra recebida
let nextCenter = -1;
const win = new Float32Array(4096);
let pending: PitchFrame[] = [];
let busy = 0;
let lastFlush = 0;

function onChunk(frame: number, samples: Float32Array) {
  if (nextCenter < 0) nextCenter = frame + frameSize; // espera encher a primeira janela
  if (frame > written && written > 0) {
    // Buraco: amostras perdidas. Pulamos o centro para não inventar leituras.
    nextCenter = Math.max(nextCenter, frame + frameSize / 2);
  }
  for (let i = 0; i < samples.length; i++) ring[(frame + i) % ring.length] = samples[i];
  written = frame + samples.length;

  const t0 = performance.now();
  while (nextCenter + frameSize / 2 <= written) {
    const start = nextCenter - frameSize / 2;
    const w = win.subarray(0, frameSize);
    for (let i = 0; i < frameSize; i++) w[i] = ring[(start + i) % ring.length];
    const { hz, clarity } = detector.detect(w, sampleRate);
    pending.push({ t: nextCenter / sampleRate, hz, clarity, db: rmsDb(w) });
    nextCenter += hop;
  }
  busy += performance.now() - t0;

  const now = performance.now();
  if (pending.length > 0 && now - lastFlush > 30) {
    scope.postMessage({ type: "frames", frames: pending, busyMs: busy });
    pending = [];
    busy = 0;
    lastFlush = now;
  }
}

scope.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "init") {
    sampleRate = msg.sampleRate;
    frameSize = msg.frameSize;
    hop = Math.round(msg.hopSec * sampleRate);
    ring = new Float32Array(Math.max(8192, frameSize * 4));
    detector = createDetector(msg.detector, frameSize);
    written = 0;
    nextCenter = -1;
    msg.port.onmessage = (ev: MessageEvent<{ frame: number; samples: Float32Array }>) => onChunk(ev.data.frame, ev.data.samples);
  } else if (msg.type === "detector") {
    detector = createDetector(msg.detector, frameSize);
  }
};
