/** Conversões musicais básicas. Afinação de referência: Lá4 = 440 Hz. */

export const A4_HZ = 440;

export function midiToHz(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - 69) / 12);
}

export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / A4_HZ);
}

/** Distância em cents: 1200 × log2(cantada / alvo). Positivo = acima do alvo. */
export function cents(sungHz: number, targetHz: number): number {
  return 1200 * Math.log2(sungHz / targetHz);
}

/**
 * Dobra uma distância em cents para o intervalo [-600, 600), tratando oitavas
 * como equivalentes. Usado quando a regra aceita cantar uma oitava acima/abaixo.
 */
export function foldOctave(c: number): number {
  const r = ((c % 1200) + 1200) % 1200; // 0..1200
  return r >= 600 ? r - 1200 : r;
}

const SOLFEGE = ["dó", "dó♯", "ré", "ré♯", "mi", "fá", "fá♯", "sol", "sol♯", "lá", "lá♯", "si"];

/** Nome da nota em solfejo com oitava, ex.: 60 → "dó4". */
export function midiName(midi: number): string {
  const m = Math.round(midi);
  return `${SOLFEGE[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

export function rmsDb(frame: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  const rms = Math.sqrt(sum / Math.max(1, frame.length));
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}
