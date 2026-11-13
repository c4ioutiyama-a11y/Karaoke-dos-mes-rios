/** Resultado de um detector para uma janela de áudio. hz = 0 significa "sem altura". */
export interface PitchEstimate {
  hz: number;
  /** Confiança entre 0 e 1 (significado varia por algoritmo; ver cada detector). */
  clarity: number;
}

export interface DetectorOptions {
  /** Menor frequência aceita (Hz). Voz humana cantada raramente fica abaixo de ~70 Hz. */
  minHz: number;
  /** Maior frequência aceita (Hz). */
  maxHz: number;
  /** Janelas mais baixas que isto (dBFS, RMS) são tratadas como silêncio. */
  minDb: number;
}

export const DEFAULT_DETECTOR_OPTIONS: DetectorOptions = {
  minHz: 70,
  maxHz: 1100,
  minDb: -50,
};

export interface PitchDetectorLike {
  readonly name: string;
  readonly frameSize: number;
  detect(frame: Float32Array, sampleRate: number): PitchEstimate;
}

export type DetectorName = "yin" | "mpm";
