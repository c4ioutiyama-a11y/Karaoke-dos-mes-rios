/**
 * Testes de sanidade da prova vocal. Verificam ORDEM e coerência, não metas
 * finais: as metas numéricas serão definidas com gravações reais.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeBuffer, type PitchFrame } from "../src/core/analysis";
import { cents, foldOctave, midiToHz } from "../src/core/music";
import { createDetector, type DetectorName } from "../src/core/pitch";
import { estimateLatency, findCaptureGaps, pitchCredit, RULES, scoreFrames } from "../src/core/scoring";
import { buildTestSong } from "../src/core/songmap";
import { mix, renderBacking, renderVoice, silence, whiteNoise } from "../src/core/synth";

const SR = 48_000;
const map = buildTestSong(2); // 2 frases: mais rápido
const N = Math.ceil(map.durationSec * SR);

function score(sig: Float32Array, det: DetectorName, latencySec = 0, rules = RULES.casual) {
  return scoreFrames(analyzeBuffer(sig, SR, createDetector(det)), map, rules, { latencySec });
}

describe("música", () => {
  it("converte midi ↔ Hz e calcula cents", () => {
    assert.equal(midiToHz(69), 440);
    assert.ok(Math.abs(cents(midiToHz(61), midiToHz(60)) - 100) < 1e-9);
  });
  it("dobra oitavas", () => {
    assert.ok(Math.abs(foldOctave(1200)) < 1e-9);
    assert.ok(Math.abs(foldOctave(-1190) - 10) < 1e-9);
    assert.equal(foldOctave(700), -500);
  });
  it("curva de acerto: 100% até a tolerância, zero depois do limite", () => {
    const t = 440;
    const r = RULES.casual;
    assert.equal(pitchCredit(t, t, r), 1);
    assert.equal(pitchCredit(t * Math.pow(2, 49 / 1200), t, r), 1);
    assert.ok(Math.abs(pitchCredit(t * Math.pow(2, 100 / 1200), t, r) - 0.5) < 1e-6);
    assert.equal(pitchCredit(t * Math.pow(2, 160 / 1200), t, r), 0);
    assert.equal(pitchCredit(0, t, r), 0);
  });
});

for (const det of ["yin", "mpm"] as DetectorName[]) {
  describe(`detector ${det} + pontuação`, () => {
    const exact = score(renderVoice(map, SR), det).points;

    it("voz afinada pontua perto do máximo", () => {
      assert.ok(exact >= 9900, `exato=${exact}`);
    });

    it("ordem: exato ≥ +50 > +100 > +200 > silêncio", () => {
      const p50 = score(renderVoice(map, SR, { detuneCents: 50 }), det, 0, RULES.dificil).points;
      const p100 = score(renderVoice(map, SR, { detuneCents: 100 }), det).points;
      const p200 = score(renderVoice(map, SR, { detuneCents: 200 }), det).points;
      const sil = score(silence(N), det).points;
      assert.ok(exact > p50 && p50 > 0, `exato=${exact} +50(difícil)=${p50}`);
      assert.ok(exact > p100 && p100 > p200 && p200 >= sil, `+100=${p100} +200=${p200} silêncio=${sil}`);
    });

    it("silêncio, ruído e base instrumental sozinha não pontuam", () => {
      assert.equal(score(silence(N), det).points, 0);
      assert.ok(score(whiteNoise(N, -25), det).points < 100);
      assert.ok(score(renderBacking(map, SR, -20), det).points < 300);
    });

    it("cantar metade das notas rende cerca de metade dos pontos", () => {
      const skip = new Set(map.notes.map((_, i) => i).filter((i) => i % 2 === 1));
      const p = score(renderVoice(map, SR, { skipNotes: skip }), det).points;
      assert.ok(p > 3500 && p < 6500, `metade=${p}`);
    });

    it("notas cortadas valem menos que notas sustentadas", () => {
      const p = score(renderVoice(map, SR, { sustainFraction: 0.5 }), det).points;
      assert.ok(p < exact - 1500, `cortadas=${p}`);
    });

    it("oitava abaixo vale o mesmo quando a regra dobra oitavas", () => {
      const p = score(renderVoice(map, SR, { octaveShift: -1 }), det).points;
      assert.ok(Math.abs(p - exact) < 100, `oitava=${p}`);
    });

    it("compensar a latência correta recupera a pontuação", () => {
      const sig = renderVoice(map, SR, { delaySec: 0.3 });
      const sem = score(sig, det).points;
      const com = score(sig, det, 0.3).points;
      assert.ok(com > sem, `sem=${sem} com=${com}`);
      assert.ok(com >= 9900);
    });

    it("é reproduzível", () => {
      const sig = renderVoice(map, SR, { randomCentsPerNote: 60, seed: 11 });
      assert.equal(score(sig, det).points, score(sig, det).points);
    });

    it("RISCO CONHECIDO: vocal guia vazando dá pontos sem ninguém cantar", () => {
      // Este teste documenta o problema (ver docs/01-avaliacao-critica.md, 3.1).
      // Quando o detector de vazamento existir, ele deve marcar esta execução.
      const leak = mix(renderBacking(map, SR, -20), renderVoice(map, SR, { levelDb: -22 }));
      assert.ok(score(leak, det).points > 3000);
    });
  });
}

describe("calibração por canto", () => {
  it("recupera um atraso conhecido (±25 ms)", () => {
    for (const delay of [0.08, 0.2]) {
      const frames = analyzeBuffer(renderVoice(map, SR, { delaySec: delay, randomCentsPerNote: 20, seed: 5 }), SR, createDetector("yin"));
      const est = estimateLatency(frames, map, RULES.casual);
      assert.ok(Math.abs(est.latencySec - delay) <= 0.025, `inserido=${delay} estimado=${est.latencySec}`);
    }
  });
  it("não se declara confiável com ruído", () => {
    const frames = analyzeBuffer(whiteNoise(N, -25), SR, createDetector("mpm"));
    assert.equal(estimateLatency(frames, map, RULES.casual).confident, false);
  });
});

describe("falhas de captura", () => {
  it("marca a execução como incompleta quando faltam leituras", () => {
    const frames = analyzeBuffer(renderVoice(map, SR), SR, createDetector("mpm"));
    const mid = map.notes[5].start;
    const holed: PitchFrame[] = frames.filter((f) => f.t < mid || f.t > mid + 1.0);
    assert.equal(findCaptureGaps(frames, map).length, 0);
    assert.ok(findCaptureGaps(holed, map).length > 0);
    const r = scoreFrames(holed, map, RULES.casual);
    assert.equal(r.complete, false);
  });
  it("placar parcial avalia só até o instante pedido", () => {
    const frames = analyzeBuffer(renderVoice(map, SR), SR, createDetector("mpm"));
    const until = map.notes[3].start + 0.1;
    const r = scoreFrames(frames.filter((f) => f.t <= until + 0.05), map, RULES.casual, { untilSec: until });
    assert.ok(r.points > 9800, `parcial=${r.points}`);
    assert.equal(r.complete, true);
  });
});
