import type { PitchFrame } from "../core/analysis";
import { DEFAULT_HOP_SEC } from "../core/analysis";
import type { DetectorName } from "../core/pitch";
import type { WorkerIn, WorkerOut } from "./detector-worker";

export interface MicSettings {
  deviceId?: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export type InputKind = "mic" | "simulada";

/** Mensagem amigável para cada tipo de erro de microfone. */
export function micErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
      return "Acesso ao microfone negado. Libere o microfone nas permissões do navegador e tente de novo.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Nenhum microfone encontrado. Conecte um microfone ou escolha outro dispositivo.";
    case "NotReadableError":
      return "O microfone não pôde ser lido: pode estar em uso por outro programa ou ter falhado.";
    case "SecurityError":
      return "O navegador bloqueou o microfone: a página precisa estar em HTTPS ou em localhost.";
    default:
      return `Erro ao abrir o microfone: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Motor de áudio da prova vocal.
 *
 * Caminho da voz:  entrada → AudioWorklet (captura) → MessagePort → Worker (detecção) → interface.
 * Caminho da música: AudioBufferSourceNode agendado no relógio do AudioContext.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private inputNode: AudioNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private worker: Worker | null = null;
  private analyser: AnalyserNode | null = null;
  private songSource: AudioBufferSourceNode | null = null;
  private simSource: AudioBufferSourceNode | null = null;
  private levelBuf = new Float32Array(2048);

  /** Leituras recebidas (tempo do AudioContext). */
  frames: PitchFrame[] = [];
  /** Tempo de CPU gasto pelo detector no último segundo (ms). */
  detectorBusyMsPerSec = 0;
  private busyAcc: { t: number; ms: number }[] = [];

  onFrames: ((frames: PitchFrame[]) => void) | null = null;
  onProblem: ((reason: string) => void) | null = null;

  async ensureContext(detector: DetectorName): Promise<AudioContext> {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext({ latencyHint: "interactive" });
    await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}capture-worklet.js`);
    const worklet = new AudioWorkletNode(ctx, "capture-processor", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit" });
    // Um nó só é processado se estiver ligado ao destino: ligamos com ganho zero.
    const mute = ctx.createGain();
    mute.gain.value = 0;
    worklet.connect(mute).connect(ctx.destination);

    const worker = new Worker(new URL("./detector-worker.ts", import.meta.url), { type: "module" });
    const channel = new MessageChannel();
    worklet.port.postMessage({ port: channel.port1 }, [channel.port1]);
    const init: WorkerIn = { type: "init", sampleRate: ctx.sampleRate, detector, frameSize: 2048, hopSec: DEFAULT_HOP_SEC, port: channel.port2 };
    worker.postMessage(init, [channel.port2]);
    worker.onmessage = (e: MessageEvent<WorkerOut>) => {
      const { frames, busyMs } = e.data;
      for (const f of frames) this.frames.push(f);
      const now = performance.now();
      this.busyAcc.push({ t: now, ms: busyMs });
      while (this.busyAcc.length && now - this.busyAcc[0].t > 1000) this.busyAcc.shift();
      this.detectorBusyMsPerSec = this.busyAcc.reduce((s, x) => s + x.ms, 0);
      this.onFrames?.(frames);
    };

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    ctx.onstatechange = () => {
      if (ctx.state !== "running") this.onProblem?.(`o áudio do navegador ficou "${ctx.state}"`);
    };

    this.ctx = ctx;
    this.worklet = worklet;
    this.worker = worker;
    this.analyser = analyser;
    return ctx;
  }

  setDetector(detector: DetectorName) {
    this.worker?.postMessage({ type: "detector", detector } satisfies WorkerIn);
  }

  /** Abre o microfone com os filtros pedidos e devolve o que o navegador realmente aplicou. */
  async openMic(s: MicSettings): Promise<{ applied: MediaTrackSettings; label: string }> {
    const ctx = this.ctx!;
    this.closeInput();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: s.deviceId ? { exact: s.deviceId } : undefined,
        echoCancellation: s.echoCancellation,
        noiseSuppression: s.noiseSuppression,
        autoGainControl: s.autoGainControl,
        channelCount: 1,
      },
    });
    const track = stream.getAudioTracks()[0];
    track.onended = () => this.onProblem?.("o microfone foi desconectado");
    const src = ctx.createMediaStreamSource(stream);
    src.connect(this.worklet!);
    src.connect(this.analyser!);
    this.stream = stream;
    this.inputNode = src;
    return { applied: track.getSettings(), label: track.label };
  }

  /** Entrada simulada: uma "voz" sintética tocada direto no analisador (sem microfone). */
  useSimulatedInput(voice: Float32Array, startAt: number) {
    const ctx = this.ctx!;
    this.closeInput();
    const buf = ctx.createBuffer(1, voice.length, ctx.sampleRate);
    buf.copyToChannel(voice as Float32Array<ArrayBuffer>, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.worklet!);
    src.connect(this.analyser!);
    src.start(startAt);
    this.simSource = src;
    this.inputNode = src;
  }

  closeInput() {
    this.inputNode?.disconnect();
    this.inputNode = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    try {
      this.simSource?.stop();
    } catch {
      /* já parado */
    }
    this.simSource = null;
  }

  /** Agenda a música para começar em `startAt` (tempo do AudioContext). */
  playSong(samples: Float32Array, startAt: number, volume = 0.8) {
    const ctx = this.ctx!;
    this.stopSong();
    const buf = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(ctx.destination);
    src.start(startAt);
    this.songSource = src;
  }

  stopSong() {
    try {
      this.songSource?.stop();
    } catch {
      /* já parado */
    }
    this.songSource = null;
  }

  /**
   * Instante do relógio de áudio que está saindo pelo alto-falante AGORA.
   * Usa getOutputTimestamp quando disponível; senão, currentTime − outputLatency.
   */
  heardContextTime(): number {
    const ctx = this.ctx!;
    const ts = ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
      return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
    return ctx.currentTime - (ctx.outputLatency || 0);
  }

  /** Latências informadas pelo navegador (podem ser imprecisas; Bluetooth costuma vir errado). */
  reportedLatency(): { baseSec: number; outputSec: number } {
    return { baseSec: this.ctx?.baseLatency ?? 0, outputSec: this.ctx?.outputLatency ?? 0 };
  }

  inputLevelDb(): number {
    if (!this.analyser) return -Infinity;
    this.analyser.getFloatTimeDomainData(this.levelBuf);
    let sum = 0;
    for (let i = 0; i < this.levelBuf.length; i++) sum += this.levelBuf[i] ** 2;
    const rms = Math.sqrt(sum / this.levelBuf.length);
    return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
  }
}
