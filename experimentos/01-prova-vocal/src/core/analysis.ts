import type { PitchDetectorLike } from "./pitch/types";
import { rmsDb } from "./music";

/** Uma leitura do detector. t = instante (s) no relógio musical, no centro da janela. */
export interface PitchFrame {
  t: number;
  hz: number;
  clarity: number;
  db: number;
}

/** Intervalo entre análises (s). 10 ms = 100 leituras por segundo. */
export const DEFAULT_HOP_SEC = 0.01;

/**
 * Analisa um áudio inteiro (uso offline: testes e benchmark).
 * A captura ao vivo usa a mesma lógica no Web Worker.
 */
export function analyzeBuffer(
  samples: Float32Array,
  sampleRate: number,
  detector: PitchDetectorLike,
  hopSec = DEFAULT_HOP_SEC,
): PitchFrame[] {
  const N = detector.frameSize;
  const hop = Math.round(hopSec * sampleRate);
  const frame = new Float32Array(N);
  const out: PitchFrame[] = [];
  for (let center = 0; center < samples.length; center += hop) {
    const start = center - N / 2;
    for (let i = 0; i < N; i++) {
      const idx = start + i;
      frame[i] = idx >= 0 && idx < samples.length ? samples[idx] : 0;
    }
    const { hz, clarity } = detector.detect(frame, sampleRate);
    out.push({ t: center / sampleRate, hz, clarity, db: rmsDb(frame) });
  }
  return out;
}
