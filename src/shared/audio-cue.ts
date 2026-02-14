import type { AudioCueType } from "./config";

const WAV_CUE_FILES: Partial<Record<AudioCueType, string>> = {
  tap: "tap.wav",
  tick: "tick.wav",
  pop: "pop.wav",
  ping: "ping.wav",
  ding: "ding.wav",
  nudge: "nudge.wav",
  error: "error.wav",
};

export function isWavCue(type: AudioCueType): boolean {
  return type in WAV_CUE_FILES;
}

export function getWavFilename(type: AudioCueType): string | null {
  return WAV_CUE_FILES[type] ?? null;
}

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
    default:
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
