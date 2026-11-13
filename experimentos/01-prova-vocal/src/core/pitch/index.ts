import { MpmDetector } from "./mpm";
import type { DetectorName, DetectorOptions, PitchDetectorLike } from "./types";
import { YinDetector } from "./yin";

export * from "./types";
export { MpmDetector, YinDetector };

export function createDetector(
  name: DetectorName,
  frameSize = 2048,
  opts: Partial<DetectorOptions> = {},
): PitchDetectorLike {
  return name === "yin" ? new YinDetector(frameSize, opts) : new MpmDetector(frameSize, opts);
}
