import { rmsDb } from "../music";
import { DEFAULT_DETECTOR_OPTIONS, type DetectorOptions, type PitchDetectorLike, type PitchEstimate } from "./types";

/**
 * Detector YIN (de Cheveigné & Kawahara, 2002), implementação própria.
 *
 * clarity = 1 − d'(τ), onde d' é a diferença normalizada cumulativa no período
 * escolhido. Perto de 1 = periódico; perto de 0 = ruído.
 *
 * Os buffers são alocados uma única vez para não gerar lixo durante a captura.
 */
export class YinDetector implements PitchDetectorLike {
  readonly name = "yin";
  readonly frameSize: number;
  private readonly opts: DetectorOptions;
  private readonly threshold: number;
  private readonly diff: Float32Array;

  constructor(frameSize = 2048, opts: Partial<DetectorOptions> = {}, threshold = 0.15) {
    this.frameSize = frameSize;
    this.opts = { ...DEFAULT_DETECTOR_OPTIONS, ...opts };
    this.threshold = threshold;
    this.diff = new Float32Array(Math.floor(frameSize / 2));
  }

  detect(frame: Float32Array, sampleRate: number): PitchEstimate {
    if (frame.length < this.frameSize) throw new Error("janela menor que frameSize");
    if (rmsDb(frame) < this.opts.minDb) return { hz: 0, clarity: 0 };

    const half = this.diff.length;
    const tauMin = Math.max(2, Math.floor(sampleRate / this.opts.maxHz));
    const tauMax = Math.min(half - 1, Math.ceil(sampleRate / this.opts.minHz));
    const d = this.diff;

    // 1) Função diferença d(τ) = Σ (x[j] − x[j+τ])²
    d[0] = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
      let sum = 0;
      for (let j = 0; j < half; j++) {
        const delta = frame[j] - frame[j + tau];
        sum += delta * delta;
      }
      d[tau] = sum;
    }

    // 2) Diferença normalizada cumulativa d'(τ)
    d[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
      running += d[tau];
      d[tau] = running > 0 ? (d[tau] * tau) / running : 1;
    }

    // 3) Primeiro mínimo abaixo do limiar (ou o mínimo global, com baixa confiança)
    let tauEst = -1;
    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (d[tau] < this.threshold) {
        while (tau + 1 <= tauMax && d[tau + 1] < d[tau]) tau++;
        tauEst = tau;
        break;
      }
    }
    if (tauEst < 0) {
      let best = tauMin;
      for (let tau = tauMin + 1; tau <= tauMax; tau++) if (d[tau] < d[best]) best = tau;
      tauEst = best;
    }

    // 4) Interpolação parabólica para precisão abaixo de uma amostra
    let refined = tauEst;
    if (tauEst > 1 && tauEst < tauMax) {
      const a = d[tauEst - 1];
      const b = d[tauEst];
      const c = d[tauEst + 1];
      const denom = a - 2 * b + c;
      if (denom !== 0) refined = tauEst + (a - c) / (2 * denom);
    }

    const hz = sampleRate / refined;
    const clarity = Math.max(0, Math.min(1, 1 - d[tauEst]));
    if (!Number.isFinite(hz) || hz < this.opts.minHz || hz > this.opts.maxHz) return { hz: 0, clarity: 0 };
    return { hz, clarity };
  }
}
