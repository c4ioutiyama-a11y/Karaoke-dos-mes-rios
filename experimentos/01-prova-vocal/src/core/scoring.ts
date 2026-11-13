import type { PitchFrame } from "./analysis";
import { cents, foldOctave, midiToHz } from "./music";
import type { SongMap } from "./songmap";

/**
 * Regras de pontuação. Todo resultado registra id e versão da regra usada:
 * mudar qualquer parâmetro exige nova versão, senão rankings misturam regras.
 *
 * Os valores abaixo são HIPÓTESES INICIAIS, a calibrar com o corpus de vozes.
 */
export interface ScoringRules {
  id: string;
  version: number;
  /** Até esta distância (cents) a afinação vale 100%. */
  fullCreditCents: number;
  /** A partir desta distância (cents) vale 0%. Entre os dois, queda linear. */
  zeroCreditCents: number;
  /** Aceitar oitava acima/abaixo como equivalente (vozes graves e agudas). */
  octaveFolding: boolean;
  /** Folga de tempo (s) para cada instante esperado buscar a voz. */
  timingToleranceSec: number;
  /** Leituras com confiança abaixo disto contam como "sem voz". */
  minClarity: number;
  /** Granularidade da avaliação (s). */
  stepSec: number;
}

export const RULES: Record<string, ScoringRules> = {
  casual: {
    id: "casual",
    version: 1,
    fullCreditCents: 50,
    zeroCreditCents: 150,
    octaveFolding: true,
    timingToleranceSec: 0.12,
    minClarity: 0.8,
    stepSec: 0.01,
  },
  dificil: {
    id: "dificil",
    version: 1,
    fullCreditCents: 25,
    zeroCreditCents: 100,
    octaveFolding: true,
    timingToleranceSec: 0.06,
    minClarity: 0.85,
    stepSec: 0.01,
  },
};

export const MAX_POINTS = 10_000;

/** Acerto de afinação (0..1) de uma leitura em relação ao alvo. */
export function pitchCredit(sungHz: number, targetHz: number, rules: ScoringRules): number {
  if (sungHz <= 0) return 0;
  let c = cents(sungHz, targetHz);
  if (rules.octaveFolding) c = foldOctave(c);
  const a = Math.abs(c);
  if (a <= rules.fullCreditCents) return 1;
  if (a >= rules.zeroCreditCents) return 0;
  return 1 - (a - rules.fullCreditCents) / (rules.zeroCreditCents - rules.fullCreditCents);
}

export interface NoteResult {
  index: number;
  /** Acerto médio da nota (0..1), ponderado pela duração. */
  credit: number;
  /** Fração da nota em que havia voz detectada (independente da afinação). */
  coverage: number;
  /** Desvio mediano (cents, já dobrado se a regra dobra oitava). null = sem voz. */
  medianCents: number | null;
  /** Atraso da entrada (s): positivo = entrou depois. null = não entrou. */
  onsetErrorSec: number | null;
}

export interface ScoreResult {
  points: number;
  songId: string;
  arrangementVersion: number;
  rulesId: string;
  rulesVersion: number;
  latencySec: number;
  /** false se a captura teve falhas; o resultado não deve ser comparado. */
  complete: boolean;
  incompleteReasons: string[];
  /** Explicações separadas (não somadas de novo aos pontos). */
  breakdown: {
    /** Média do acerto de afinação nos trechos em que houve voz. */
    afinacao: number;
    /** Fração do tempo vocal esperado em que houve voz. */
    cobertura: number;
    /** Atraso mediano das entradas (s). */
    entradaMedianaSec: number | null;
  };
  notes: NoteResult[];
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Primeiro índice com frames[i].t >= t (frames ordenados por t). */
function lowerBound(frames: PitchFrame[], t: number): number {
  let lo = 0, hi = frames.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export interface ScoreOptions {
  /** Atraso total (saída + entrada) a descontar das leituras (s). */
  latencySec?: number;
  /** Avaliar só até este instante musical (placar parcial ao vivo). */
  untilSec?: number;
  /** Falhas de captura detectadas fora da pontuação (aba suspensa, troca de microfone...). */
  externalIncompleteReasons?: string[];
}

/**
 * Pontuação base:
 *   pontos = 10.000 × Σ(passo × acerto) / Σ(duração vocal esperada)
 *
 * - O denominador é sempre a referência: silêncio numa nota esperada vale zero.
 * - Cada instante esperado procura a melhor leitura dentro de ±timingTolerance.
 * - Notas não tonais (tonal: false) ficam fora do numerador e do denominador.
 */
export function scoreFrames(frames: PitchFrame[], map: SongMap, rules: ScoringRules, opts: ScoreOptions = {}): ScoreResult {
  const latency = opts.latencySec ?? 0;
  const until = opts.untilSec ?? Infinity;
  // Leituras no tempo musical corrigido
  const fr: PitchFrame[] = frames.map((f) => ({ ...f, t: f.t - latency }));
  const voiced = (f: PitchFrame) => f.hz > 0 && f.clarity >= rules.minClarity;

  const tol = rules.timingToleranceSec;
  const step = rules.stepSec;
  let num = 0;
  let den = 0;
  let voicedSteps = 0;
  let voicedCreditSum = 0;
  let totalSteps = 0;
  const noteResults: NoteResult[] = [];

  map.notes.forEach((note, index) => {
    if (note.tonal === false) return;
    if (note.start >= until) return;
    const target = midiToHz(note.midi);
    const end = Math.min(note.start + note.dur, until);
    const nSteps = Math.max(1, Math.round((end - note.start) / step));
    let noteCredit = 0;
    let noteVoiced = 0;
    const devs: number[] = [];

    for (let k = 0; k < nSteps; k++) {
      const s = note.start + (k + 0.5) * step;
      let best = 0;
      let bestDev: number | null = null;
      let anyVoice = false;
      for (let i = lowerBound(fr, s - tol); i < fr.length && fr[i].t <= s + tol; i++) {
        const f = fr[i];
        if (!voiced(f)) continue;
        anyVoice = true;
        best = Math.max(best, pitchCredit(f.hz, target, rules));
        let d = cents(f.hz, target);
        if (rules.octaveFolding) d = foldOctave(d);
        if (bestDev === null || Math.abs(d) < Math.abs(bestDev)) bestDev = d;
      }
      noteCredit += best;
      if (anyVoice) {
        noteVoiced++;
        voicedCreditSum += best;
        if (bestDev !== null) devs.push(bestDev);
      }
    }

    // Entrada: primeira leitura com voz e algum acerto, de até 300 ms antes até o fim
    // da nota. A busca não volta além do meio da pausa após a nota anterior, para não
    // confundir a nota anterior (às vezes igual) com uma entrada adiantada.
    // Limitação: em legato sem pausa entre notas iguais, a entrada é ambígua.
    const prev = map.notes[index - 1];
    const searchFrom = prev ? Math.max(note.start - 0.3, (prev.start + prev.dur + note.start) / 2) : note.start - 0.3;
    let onset: number | null = null;
    for (let i = lowerBound(fr, searchFrom); i < fr.length && fr[i].t <= note.start + note.dur; i++) {
      if (voiced(fr[i]) && pitchCredit(fr[i].hz, target, rules) > 0) {
        onset = fr[i].t - note.start;
        break;
      }
    }

    const dur = nSteps * step;
    num += (noteCredit / nSteps) * dur;
    den += dur;
    voicedSteps += noteVoiced;
    totalSteps += nSteps;
    noteResults.push({
      index,
      credit: noteCredit / nSteps,
      coverage: noteVoiced / nSteps,
      medianCents: median(devs),
      onsetErrorSec: onset,
    });
  });

  // Falhas de captura: buracos entre leituras durante trechos vocais.
  const reasons = [...(opts.externalIncompleteReasons ?? [])];
  const gaps = findCaptureGaps(frames, map, latency, until);
  if (gaps.length > 0) reasons.push(`captura com ${gaps.length} interrupção(ões) durante o canto`);

  return {
    points: den > 0 ? Math.round((MAX_POINTS * num) / den) : 0,
    songId: map.songId,
    arrangementVersion: map.arrangementVersion,
    rulesId: rules.id,
    rulesVersion: rules.version,
    latencySec: latency,
    complete: reasons.length === 0,
    incompleteReasons: reasons,
    breakdown: {
      afinacao: voicedSteps > 0 ? voicedCreditSum / voicedSteps : 0,
      cobertura: totalSteps > 0 ? voicedSteps / totalSteps : 0,
      entradaMedianaSec: median(noteResults.map((n) => n.onsetErrorSec).filter((x): x is number => x !== null)),
    },
    notes: noteResults,
  };
}

/**
 * Procura buracos (> maxGapSec) na sequência de leituras dentro de trechos vocais.
 * O detector emite uma leitura a cada passo mesmo em silêncio; um buraco indica
 * que o áudio não foi processado (aba suspensa, travamento, microfone removido).
 */
export function findCaptureGaps(frames: PitchFrame[], map: SongMap, latencySec = 0, untilSec = Infinity, maxGapSec = 0.25): { from: number; to: number }[] {
  const gaps: { from: number; to: number }[] = [];
  const vocal = map.notes.filter((n) => n.tonal !== false && n.start < untilSec);
  if (vocal.length === 0) return gaps;
  const first = vocal[0].start;
  const last = Math.min(untilSec, vocal[vocal.length - 1].start + vocal[vocal.length - 1].dur);
  const ts = frames.map((f) => f.t - latencySec).filter((t) => t >= first - maxGapSec && t <= last + maxGapSec);
  if (ts.length === 0) return [{ from: first, to: last }];
  if (ts[0] - first > maxGapSec) gaps.push({ from: first, to: ts[0] });
  for (let i = 1; i < ts.length; i++) if (ts[i] - ts[i - 1] > maxGapSec) gaps.push({ from: ts[i - 1], to: ts[i] });
  if (last - ts[ts.length - 1] > maxGapSec) gaps.push({ from: ts[ts.length - 1], to: last });
  return gaps;
}

/**
 * Calibração por canto: procura o atraso que maximiza a pontuação de uma frase
 * de calibração. Use numa execução DEDICADA à calibração, nunca para "melhorar"
 * a nota da própria execução avaliada.
 */
export function estimateLatency(
  frames: PitchFrame[],
  map: SongMap,
  rules: ScoringRules,
  minSec = -0.1,
  maxSec = 0.6,
  stepSec = 0.005,
): { latencySec: number; points: number; confident: boolean } {
  // Usa regra estreita no tempo para que o máximo seja bem definido.
  const strict: ScoringRules = { ...rules, timingToleranceSec: 0.01, stepSec: 0.02 };
  let best = { latencySec: 0, points: -1 };
  const curve: number[] = [];
  for (let l = minSec; l <= maxSec + 1e-9; l += stepSec) {
    const p = scoreFrames(frames, map, strict, { latencySec: l }).points;
    curve.push(p);
    if (p > best.points) best = { latencySec: Math.round(l * 1000) / 1000, points: p };
  }
  // Confiança: a voz precisa seguir a melodia (pico alto) e o pico precisa ser
  // nítido — a 100 ms de distância a pontuação deve cair visivelmente.
  const iBest = Math.round((best.latencySec - minSec) / stepSec);
  const off = Math.round(0.1 / stepSec);
  const neighbors = [curve[iBest - off], curve[iBest + off]].filter((x): x is number => x !== undefined);
  const sharp = neighbors.length > 0 && Math.max(...neighbors) < best.points * 0.97;
  return { ...best, confident: best.points >= 5000 && sharp };
}
