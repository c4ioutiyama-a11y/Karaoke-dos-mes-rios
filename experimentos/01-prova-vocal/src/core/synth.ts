import { midiToHz } from "./music";
import type { SongMap } from "./songmap";

/** Gerador pseudoaleatório determinístico (mulberry32): mesmos testes, mesmos números. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dbToAmp = (db: number) => Math.pow(10, db / 20);

export interface VoiceOptions {
  /** Desafinação constante (cents). */
  detuneCents?: number;
  /** Deslocamento em oitavas (−1 = uma oitava abaixo). */
  octaveShift?: number;
  /** Atraso em relação ao mapa (s). Simula latência ou entrada atrasada. */
  delaySec?: number;
  /** Vibrato: frequência (Hz) e profundidade (± cents). */
  vibrato?: { rateHz: number; depthCents: number };
  /** Cantar só esta fração inicial de cada nota (1 = nota inteira). */
  sustainFraction?: number;
  /** Índices de notas que a "pessoa" não canta. */
  skipNotes?: Set<number>;
  /** Nível da voz (dBFS de pico aproximado). */
  levelDb?: number;
  /** Desvio aleatório por nota (± cents, uniforme): simula cantor amador. */
  randomCentsPerNote?: number;
  seed?: number;
}

/**
 * Sintetiza uma "voz" seguindo o mapa: soma de harmônicos com envelope, para
 * parecer mais com voz do que um seno puro. Não substitui gravações reais.
 */
export function renderVoice(map: SongMap, sampleRate: number, o: VoiceOptions = {}): Float32Array {
  const out = new Float32Array(Math.ceil(map.durationSec * sampleRate));
  const rnd = prng(o.seed ?? 1);
  const amp = dbToAmp(o.levelDb ?? -12);
  const harmonics = [1, 0.5, 0.35, 0.25, 0.15, 0.1, 0.07, 0.05];
  const hNorm = harmonics.reduce((a, b) => a + b, 0);

  map.notes.forEach((note, idx) => {
    if (o.skipNotes?.has(idx)) return;
    const detune = (o.detuneCents ?? 0) + (o.randomCentsPerNote ? (rnd() * 2 - 1) * o.randomCentsPerNote : 0);
    const f0 = midiToHz(note.midi) * Math.pow(2, (o.octaveShift ?? 0) + detune / 1200);
    const start = note.start + (o.delaySec ?? 0);
    const dur = note.dur * (o.sustainFraction ?? 1);
    const i0 = Math.max(0, Math.floor(start * sampleRate));
    const i1 = Math.min(out.length, Math.floor((start + dur) * sampleRate));
    const attack = 0.03 * sampleRate;
    const release = 0.04 * sampleRate;
    let phase = 0;
    for (let i = i0; i < i1; i++) {
      const tt = (i - i0) / sampleRate;
      const vib = o.vibrato ? Math.pow(2, (o.vibrato.depthCents * Math.sin(2 * Math.PI * o.vibrato.rateHz * tt)) / 1200) : 1;
      phase += (2 * Math.PI * f0 * vib) / sampleRate;
      let s = 0;
      for (let h = 0; h < harmonics.length; h++) s += harmonics[h] * Math.sin((h + 1) * phase);
      const env = Math.min(1, (i - i0) / attack, (i1 - i) / release);
      out[i] += (amp * env * s) / hNorm;
    }
  });
  return out;
}

/** Base instrumental de teste: baixo + acordes com timbre suave, sem melodia. */
export function renderBacking(map: SongMap, sampleRate: number, levelDb = -14): Float32Array {
  const out = new Float32Array(Math.ceil(map.durationSec * sampleRate));
  const amp = dbToAmp(levelDb);
  for (const ch of map.chords) {
    const i0 = Math.floor(ch.start * sampleRate);
    const i1 = Math.min(out.length, Math.floor((ch.start + ch.dur) * sampleRate));
    const voices = [ch.midis[0] - 12, ...ch.midis];
    for (let v = 0; v < voices.length; v++) {
      const f = midiToHz(voices[v]);
      const w = v === 0 ? 0.5 : 0.25;
      for (let i = i0; i < i1; i++) {
        const tt = (i - i0) / sampleRate;
        const env = Math.min(1, tt / 0.01) * Math.exp(-tt * 1.2);
        const ph = 2 * Math.PI * f * tt;
        out[i] += amp * w * env * (Math.sin(ph) + 0.3 * Math.sin(2 * ph));
      }
    }
  }
  return out;
}

/** Metrônomo (cliques em cada batida) — usado na calibração por batida. */
export function renderClicks(map: SongMap, sampleRate: number, levelDb = -10): Float32Array {
  const out = new Float32Array(Math.ceil(map.durationSec * sampleRate));
  const beat = 60 / map.bpm;
  const amp = dbToAmp(levelDb);
  for (let t = 0; t < map.durationSec; t += beat) {
    const i0 = Math.floor(t * sampleRate);
    for (let i = 0; i < 0.03 * sampleRate && i0 + i < out.length; i++) {
      out[i0 + i] += amp * Math.sin((2 * Math.PI * 1500 * i) / sampleRate) * Math.exp(-i / (0.005 * sampleRate));
    }
  }
  return out;
}

export function whiteNoise(length: number, levelDb: number, seed = 7): Float32Array {
  const rnd = prng(seed);
  const amp = dbToAmp(levelDb) * Math.sqrt(3); // RMS ≈ levelDb
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = (rnd() * 2 - 1) * amp;
  return out;
}

export function mix(...tracks: Float32Array[]): Float32Array {
  const n = Math.max(...tracks.map((t) => t.length));
  const out = new Float32Array(n);
  for (const t of tracks) for (let i = 0; i < t.length; i++) out[i] += t[i];
  return out;
}

export function silence(length: number): Float32Array {
  return new Float32Array(length);
}
