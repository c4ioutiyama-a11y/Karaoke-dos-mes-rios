import { midiName } from "./music";

/** Uma nota do mapa vocal. Tempos em segundos a partir do início do áudio. */
export interface VocalNote {
  start: number;
  dur: number;
  midi: number;
  lyric: string;
  /** false = trecho falado/rap: fica fora da pontuação de afinação. Padrão: true. */
  tonal?: boolean;
}

export interface SongMap {
  songId: string;
  /** Versão do arranjo/mapa. Resultados de versões diferentes não são comparáveis. */
  arrangementVersion: number;
  title: string;
  credits: string;
  bpm: number;
  /** Duração total do áudio (s). */
  durationSec: number;
  notes: VocalNote[];
  /** Acordes da base instrumental (para o sintetizador de teste). */
  chords: { start: number; dur: number; midis: number[] }[];
}

export function totalVocalSeconds(map: SongMap): number {
  return map.notes.filter((n) => n.tonal !== false).reduce((s, n) => s + n.dur, 0);
}

/**
 * Melodia de teste: "Brilha, brilha, estrelinha" (melodia tradicional, domínio
 * público). A letra exibida são os nomes das notas em solfejo, para evitar
 * qualquer questão de direitos sobre letras e ajudar quem está testando.
 *
 * 4 frases, 90 bpm, dó maior, começando após 2 compassos de introdução.
 */
export function buildTestSong(phrases = 4): SongMap {
  const bpm = 90;
  const beat = 60 / bpm;
  const intro = 8 * beat; // 2 compassos 4/4
  // [midi, batidas]
  const C = 60, D = 62, E = 64, F = 65, G = 67, A = 69;
  const p1: [number, number][] = [[C, 1], [C, 1], [G, 1], [G, 1], [A, 1], [A, 1], [G, 2]];
  const p2: [number, number][] = [[F, 1], [F, 1], [E, 1], [E, 1], [D, 1], [D, 1], [C, 2]];
  const p3: [number, number][] = [[G, 1], [G, 1], [F, 1], [F, 1], [E, 1], [E, 1], [D, 2]];
  const all = [p1, p2, p3, p3, p1, p2].slice(0, phrases);

  // Acordes por compasso (cada frase = 2 compassos)
  const I = [48, 52, 55], IV = [53, 57, 60], V = [55, 59, 62];
  const chordsByPhrase: Record<number, number[][]> = { 0: [I, IV], 1: [IV, I], 2: [I, V], 3: [I, V], 4: [I, IV], 5: [IV, I] };
  const order = [0, 1, 2, 3, 4, 5].slice(0, phrases);

  const notes: VocalNote[] = [];
  const chords: SongMap["chords"] = [{ start: 0, dur: 4 * beat, midis: I }, { start: 4 * beat, dur: 4 * beat, midis: V }];
  let t = intro;
  all.forEach((phrase, pi) => {
    const phraseStart = t;
    for (const [midi, beats] of phrase) {
      // Notas ocupam 90% da batida: pequena pausa de articulação entre sílabas.
      const dur = beats * beat * (beats > 1 ? 0.85 : 0.9);
      notes.push({ start: t, dur, midi, lyric: midiName(midi).replace(/\d+$/, "") });
      t += beats * beat;
    }
    const bars = chordsByPhrase[order[pi]];
    chords.push({ start: phraseStart, dur: 4 * beat, midis: bars[0] });
    chords.push({ start: phraseStart + 4 * beat, dur: 4 * beat, midis: bars[1] });
  });

  return {
    songId: "teste-brilha-brilha",
    arrangementVersion: 1,
    title: "Brilha, brilha, estrelinha (teste)",
    credits: "Melodia tradicional (domínio público). Arranjo sintético de teste.",
    bpm,
    durationSec: t + 2 * beat,
    notes,
    chords,
  };
}
