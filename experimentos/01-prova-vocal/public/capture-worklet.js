/**
 * AudioWorklet de captura: roda na thread de áudio e só acumula amostras.
 * A detecção de altura acontece num Web Worker; a interface nunca fica no caminho.
 *
 * Cada pacote leva `frame` = índice global (currentFrame) da primeira amostra,
 * para que o Worker saiba exatamente a que instante do relógio de áudio ele se refere.
 */
const CHUNK = 512;

class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.out = null; // porta direta para o Worker
    this.buf = new Float32Array(CHUNK);
    this.n = 0;
    this.startFrame = 0;
    this.port.onmessage = (e) => {
      if (e.data && e.data.port) this.out = e.data.port;
    };
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch || !this.out) return true; // sem entrada: o Worker verá um buraco no tempo
    let offset = 0;
    while (offset < ch.length) {
      if (this.n === 0) this.startFrame = currentFrame + offset;
      const take = Math.min(ch.length - offset, CHUNK - this.n);
      this.buf.set(ch.subarray(offset, offset + take), this.n);
      this.n += take;
      offset += take;
      if (this.n === CHUNK) {
        this.out.postMessage({ frame: this.startFrame, samples: this.buf }, [this.buf.buffer]);
        this.buf = new Float32Array(CHUNK);
        this.n = 0;
      }
    }
    return true;
  }
}

registerProcessor("capture-processor", CaptureProcessor);
