import type { SongMap } from "../src/core/songmap";
import { mix, renderBacking, renderVoice, silence, whiteNoise } from "../src/core/synth";

export interface Scenario {
  id: string;
  descricao: string;
  /** Atraso que o avaliador deve descontar (simula calibração correta). */
  latencySec?: number;
  render(map: SongMap, sr: number): Float32Array;
}

const len = (map: SongMap, sr: number) => Math.ceil(map.durationSec * sr);

/** Cenários sintéticos com resultado esperado conhecido. */
export const SCENARIOS: Scenario[] = [
  { id: "exato", descricao: "Voz sintética exatamente afinada", render: (m, sr) => renderVoice(m, sr) },
  { id: "+25c", descricao: "Desafinada +25 cents", render: (m, sr) => renderVoice(m, sr, { detuneCents: 25 }) },
  { id: "+50c", descricao: "Desafinada +50 cents", render: (m, sr) => renderVoice(m, sr, { detuneCents: 50 }) },
  { id: "-75c", descricao: "Desafinada −75 cents", render: (m, sr) => renderVoice(m, sr, { detuneCents: -75 }) },
  { id: "+100c", descricao: "Desafinada +100 cents (um semitom)", render: (m, sr) => renderVoice(m, sr, { detuneCents: 100 }) },
  { id: "+200c", descricao: "Desafinada +200 cents (um tom)", render: (m, sr) => renderVoice(m, sr, { detuneCents: 200 }) },
  { id: "amador", descricao: "Cantor amador: ±60 cents aleatórios por nota", render: (m, sr) => renderVoice(m, sr, { randomCentsPerNote: 60, seed: 3 }) },
  { id: "oitava-abaixo", descricao: "Afinada, uma oitava abaixo (voz grave)", render: (m, sr) => renderVoice(m, sr, { octaveShift: -1 }) },
  { id: "vibrato", descricao: "Afinada com vibrato ±40 cents a 5,5 Hz", render: (m, sr) => renderVoice(m, sr, { vibrato: { rateHz: 5.5, depthCents: 40 } }) },
  { id: "atraso-150-sem-cal", descricao: "Atraso de 150 ms sem calibração", render: (m, sr) => renderVoice(m, sr, { delaySec: 0.15 }) },
  { id: "atraso-150-com-cal", descricao: "Atraso de 150 ms com calibração correta", latencySec: 0.15, render: (m, sr) => renderVoice(m, sr, { delaySec: 0.15 }) },
  { id: "atraso-300-sem-cal", descricao: "Atraso de 300 ms sem calibração (ex.: Bluetooth)", render: (m, sr) => renderVoice(m, sr, { delaySec: 0.3 }) },
  { id: "notas-cortadas", descricao: "Sustenta só 50% de cada nota", render: (m, sr) => renderVoice(m, sr, { sustainFraction: 0.5 }) },
  { id: "metade-das-notas", descricao: "Canta só as notas de índice par", render: (m, sr) => renderVoice(m, sr, { skipNotes: new Set(m.notes.map((_, i) => i).filter((i) => i % 2 === 1)) }) },
  { id: "exato+ruido", descricao: "Afinada com ruído de fundo (−35 dBFS)", render: (m, sr) => mix(renderVoice(m, sr), whiteNoise(len(m, sr), -35)) },
  { id: "silencio", descricao: "Silêncio total", render: (m, sr) => silence(len(m, sr)) },
  { id: "ruido", descricao: "Só ruído branco (−25 dBFS)", render: (m, sr) => whiteNoise(len(m, sr), -25) },
  { id: "vazamento-base", descricao: "Base instrumental vazando no microfone, ninguém canta", render: (m, sr) => renderBacking(m, sr, -20) },
  { id: "vazamento-guia", descricao: "Base + vocal guia vazando no microfone, ninguém canta", render: (m, sr) => mix(renderBacking(m, sr, -20), renderVoice(m, sr, { levelDb: -22 })) },
];
