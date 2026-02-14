import type { AudioCueType } from "./config";

export function generateCueSamples(type: AudioCueType, sampleRate: number): number[] {
  switch (type) {
    case "click":
      return generateClick(sampleRate);
    case "beep":
      return generateBeep(sampleRate);
    case "chime":
      return generateChime(sampleRate);
    case "none":
      return [];
  }
}

function generateClick(sr: number): number[] {
  const duration = 0.05;
  const len = Math.floor(sr * duration);
  const samples: number[] = [];
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const envelope = 1 - t / duration;
    const noise = Math.random() * 2 - 1;
    samples.push(noise * envelope * 0.3);
  }
  return samples;
}

function generateBeep(sr: number): number[] {
  const duration = 0.15;
  const freq = 880;
  const len = Math.floor(sr * duration);
  const samples: number[] = [];
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const envelope = Math.min(1, (duration - t) / 0.02);
    samples.push(Math.sin(2 * Math.PI * freq * t) * envelope * 0.3);
  }
  return samples;
}

function generateChime(sr: number): number[] {
  const duration = 0.3;
  const freq = 1047;
  const len = Math.floor(sr * duration);
  const samples: number[] = [];
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const envelope = Math.exp(-t * 8);
    const wave = Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(2 * Math.PI * freq * 2 * t);
    samples.push(wave * envelope * 0.2);
  }
  return samples;
}
