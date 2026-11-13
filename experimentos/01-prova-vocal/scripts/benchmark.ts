/**
 * Etapas 1a e 1b offline: roda detectores e pontuação sobre sinais sintéticos
 * e grava um relatório em resultados/sinteticos.md.
 *
 * Uso: npm run bench
 */
import { writeFileSync } from "node:fs";
import { cpus, platform } from "node:os";
import { analyzeBuffer } from "../src/core/analysis";
import { cents, midiToHz } from "../src/core/music";
import { createDetector, type DetectorName } from "../src/core/pitch";
import { estimateLatency, RULES, scoreFrames } from "../src/core/scoring";
import { buildTestSong, type SongMap } from "../src/core/songmap";
import { renderVoice, silence, whiteNoise } from "../src/core/synth";
import { SCENARIOS } from "./scenarios";

const SR = 48_000;
const DETECTORS: DetectorName[] = ["yin", "mpm"];
const map = buildTestSong(4);
const lines: string[] = [];
const log = (s = "") => {
  lines.push(s);
  console.log(s);
};

log("# Resultados sintéticos — prova vocal");
log();
log(`Gerado por \`npm run bench\` em ${new Date().toISOString()} (${platform()}, ${cpus()[0]?.model ?? "CPU desconhecida"}).`);
log();
log(`Música: ${map.title}, ${map.notes.length} notas, ${map.durationSec.toFixed(1)} s. Taxa: ${SR} Hz, janela 2048, passo 10 ms.`);
log();
log("> Sinais **sintéticos**: provam que a lógica se comporta como esperado, mas não substituem vozes reais nem microfones reais.");
log();

// ---------- 1a. Precisão do detector em notas isoladas ----------
log("## 1a. Precisão do detector (notas isoladas, voz sintética com harmônicos)");
log();
log("| Detector | Faixa testada | Erro mediano (cents) | Erro p95 (cents) | Erros de oitava | Leituras sem altura | Tempo por janela |");
log("|---|---|---:|---:|---:|---:|---:|");
for (const name of DETECTORS) {
  const det = createDetector(name);
  const errs: number[] = [];
  let octaveErrors = 0;
  let unvoiced = 0;
  let total = 0;
  let ms = 0;
  let calls = 0;
  for (let midi = 40; midi <= 84; midi += 2) {
    const one: SongMap = { ...map, durationSec: 1.2, notes: [{ start: 0.1, dur: 1.0, midi, lyric: "" }] };
    const sig = renderVoice(one, SR, { detuneCents: 13 }); // fora da grade de semitons
    const t0 = performance.now();
    const all = analyzeBuffer(sig, SR, det);
    ms += performance.now() - t0;
    calls += all.length;
    const frames = all.filter((f) => f.t > 0.2 && f.t < 1.0);
    const target = midiToHz(midi) * Math.pow(2, 13 / 1200);
    for (const f of frames) {
      total++;
      if (f.hz <= 0) {
        unvoiced++;
        continue;
      }
      const c = cents(f.hz, target);
      if (Math.abs(c) > 600) octaveErrors++;
      else errs.push(Math.abs(c));
    }
  }
  errs.sort((a, b) => a - b);
  const p = (q: number) => errs[Math.min(errs.length - 1, Math.floor(q * errs.length))] ?? NaN;
  log(`| ${name} | midi 40–84 (mi2–dó6) | ${p(0.5).toFixed(2)} | ${p(0.95).toFixed(2)} | ${octaveErrors}/${total} | ${unvoiced}/${total} | ${((ms / Math.max(1, calls)) * 1000).toFixed(0)} µs |`);
}
log();

// ---------- 1b. Pontuação dos cenários ----------
const results: Record<string, Record<string, { casual: number; dificil: number; afin: number; cob: number }>> = {};
for (const name of DETECTORS) {
  const det = createDetector(name);
  results[name] = {};
  for (const sc of SCENARIOS) {
    const frames = analyzeBuffer(sc.render(map, SR), SR, det);
    const c = scoreFrames(frames, map, RULES.casual, { latencySec: sc.latencySec ?? 0 });
    const d = scoreFrames(frames, map, RULES.dificil, { latencySec: sc.latencySec ?? 0 });
    results[name][sc.id] = { casual: c.points, dificil: d.points, afin: c.breakdown.afinacao, cob: c.breakdown.cobertura };
  }
}

log("## 1b. Pontuação por cenário (0 a 10.000)");
log();
log("Regras: `casual` v1 (100% até 50 cents, zero a partir de 150, folga ±120 ms) e `dificil` v1 (100% até 25, zero a partir de 100, folga ±60 ms). Ambas aceitam oitava equivalente.");
log();
log(`| Cenário | ${DETECTORS.map((d) => `${d} casual | ${d} difícil`).join(" | ")} | cobertura (${DETECTORS[0]}) |`);
log(`|---|${DETECTORS.map(() => "---:|---:").join("|")}|---:|`);
for (const sc of SCENARIOS) {
  const cells = DETECTORS.map((d) => `${results[d][sc.id].casual} | ${results[d][sc.id].dificil}`).join(" | ");
  log(`| ${sc.descricao} | ${cells} | ${(results[DETECTORS[0]][sc.id].cob * 100).toFixed(0)}% |`);
}
log();

// ---------- Calibração por canto ----------
log("## Calibração por canto (recuperar um atraso conhecido)");
log();
log("| Detector | Atraso inserido | Atraso estimado | Confiável? |");
log("|---|---:|---:|---|");
for (const name of DETECTORS) {
  const det = createDetector(name);
  for (const delay of [0, 0.08, 0.15, 0.3]) {
    const frames = analyzeBuffer(renderVoice(map, SR, { delaySec: delay, randomCentsPerNote: 20, seed: 5 }), SR, det);
    const est = estimateLatency(frames, map, RULES.casual);
    log(`| ${name} | ${(delay * 1000).toFixed(0)} ms | ${(est.latencySec * 1000).toFixed(0)} ms | ${est.confident ? "sim" : "não"} |`);
  }
  const noise = analyzeBuffer(whiteNoise(Math.ceil(map.durationSec * SR), -25), SR, det);
  const est = estimateLatency(noise, map, RULES.casual);
  log(`| ${name} | (só ruído) | ${(est.latencySec * 1000).toFixed(0)} ms | ${est.confident ? "sim ⚠️" : "não (correto)"} |`);
  void silence;
}
log();

// ---------- Repetibilidade ----------
log("## Repetibilidade");
log();
for (const name of DETECTORS) {
  const det = createDetector(name);
  const sig = renderVoice(map, SR, { randomCentsPerNote: 60, seed: 3 });
  const a = scoreFrames(analyzeBuffer(sig, SR, det), map, RULES.casual).points;
  const b = scoreFrames(analyzeBuffer(sig, SR, det), map, RULES.casual).points;
  log(`- ${name}: mesma entrada pontuada duas vezes → ${a} e ${b} (${a === b ? "idêntico" : "DIFERENTE"}).`);
}
log();
log("## Leitura dos resultados");
log();
log("Ver a seção \"Resultados\" em `../README.md` para a interpretação e os próximos passos.");

writeFileSync(new URL("../resultados/sinteticos.md", import.meta.url), lines.join("\n") + "\n");
