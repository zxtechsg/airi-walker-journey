/** Explicit user-gesture recording only. Resampled mono PCM WAV for local STT. */
export function encodeWav(
  input: Float32Array,
  sourceRate: number,
  targetRate = 16000,
): Blob {
  const length = Math.floor((input.length * targetRate) / sourceRate);
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const str = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++)
      view.setUint8(offset + i, value.charCodeAt(i));
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const pos = (i * sourceRate) / targetRate;
    const a = Math.floor(pos);
    const mix = pos - a;
    const sample = Math.max(
      -1,
      Math.min(1, (input[a] ?? 0) * (1 - mix) + (input[a + 1] ?? 0) * mix),
    );
    view.setInt16(
      44 + i * 2,
      sample < 0 ? sample * 32768 : sample * 32767,
      true,
    );
  }
  return new Blob([buffer], { type: "audio/wav" });
}
export type Recording = { stop: () => Promise<Blob>; cancel: () => void };
export async function recordAudio(): Promise<Recording> {
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error(
      "Microphone needs localhost or a secure HTTPS connection. Use a preset or type a request.",
    );
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    video: false,
  });
  let context: AudioContext;
  try {
    context = new AudioContext();
    await context.resume();
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const mute = context.createGain();
  mute.gain.value = 0;
  const chunks: Float32Array[] = [];
  processor.onaudioprocess = (e) =>
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(processor);
  processor.connect(mute);
  mute.connect(context.destination);
  let stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    processor.onaudioprocess = null;
    processor.disconnect();
    source.disconnect();
    mute.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    void context.close();
  };
  return {
    cancel: cleanup,
    stop: async () => {
      const rate = context.sampleRate;
      cleanup();
      const total = chunks.reduce((n, c) => n + c.length, 0);
      if (total < rate * 0.15)
        throw new Error(
          "That recording was too short. Please try again, or type a request.",
        );
      const samples = new Float32Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        samples.set(chunk, offset);
        offset += chunk.length;
      }
      const peak = samples.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
      if (peak < 0.002)
        throw new Error(
          "No clear speech was recorded. Please try again, or type a request.",
        );
      return encodeWav(samples, rate);
    },
  };
}
