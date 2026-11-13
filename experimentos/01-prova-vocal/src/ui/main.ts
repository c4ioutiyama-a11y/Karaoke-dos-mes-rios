import { AudioEngine, micErrorMessage, type InputKind } from "../audio/engine";
import type { PitchFrame } from "../core/analysis";
import { foldOctave, hzToMidi, midiName } from "../core/music";
import type { DetectorName } from "../core/pitch";
import { estimateLatency, pitchCredit, RULES, scoreFrames, type ScoreResult, type ScoringRules } from "../core/scoring";
import { buildTestSong, type VocalNote } from "../core/songmap";
import { mix, renderBacking, renderVoice } from "../core/synth";
import { midiToHz } from "../core/music";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  inputKind: $<HTMLSelectElement>("input-kind"),
  device: $<HTMLSelectElement>("device"),
  ec: $<HTMLInputElement>("ec"),
  ns: $<HTMLInputElement>("ns"),
  agc: $<HTMLInputElement>("agc"),
  btnMic: $<HTMLButtonElement>("btn-mic"),
  meterFill: $<HTMLDivElement>("meter-fill"),
  levelText: $<HTMLSpanElement>("level-text"),
  micStatus: $<HTMLParagraphElement>("mic-status"),
  applied: $<HTMLParagraphElement>("applied"),
  detector: $<HTMLSelectElement>("detector"),
  rules: $<HTMLSelectElement>("rules"),
  guide: $<HTMLInputElement>("guide"),
  latency: $<HTMLInputElement>("latency"),
  latencyText: $<HTMLElement>("latency-text"),
  latencyInfo: $<HTMLParagraphElement>("latency-info"),
  btnSing: $<HTMLButtonElement>("btn-sing"),
  btnStop: $<HTMLButtonElement>("btn-stop"),
  btnCalibrate: $<HTMLButtonElement>("btn-calibrate"),
  score: $<HTMLElement>("score"),
  lyricNow: $<HTMLDivElement>("lyric-now"),
  lyricNext: $<HTMLDivElement>("lyric-next"),
  canvas: $<HTMLCanvasElement>("highway"),
  runStatus: $<HTMLParagraphElement>("run-status"),
  result: $<HTMLDivElement>("result"),
};

const map = buildTestSong(4);
const engine = new AudioEngine();
const COUNT_IN_SEC = 1.0;

interface Run {
  t0: number;
  frames: PitchFrame[]; // tempo musical de captura (sem descontar latência)
  problems: Set<string>;
  latencySec: number;
  rules: ScoringRules;
  active: boolean;
}
let run: Run | null = null;
let lastRun: Run | null = null;
let inputReady = false;

function setStatus(el: HTMLElement, text: string, kind: "" | "ok" | "warn" | "bad" = "") {
  el.textContent = text;
  el.className = `status ${kind}`;
}

const latencySec = () => Number(ui.latency.value) / 1000;
const currentRules = () => RULES[ui.rules.value];
ui.latency.addEventListener("input", () => (ui.latencyText.textContent = `${ui.latency.value} ms`));
ui.detector.addEventListener("change", () => engine.setDetector(ui.detector.value as DetectorName));

// ---------- Entrada ----------
async function listDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const current = ui.device.value;
  ui.device.innerHTML = '<option value="">Padrão do sistema</option>';
  for (const d of devices.filter((d) => d.kind === "audioinput")) {
    const opt = document.createElement("option");
    opt.value = d.deviceId;
    opt.textContent = d.label || `Microfone ${ui.device.length}`;
    ui.device.append(opt);
  }
  ui.device.value = current;
}

ui.btnMic.addEventListener("click", async () => {
  try {
    const ctx = await engine.ensureContext(ui.detector.value as DetectorName);
    await ctx.resume();
    const kind = ui.inputKind.value as InputKind;
    if (kind === "mic") {
      if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("sem suporte", "SecurityError");
      const { applied, label } = await engine.openMic({
        deviceId: ui.device.value || undefined,
        echoCancellation: ui.ec.checked,
        noiseSuppression: ui.ns.checked,
        autoGainControl: ui.agc.checked,
      });
      await listDevices();
      setStatus(ui.micStatus, `Microfone ativo: ${label || "sem nome"}. Use fones de ouvido com fio se puder.`, "ok");
      ui.applied.textContent =
        `Aplicado pelo navegador → eco: ${fmt(applied.echoCancellation)}, ruído: ${fmt(applied.noiseSuppression)}, ` +
        `ganho: ${fmt(applied.autoGainControl)}, taxa: ${applied.sampleRate ?? "?"} Hz, canais: ${applied.channelCount ?? "?"}`;
    } else {
      engine.closeInput();
      setStatus(ui.micStatus, "Voz simulada: uma voz sintética levemente desafinada canta junto com a música.", "ok");
      ui.applied.textContent = "";
    }
    const { baseSec, outputSec } = engine.reportedLatency();
    ui.latencyInfo.textContent =
      `Navegador informa: base ${(baseSec * 1000).toFixed(0)} ms, saída ${(outputSec * 1000).toFixed(0)} ms, taxa ${ctx.sampleRate} Hz. ` +
      `O atraso do microfone NÃO é informado: calibre cantando.`;
    inputReady = true;
    ui.btnSing.disabled = false;
  } catch (err) {
    setStatus(ui.micStatus, micErrorMessage(err), "bad");
  }
});

const fmt = (v: unknown) => (v === undefined ? "não informado" : v ? "ligado" : "desligado");

navigator.mediaDevices?.addEventListener?.("devicechange", () => {
  run?.problems.add("os dispositivos de áudio mudaram durante a execução (troca de fone ou microfone?)");
  if (inputReady) setStatus(ui.micStatus, "Os dispositivos de áudio mudaram. Reative a entrada e calibre de novo.", "warn");
  listDevices().catch(() => undefined);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) run?.problems.add("a aba ficou em segundo plano durante a execução");
});
engine.onProblem = (reason) => run?.problems.add(reason);
engine.onFrames = (frames) => {
  if (!run?.active) return;
  for (const f of frames) run.frames.push({ ...f, t: f.t - run.t0 });
};

// ---------- Execução ----------
ui.btnSing.addEventListener("click", async () => {
  const ctx = engine.ctx!;
  await ctx.resume();
  const sr = ctx.sampleRate;
  const backing = renderBacking(map, sr);
  const song = ui.guide.checked ? mix(backing, renderVoice(map, sr, { levelDb: -18 })) : backing;
  const t0 = ctx.currentTime + COUNT_IN_SEC;
  engine.playSong(song, t0);
  if (ui.inputKind.value === "simulada") {
    engine.useSimulatedInput(renderVoice(map, sr, { randomCentsPerNote: 40, seed: Date.now() % 1000, levelDb: -14 }), t0);
  }
  run = { t0, frames: [], problems: new Set(), latencySec: latencySec(), rules: currentRules(), active: true };
  ui.btnSing.disabled = true;
  ui.btnStop.disabled = false;
  ui.btnCalibrate.disabled = true;
  ui.latency.disabled = true;
  ui.rules.disabled = true;
  setStatus(ui.runStatus, "Cantando… a introdução tem 2 compassos.", "");
});

ui.btnStop.addEventListener("click", () => finish(true));

function finish(stoppedEarly: boolean) {
  if (!run) return;
  run.active = false;
  engine.stopSong();
  if (ui.inputKind.value === "simulada") engine.closeInput();
  if (stoppedEarly) run.problems.add("execução interrompida antes do fim");
  const result = scoreFrames(run.frames, map, run.rules, { latencySec: run.latencySec, externalIncompleteReasons: [...run.problems] });
  showResult(result);
  ui.score.textContent = String(result.points);
  lastRun = run;
  run = null;
  ui.btnSing.disabled = !inputReady;
  ui.btnStop.disabled = true;
  ui.btnCalibrate.disabled = false;
  ui.latency.disabled = false;
  ui.rules.disabled = false;
  setStatus(ui.runStatus, result.complete ? "Execução completa." : "Execução incompleta — resultado não comparável.", result.complete ? "ok" : "warn");
  // Ganchos para testes automatizados e inspeção pelo console do navegador.
  Object.assign(window, { __ultimoResultado: result, __ultimasLeituras: lastRun.frames });
}

ui.btnCalibrate.addEventListener("click", () => {
  if (!lastRun) return;
  const est = estimateLatency(lastRun.frames, map, lastRun.rules);
  if (est.confident) {
    ui.latency.value = String(Math.round(est.latencySec * 1000));
    ui.latencyText.textContent = `${ui.latency.value} ms`;
    setStatus(ui.runStatus, `Atraso estimado: ${ui.latency.value} ms. Esta execução de calibração não conta como resultado.`, "ok");
  } else {
    setStatus(ui.runStatus, "Não deu para estimar o atraso com segurança: cante a melodia inteira, afinado e no ritmo, e tente de novo.", "warn");
  }
});

function showResult(r: ScoreResult) {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const rows = r.notes
    .map((n) => {
      const note = map.notes[n.index];
      return `<tr><td>${n.index + 1}. ${note.lyric} (${midiName(note.midi)})</td><td>${pct(n.credit)}</td><td>${pct(n.coverage)}</td>` +
        `<td>${n.medianCents === null ? "—" : `${n.medianCents > 0 ? "+" : ""}${n.medianCents.toFixed(0)}`}</td>` +
        `<td>${n.onsetErrorSec === null ? "—" : `${Math.round(n.onsetErrorSec * 1000)} ms`}</td></tr>`;
    })
    .join("");
  ui.result.innerHTML = `
    <p><span class="big mono">${r.points}</span> / 10.000
      <span class="tag ${r.complete ? "ok" : "bad"}">${r.complete ? "completa" : "incompleta"}</span></p>
    ${r.complete ? "" : `<p class="status warn">${r.incompleteReasons.join("; ")}</p>`}
    <p>Afinação (quando havia voz): <strong>${pct(r.breakdown.afinacao)}</strong> ·
       Cobertura das notas: <strong>${pct(r.breakdown.cobertura)}</strong> ·
       Entrada mediana: <strong>${r.breakdown.entradaMedianaSec === null ? "—" : `${Math.round(r.breakdown.entradaMedianaSec * 1000)} ms`}</strong></p>
    <p class="small">Regra ${r.rulesId} v${r.rulesVersion} · mapa ${r.songId} v${r.arrangementVersion} · atraso compensado ${Math.round(r.latencySec * 1000)} ms ·
       detector ${ui.detector.value} · CPU do detector ≈ ${engine.detectorBusyMsPerSec.toFixed(0)} ms/s</p>
    <details><summary>Detalhe por nota</summary>
      <table><thead><tr><th>Nota</th><th>Acerto</th><th>Cobertura</th><th>Desvio (cents)</th><th>Entrada</th></tr></thead><tbody>${rows}</tbody></table>
    </details>`;
}

// ---------- Desenho ----------
const midis = map.notes.map((n) => n.midi);
const loMidi = Math.min(...midis) - 4;
const hiMidi = Math.max(...midis) + 4;
const centerMidi = (loMidi + hiMidi) / 2;
let lastScoreUpdate = 0;

function noteAt(t: number): { cur: VocalNote | null; idx: number } {
  for (let i = 0; i < map.notes.length; i++) {
    const n = map.notes[i];
    if (t < n.start + n.dur) return { cur: n, idx: i };
  }
  return { cur: null, idx: map.notes.length };
}

function draw() {
  requestAnimationFrame(draw);
  // Medidor de nível
  const db = engine.ctx ? engine.inputLevelDb() : -Infinity;
  const pctLevel = Math.max(0, Math.min(1, (db + 60) / 60));
  ui.meterFill.style.width = `${pctLevel * 100}%`;
  ui.levelText.textContent = Number.isFinite(db) ? `${db.toFixed(0)} dB` : "— dB";

  const c = ui.canvas;
  const dpr = window.devicePixelRatio || 1;
  const W = Math.round(c.clientWidth * dpr);
  const H = Math.round(c.clientHeight * dpr);
  if (c.width !== W || c.height !== H) {
    c.width = W;
    c.height = H;
  }
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, W, H);
  const active = run ?? lastRun;
  const heard = engine.ctx && active ? engine.heardContextTime() - active.t0 : 0;
  const tView = run ? heard : active ? Math.min(heard, map.durationSec) : 0;
  const pxPerSec = W / 6;
  const nowX = W * 0.25;
  const x = (t: number) => nowX + (t - tView) * pxPerSec;
  const y = (m: number) => H - ((m - loMidi) / (hiMidi - loMidi)) * H;

  // Linhas de referência (dó de cada oitava)
  g.strokeStyle = "#24254a";
  g.lineWidth = 1;
  for (let m = Math.ceil(loMidi); m <= hiMidi; m++) {
    g.globalAlpha = m % 12 === 0 ? 1 : 0.35;
    g.beginPath();
    g.moveTo(0, y(m));
    g.lineTo(W, y(m));
    g.stroke();
  }
  g.globalAlpha = 1;

  // Notas esperadas
  const barH = (H / (hiMidi - loMidi)) * 0.8;
  g.font = `${12 * dpr}px system-ui`;
  for (const n of map.notes) {
    if (x(n.start + n.dur) < 0 || x(n.start) > W) continue;
    g.fillStyle = "#5a7cff";
    g.fillRect(x(n.start), y(n.midi) - barH / 2, n.dur * pxPerSec, barH);
    g.fillStyle = "#ecebff";
    g.fillText(n.lyric, x(n.start) + 3 * dpr, y(n.midi) - barH / 2 - 3 * dpr);
  }

  // Voz detectada (tempo corrigido pela latência; oitava dobrada para caber na faixa)
  if (active) {
    const rules = active.rules;
    for (const f of active.frames) {
      if (f.hz <= 0 || f.clarity < rules.minClarity) continue;
      const t = f.t - active.latencySec;
      if (x(t) < 0 || x(t) > nowX + 2) continue;
      let m = hzToMidi(f.hz);
      m = centerMidi + foldOctave((m - centerMidi) * 100) / 100;
      const exp = map.notes.find((n) => t >= n.start && t <= n.start + n.dur);
      const credit = exp ? pitchCredit(f.hz, midiToHz(exp.midi), rules) : -1;
      g.fillStyle = credit >= 0.99 ? "#4fe3a3" : credit > 0 ? "#ffcc4d" : credit === 0 ? "#ff6b6b" : "#a6a4c8";
      g.beginPath();
      g.arc(x(t), y(m), 3 * dpr, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Marcador do instante atual
  g.strokeStyle = "#ff4fa3";
  g.lineWidth = 2 * dpr;
  g.beginPath();
  g.moveTo(nowX, 0);
  g.lineTo(nowX, H);
  g.stroke();

  if (!run) return;

  // Letra
  const { cur, idx } = noteAt(heard);
  ui.lyricNow.textContent = cur && heard >= cur.start - 0.6 ? cur.lyric : heard < map.notes[0].start ? "prepare-se…" : " ";
  ui.lyricNext.textContent = map.notes.slice(idx + 1, idx + 7).map((n) => n.lyric).join(" · ") || " ";

  // Placar parcial (só trechos que já foram totalmente capturados)
  const now = performance.now();
  const captureNow = engine.ctx!.currentTime - run.t0;
  if (now - lastScoreUpdate > 250) {
    lastScoreUpdate = now;
    const until = captureNow - run.latencySec - run.rules.timingToleranceSec - 0.08;
    if (until > map.notes[0].start) {
      const partial = scoreFrames(run.frames, map, run.rules, { latencySec: run.latencySec, untilSec: until });
      ui.score.textContent = String(partial.points);
    }
  }
  if (captureNow > map.durationSec + run.latencySec + 0.3) finish(false);
}
requestAnimationFrame(draw);
