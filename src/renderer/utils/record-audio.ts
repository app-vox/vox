export async function recordAudio(seconds: number): Promise<{ audioBuffer: number[]; sampleRate: number }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];

  processor.onaudioprocess = (e) => {
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(audioContext.destination);

  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

  processor.disconnect();
  stream.getTracks().forEach((t) => t.stop());

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const sampleRate = audioContext.sampleRate;
  audioContext.close();

  return { audioBuffer: Array.from(merged), sampleRate };
}
