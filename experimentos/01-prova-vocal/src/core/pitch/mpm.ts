import { PitchDetector } from "pitchy";
import { rmsDb } from "../music";
import { DEFAULT_DETECTOR_OPTIONS, type DetectorOptions, type PitchDetectorLike, type PitchEstimate } from "./types";

/**
 * Adaptador da biblioteca Pitchy (McLeod Pitch Method).
 * clarity vem diretamente da Pitchy (pico normalizado do NSDF, 0..1).
 */
export class MpmDetector implements PitchDetectorLike {
  readonly name = "mpm";
  readonly frameSize: number;
  private readonly opts: DetectorOptions;
  private readonly detector: PitchDetector<Float32Array>;

  constructor(frameSize = 2048, opts: Partial<DetectorOptions> = {}) {
    this.frameSize = frameSize;
    this.opts = { ...DEFAULT_DETECTOR_OPTIONS, ...opts };
    this.detector = PitchDetector.forFloat32Array(frameSize);
    this.detector.minVolumeDecibels = this.opts.minDb;
  }

  detect(frame: Float32Array, sampleRate: number): PitchEstimate {
    if (rmsDb(frame) < this.opts.minDb) return { hz: 0, clarity: 0 };
    const [hz, clarity] = this.detector.findPitch(frame, sampleRate);
    if (!Number.isFinite(hz) || hz < this.opts.minHz || hz > this.opts.maxHz) return { hz: 0, clarity: 0 };
    return { hz, clarity };
  }
}
