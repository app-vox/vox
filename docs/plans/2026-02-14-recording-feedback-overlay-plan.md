# Recording Feedback Overlay — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the recording overlay to distinguish "mic initializing" from "actively recording" with waveform visualization and audio cue.

**Architecture:** Add an `initializing` indicator state (spinner, gray). Recorder exposes audio levels via `AnalyserNode` + IPC. Indicator renders 7 waveform bars during `listening` state. Audio cues are generated programmatically via Web Audio API in main process. New `recordingAudioCue` config field with Settings UI.

**Tech Stack:** Electron (main + renderer), TypeScript, Web Audio API (`AnalyserNode`, `OscillatorNode`), Vitest, React, SCSS Modules, i18n (9 locales)

---

### Task 1: Add `recordingAudioCue` to config

**Files:**
- Modify: `src/shared/config.ts`
- Modify: `tests/shared/config.test.ts`

**Step 1: Write the failing test**

In `tests/shared/config.test.ts`, add:

```typescript
it("should include recordingAudioCue defaulting to 'click'", () => {
  const config = createDefaultConfig();
  expect(config.recordingAudioCue).toBe("click");
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/config.test.ts`
Expected: FAIL — `config.recordingAudioCue` is `undefined`

**Step 3: Write minimal implementation**

In `src/shared/config.ts`:

1. Add the type alias after `SupportedLanguage`:
```typescript
export type AudioCueType = "click" | "beep" | "chime" | "none";
```

2. Add to `VoxConfig` interface after `language`:
```typescript
recordingAudioCue: AudioCueType;
```

3. Add to `createDefaultConfig()` return object after `language: "system"`:
```typescript
recordingAudioCue: "click",
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/config.ts tests/shared/config.test.ts
git commit -m "feat(config): add recordingAudioCue setting"
```

---

### Task 2: Add i18n keys for recording feedback

**Files:**
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/pt-BR.json`
- Modify: `src/shared/i18n/locales/pt-PT.json`
- Modify: `src/shared/i18n/locales/es.json`
- Modify: `src/shared/i18n/locales/fr.json`
- Modify: `src/shared/i18n/locales/de.json`
- Modify: `src/shared/i18n/locales/it.json`
- Modify: `src/shared/i18n/locales/ru.json`
- Modify: `src/shared/i18n/locales/tr.json`
- Test: `tests/shared/i18n.test.ts`

**Step 1: Add keys to `en.json`**

Add before the closing `}`:
```json
"general.recordingFeedback.title": "Recording Feedback",
"general.recordingFeedback.audioCue": "Recording start sound",
"general.recordingFeedback.audioCue.description": "Play a sound when recording begins to signal you can start speaking.",
"general.recordingFeedback.audioCue.click": "Click",
"general.recordingFeedback.audioCue.beep": "Beep",
"general.recordingFeedback.audioCue.chime": "Chime",
"general.recordingFeedback.audioCue.none": "None",
"indicator.initializing": "Starting..."
```

**Step 2: Add keys to all other 8 locale files**

`pt-BR.json`:
```json
"general.recordingFeedback.title": "Feedback de Gravação",
"general.recordingFeedback.audioCue": "Som de início de gravação",
"general.recordingFeedback.audioCue.description": "Reproduz um som quando a gravação começa para sinalizar que você pode começar a falar.",
"general.recordingFeedback.audioCue.click": "Clique",
"general.recordingFeedback.audioCue.beep": "Bipe",
"general.recordingFeedback.audioCue.chime": "Sino",
"general.recordingFeedback.audioCue.none": "Nenhum",
"indicator.initializing": "Iniciando..."
```

`pt-PT.json`:
```json
"general.recordingFeedback.title": "Feedback de Gravação",
"general.recordingFeedback.audioCue": "Som de início de gravação",
"general.recordingFeedback.audioCue.description": "Reproduz um som quando a gravação começa para indicar que pode começar a falar.",
"general.recordingFeedback.audioCue.click": "Clique",
"general.recordingFeedback.audioCue.beep": "Bipe",
"general.recordingFeedback.audioCue.chime": "Sino",
"general.recordingFeedback.audioCue.none": "Nenhum",
"indicator.initializing": "A iniciar..."
```

`es.json`:
```json
"general.recordingFeedback.title": "Retroalimentación de Grabación",
"general.recordingFeedback.audioCue": "Sonido de inicio de grabación",
"general.recordingFeedback.audioCue.description": "Reproduce un sonido cuando comienza la grabación para indicar que puede empezar a hablar.",
"general.recordingFeedback.audioCue.click": "Clic",
"general.recordingFeedback.audioCue.beep": "Pitido",
"general.recordingFeedback.audioCue.chime": "Campanilla",
"general.recordingFeedback.audioCue.none": "Ninguno",
"indicator.initializing": "Iniciando..."
```

`fr.json`:
```json
"general.recordingFeedback.title": "Retour d'enregistrement",
"general.recordingFeedback.audioCue": "Son de début d'enregistrement",
"general.recordingFeedback.audioCue.description": "Joue un son au début de l'enregistrement pour signaler que vous pouvez commencer à parler.",
"general.recordingFeedback.audioCue.click": "Clic",
"general.recordingFeedback.audioCue.beep": "Bip",
"general.recordingFeedback.audioCue.chime": "Carillon",
"general.recordingFeedback.audioCue.none": "Aucun",
"indicator.initializing": "Démarrage..."
```

`de.json`:
```json
"general.recordingFeedback.title": "Aufnahme-Feedback",
"general.recordingFeedback.audioCue": "Ton bei Aufnahmestart",
"general.recordingFeedback.audioCue.description": "Spielt einen Ton ab, wenn die Aufnahme beginnt, um zu signalisieren, dass Sie sprechen können.",
"general.recordingFeedback.audioCue.click": "Klick",
"general.recordingFeedback.audioCue.beep": "Piep",
"general.recordingFeedback.audioCue.chime": "Glocke",
"general.recordingFeedback.audioCue.none": "Keiner",
"indicator.initializing": "Starten..."
```

`it.json`:
```json
"general.recordingFeedback.title": "Feedback di Registrazione",
"general.recordingFeedback.audioCue": "Suono di inizio registrazione",
"general.recordingFeedback.audioCue.description": "Riproduce un suono quando inizia la registrazione per segnalare che puoi iniziare a parlare.",
"general.recordingFeedback.audioCue.click": "Clic",
"general.recordingFeedback.audioCue.beep": "Bip",
"general.recordingFeedback.audioCue.chime": "Campanello",
"general.recordingFeedback.audioCue.none": "Nessuno",
"indicator.initializing": "Avvio..."
```

`ru.json`:
```json
"general.recordingFeedback.title": "Обратная связь записи",
"general.recordingFeedback.audioCue": "Звук начала записи",
"general.recordingFeedback.audioCue.description": "Воспроизводит звук при начале записи, чтобы сигнализировать, что можно начинать говорить.",
"general.recordingFeedback.audioCue.click": "Щелчок",
"general.recordingFeedback.audioCue.beep": "Сигнал",
"general.recordingFeedback.audioCue.chime": "Колокольчик",
"general.recordingFeedback.audioCue.none": "Нет",
"indicator.initializing": "Запуск..."
```

`tr.json`:
```json
"general.recordingFeedback.title": "Kayıt Geri Bildirimi",
"general.recordingFeedback.audioCue": "Kayıt başlangıç sesi",
"general.recordingFeedback.audioCue.description": "Kayıt başladığında konuşmaya başlayabileceğinizi belirtmek için bir ses çalar.",
"general.recordingFeedback.audioCue.click": "Tıklama",
"general.recordingFeedback.audioCue.beep": "Bip",
"general.recordingFeedback.audioCue.chime": "Zil",
"general.recordingFeedback.audioCue.none": "Yok",
"indicator.initializing": "Başlatılıyor..."
```

**Step 3: Run test to verify all locale files match**

Run: `npx vitest run tests/shared/i18n.test.ts`
Expected: PASS — all locale files have the same keys

**Step 4: Commit**

```bash
git add src/shared/i18n/locales/*.json
git commit -m "feat(i18n): add recording feedback translations for all 9 locales"
```

---

### Task 3: Add `AnalyserNode` and audio level IPC to recorder

**Files:**
- Modify: `src/main/audio/recorder.ts`

**Step 1: Add `onAudioLevels` callback and `AnalyserNode` to recorder**

Modify `AudioRecorder` class in `src/main/audio/recorder.ts`:

1. Add a callback property and `levelsInterval`:
```typescript
export class AudioRecorder {
  private win: BrowserWindow | null = null;
  private recording = false;
  private levelsInterval: ReturnType<typeof setInterval> | null = null;
  onAudioLevels: ((levels: number[]) => void) | null = null;
```

2. In the `start()` method, after the existing `executeJavaScript` call that sets up recording, add an `AnalyserNode` and start a polling interval:

After `this.recording = true;`, add:
```typescript
// Start audio level polling for waveform visualization
this.levelsInterval = setInterval(async () => {
  if (!this.recording || !this.win || this.win.isDestroyed()) {
    this.stopLevels();
    return;
  }
  try {
    const levels: number[] = await this.win.webContents.executeJavaScript(`
      (() => {
        if (!window._recAnalyser) return [0,0,0,0,0,0,0];
        const data = new Uint8Array(window._recAnalyser.frequencyBinCount);
        window._recAnalyser.getByteFrequencyData(data);
        const binCount = data.length;
        const bandSize = Math.floor(binCount / 7);
        const levels = [];
        for (let i = 0; i < 7; i++) {
          let sum = 0;
          const start = i * bandSize;
          const end = Math.min(start + bandSize, binCount);
          for (let j = start; j < end; j++) sum += data[j];
          levels.push(sum / ((end - start) * 255));
        }
        return levels;
      })()
    `);
    this.onAudioLevels?.(levels);
  } catch {
    // Window may have been destroyed
  }
}, 33);
```

3. Update the `executeJavaScript` in `start()` to also create an `AnalyserNode`. Insert after `const source = ctx.createMediaStreamSource(stream);`:
```javascript
const analyser = ctx.createAnalyser();
analyser.fftSize = 64;
analyser.smoothingTimeConstant = 0.6;
source.connect(analyser);
window._recAnalyser = analyser;
```

4. Add a helper method:
```typescript
private stopLevels(): void {
  if (this.levelsInterval) {
    clearInterval(this.levelsInterval);
    this.levelsInterval = null;
  }
}
```

5. Call `this.stopLevels()` at the start of both `stop()` and `cancel()` methods.

6. In the `stop()` and `cancel()` JS strings, add cleanup: `window._recAnalyser = null;`

7. In `dispose()`, call `this.stopLevels();` before `this.win.destroy()`.

**Step 2: Verify build compiles**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: No errors

**Step 3: Commit**

```bash
git add src/main/audio/recorder.ts
git commit -m "feat(recorder): add AnalyserNode and audio level callback"
```

---

### Task 4: Add `initializing` state to indicator overlay

**Files:**
- Modify: `src/main/indicator.ts`

**Step 1: Update `IndicatorMode` type to include `initializing`**

Change line 4:
```typescript
type IndicatorMode = "initializing" | "listening" | "transcribing" | "enhancing" | "error" | "canceled";
```

**Step 2: Add `initializing` entry to `INDICATOR_KEYS`**

```typescript
const INDICATOR_KEYS: Record<IndicatorMode, string> = {
  initializing: "indicator.initializing",
  listening: "indicator.listening",
  // ... rest stays the same
};
```

**Step 3: Add `initializing` entry to `INDICATOR_STYLES`**

```typescript
const INDICATOR_STYLES: Record<IndicatorMode, { color: string; pulse: boolean }> = {
  initializing: { color: "#888888", pulse: false },
  listening:    { color: "#ff4444", pulse: false },
  // ... rest stays the same
};
```

**Step 4: Update `buildHtml` to render spinner for `initializing`, waveform bars for `listening`**

Replace the `iconHtml` logic in `buildHtml`:

```typescript
const showXIcon = mode === "error" || mode === "canceled";
const showSpinner = mode === "initializing";
const showWaveform = mode === "listening";
const showCancelButton = mode === "initializing" || mode === "listening" || mode === "transcribing";

let iconHtml: string;
if (showXIcon) {
  iconHtml = `<svg class="icon" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
} else if (showSpinner) {
  iconHtml = `<div class="spinner"></div>`;
} else if (showWaveform) {
  iconHtml = `<div class="waveform">${Array.from({ length: 7 }, (_, i) => `<div class="bar" data-index="${i}"></div>`).join("")}</div>`;
} else {
  iconHtml = `<div class="dot"></div>`;
}
```

For `listening`, hide the text label (waveform replaces it):
```typescript
const labelHtml = showWaveform ? "" : `<span>${text}</span>`;
```

Update the body line:
```html
<body><div class="pill">${iconHtml}${labelHtml}${cancelButtonHtml}</div></body>
```

**Step 5: Add CSS for spinner and waveform to `buildHtml`**

Add these CSS rules inside the `<style>` block:

```css
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #888;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.waveform {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 20px;
}
.bar {
  width: 3px;
  min-height: 3px;
  height: 3px;
  background: ${color};
  border-radius: 1.5px;
  box-shadow: 0 0 4px ${color};
  transition: height 0.05s ease;
}
```

**Step 6: Add `sendAudioLevels` method to `IndicatorWindow`**

Add a public method to forward audio levels to the indicator window:

```typescript
sendAudioLevels(levels: number[]): void {
  if (!this.window || this.window.isDestroyed()) return;
  this.window.webContents.executeJavaScript(`
    (() => {
      const bars = document.querySelectorAll('.bar');
      const levels = ${JSON.stringify(levels)};
      bars.forEach((bar, i) => {
        const h = Math.max(3, levels[i] * 20);
        bar.style.height = h + 'px';
      });
    })()
  `).catch(() => {});
}
```

**Step 7: Update `show()` to handle interactive state for `initializing`**

Change line 142:
```typescript
const isInteractive = mode === "initializing" || mode === "listening" || mode === "transcribing";
```

**Step 8: Verify build compiles**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: No errors

**Step 9: Commit**

```bash
git add src/main/indicator.ts
git commit -m "feat(indicator): add initializing state with spinner and waveform bars"
```

---

### Task 5: Create audio cue generator module

**Files:**
- Create: `src/main/audio/cue.ts`
- Create: `tests/main/audio/cue.test.ts`

**Step 1: Write the failing test**

Create `tests/main/audio/cue.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateCueSamples } from "../../src/main/audio/cue";

describe("generateCueSamples", () => {
  it("should generate click samples at 44100 sample rate", () => {
    const samples = generateCueSamples("click", 44100);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.length).toBeLessThanOrEqual(44100); // max 1 second
    // All values should be in [-1, 1] range
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("should generate beep samples", () => {
    const samples = generateCueSamples("beep", 44100);
    expect(samples.length).toBeGreaterThan(0);
  });

  it("should generate chime samples", () => {
    const samples = generateCueSamples("chime", 44100);
    expect(samples.length).toBeGreaterThan(0);
  });

  it("should return empty array for 'none'", () => {
    const samples = generateCueSamples("none", 44100);
    expect(samples).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/audio/cue.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/main/audio/cue.ts`:

```typescript
import type { AudioCueType } from "../../shared/config";

/**
 * Generate raw PCM samples for an audio cue.
 * Returns Float32Array-compatible number[] in range [-1, 1].
 */
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
  const duration = 0.05; // 50ms
  const len = Math.floor(sr * duration);
  const samples: number[] = [];
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const envelope = 1 - t / duration; // linear decay
    const noise = Math.random() * 2 - 1;
    samples.push(noise * envelope * 0.3);
  }
  return samples;
}

function generateBeep(sr: number): number[] {
  const duration = 0.15; // 150ms
  const freq = 880; // A5
  const len = Math.floor(sr * duration);
  const samples: number[] = [];
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const envelope = Math.min(1, (duration - t) / 0.02); // fade-out last 20ms
    samples.push(Math.sin(2 * Math.PI * freq * t) * envelope * 0.3);
  }
  return samples;
}

function generateChime(sr: number): number[] {
  const duration = 0.3; // 300ms
  const freq = 1047; // C6
  const len = Math.floor(sr * duration);
  const samples: number[] = [];
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const envelope = Math.exp(-t * 8); // exponential decay
    const wave = Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(2 * Math.PI * freq * 2 * t);
    samples.push(wave * envelope * 0.2);
  }
  return samples;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/audio/cue.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/audio/cue.ts tests/main/audio/cue.test.ts
git commit -m "feat(audio): add programmatic audio cue generator"
```

---

### Task 6: Add audio cue playback to recorder window

**Files:**
- Modify: `src/main/audio/recorder.ts`

**Step 1: Add `playAudioCue` method**

Add a method to `AudioRecorder` that plays a cue through the hidden BrowserWindow's audio context:

```typescript
async playAudioCue(samples: number[]): Promise<void> {
  if (samples.length === 0) return;
  if (!this.win || this.win.isDestroyed()) return;

  await this.win.webContents.executeJavaScript(`
    (() => {
      const samples = new Float32Array(${JSON.stringify(Array.from(samples))});
      const ctx = new AudioContext();
      const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      // Resample if needed (cue generated at 44100, playback may differ)
      buffer.getChannelData(0).set(samples.length <= buffer.length
        ? samples
        : samples.slice(0, buffer.length));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      source.onended = () => ctx.close();
    })()
  `);
}
```

**Step 2: Verify build compiles**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: No errors

**Step 3: Commit**

```bash
git add src/main/audio/recorder.ts
git commit -m "feat(recorder): add playAudioCue method for recording start sound"
```

---

### Task 7: Wire `initializing` → `listening` flow in ShortcutManager

**Files:**
- Modify: `src/main/shortcuts/manager.ts`

**Step 1: Import `generateCueSamples`**

Add at top of file:
```typescript
import { generateCueSamples } from "../audio/cue";
import type { AudioCueType } from "../../shared/config";
```

**Step 2: Update `onRecordingStart` method**

Replace the `onRecordingStart` method with the new flow:

```typescript
private onRecordingStart(): void {
  const pipeline = this.deps.getPipeline();
  console.log("[Vox] Recording requested — showing initializing indicator");
  this.indicator.hide();
  this.indicator.show("initializing");
  this.updateTrayState();

  pipeline.startRecording().then(() => {
    console.log("[Vox] Recording started — mic active");
    this.indicator.show("listening");

    // Play audio cue
    const config = this.deps.configManager.load();
    const cueType = (config.recordingAudioCue ?? "click") as AudioCueType;
    const samples = generateCueSamples(cueType, 44100);
    if (samples.length > 0) {
      pipeline.playAudioCue(samples).catch((err: Error) => {
        console.error("[Vox] Audio cue failed:", err.message);
      });
    }
  }).catch((err: Error) => {
    console.error("[Vox] Recording failed:", err.message);
    this.indicator.hide();
    this.updateTrayState();

    if (err instanceof NoModelError) {
      this.indicator.showError(3000, t("notification.setupRequired.indicator"));
      this.stateMachine.setIdle();
      this.updateTrayState();
      new Notification({ title: t("notification.setupRequired.title"), body: t("notification.setupRequired.body") }).show();
    } else {
      new Notification({ title: "Vox", body: t("notification.recordingFailed", { error: err.message }) }).show();
    }
  });
}
```

**Step 3: Expose `playAudioCue` on Pipeline**

In `src/main/pipeline.ts`, add a method:

```typescript
async playAudioCue(samples: number[]): Promise<void> {
  await (this.deps.recorder as any).playAudioCue?.(samples);
}
```

Actually — cleaner approach: add `playAudioCue` to the `PipelineDeps.recorder` interface:

In `src/main/pipeline.ts`, update the `recorder` type in `PipelineDeps`:
```typescript
recorder: {
  start(): Promise<void>;
  stop(): Promise<RecordingResult>;
  cancel(): Promise<void>;
  playAudioCue?(samples: number[]): Promise<void>;
};
```

And add a passthrough on `Pipeline`:
```typescript
async playAudioCue(samples: number[]): Promise<void> {
  await this.deps.recorder.playAudioCue?.(samples);
}
```

**Step 4: Wire audio levels from recorder to indicator**

In `src/main/app.ts`, inside `setupPipeline()`, after creating the `AudioRecorder`, wire the callback:

```typescript
const recorder = new AudioRecorder();
recorder.onAudioLevels = (levels) => {
  shortcutManager?.sendAudioLevels(levels);
};

pipeline = new Pipeline({
  recorder,
  // ... rest unchanged
});
```

Add `sendAudioLevels` to `ShortcutManager`:

In `src/main/shortcuts/manager.ts`:
```typescript
sendAudioLevels(levels: number[]): void {
  this.indicator.sendAudioLevels(levels);
}
```

**Step 5: Verify build compiles**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: No errors

**Step 6: Commit**

```bash
git add src/main/shortcuts/manager.ts src/main/pipeline.ts src/main/app.ts
git commit -m "feat(shortcuts): wire initializing→listening flow with audio cue and waveform"
```

---

### Task 8: Update `showIndicator` type signature

**Files:**
- Modify: `src/main/shortcuts/manager.ts`

**Step 1: Update `showIndicator` to accept `initializing`**

Change the method signature:
```typescript
showIndicator(mode: "initializing" | "listening" | "transcribing" | "enhancing" | "error"): void {
  this.indicator.show(mode);
}
```

**Step 2: Commit**

```bash
git add src/main/shortcuts/manager.ts
git commit -m "refactor(shortcuts): update showIndicator to accept initializing mode"
```

---

### Task 9: Add Recording Feedback section to GeneralPanel

**Files:**
- Modify: `src/renderer/components/general/GeneralPanel.tsx`

**Step 1: Add the audio cue dropdown UI**

Import the type:
```typescript
import type { ThemeMode, SupportedLanguage, AudioCueType } from "../../../shared/config";
```

Add the audio cue options array inside the component (after `themeLabels`):

```typescript
const audioCueOptions: { value: AudioCueType; labelKey: string }[] = [
  { value: "click", labelKey: "general.recordingFeedback.audioCue.click" },
  { value: "beep", labelKey: "general.recordingFeedback.audioCue.beep" },
  { value: "chime", labelKey: "general.recordingFeedback.audioCue.chime" },
  { value: "none", labelKey: "general.recordingFeedback.audioCue.none" },
];
```

Add the change handler:

```typescript
const setAudioCue = async (cue: AudioCueType) => {
  updateConfig({ recordingAudioCue: cue });
  await saveConfig(false);
  triggerToast();
};
```

Add the JSX block after the Language card and before the Startup card:

```tsx
<div className={card.card}>
  <div className={card.header}>
    <h2>{t("general.recordingFeedback.title")}</h2>
    <p className={card.description}>{t("general.recordingFeedback.audioCue.description")}</p>
  </div>
  <div className={card.body}>
    <select
      value={config.recordingAudioCue ?? "click"}
      onChange={(e) => setAudioCue(e.target.value as AudioCueType)}
    >
      {audioCueOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
      ))}
    </select>
  </div>
</div>
```

**Step 2: Add audio cue preview on selection**

To play a preview when the user changes the dropdown, we need to generate the cue in the renderer. Since `generateCueSamples` is pure math with no Node.js deps, it can run in the renderer too.

Update the `setAudioCue` handler:

```typescript
const setAudioCue = async (cue: AudioCueType) => {
  updateConfig({ recordingAudioCue: cue });
  await saveConfig(false);
  triggerToast();

  // Play preview
  if (cue !== "none") {
    const { generateCueSamples } = await import("../../../main/audio/cue");
    const ctx = new AudioContext();
    const samples = generateCueSamples(cue, ctx.sampleRate);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(new Float32Array(samples));
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    source.onended = () => ctx.close();
  }
};
```

> **Note:** If `electron-vite` doesn't allow importing main-process code from renderer, extract `generateCueSamples` to `src/shared/audio-cue.ts` instead (it's pure math, no Node.js deps). Update imports in both `src/main/audio/cue.ts` (re-export) and the renderer.

**Step 3: Verify by running dev**

Run: `npm run dev`
Expected: Settings panel shows "Recording Feedback" card with dropdown. Changing selection plays preview sound.

**Step 4: Commit**

```bash
git add src/renderer/components/general/GeneralPanel.tsx
git commit -m "feat(settings): add recording feedback section with audio cue selector"
```

---

### Task 10: Update pipeline test mocks

**Files:**
- Modify: `tests/main/pipeline.test.ts`

**Step 1: Add `playAudioCue` to mock recorder**

In the mock recorder at the top of the file, add:
```typescript
const mockRecorder = {
  start: vi.fn(),
  stop: vi.fn().mockResolvedValue({
    audioBuffer: new Float32Array([0.1, 0.2]),
    sampleRate: 16000,
  }),
  cancel: vi.fn(),
  playAudioCue: vi.fn(),
};
```

Ensure all test pipelines that create their own recorder objects also include `playAudioCue: vi.fn()`.

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add tests/main/pipeline.test.ts
git commit -m "test: update pipeline mocks for playAudioCue"
```

---

### Task 11: Final integration test and cleanup

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors (or only pre-existing ones)

**Step 4: Manual test**

Run: `npm run dev`

Test the following:
1. Press Alt+Space — overlay shows gray spinner (initializing)
2. After ~300-700ms — overlay transitions to red waveform bars, click sound plays
3. Speak — bars react to voice amplitude
4. Release Alt+Space — overlay shows "Transcribing..." (orange dot)
5. Go to Settings > General > Recording Feedback — change audio cue dropdown — preview plays
6. Set to "None" — record again — no sound plays on recording start

**Step 5: Commit any fixes from manual testing**

```bash
git add -A
git commit -m "fix: address issues found during integration testing"
```

---

### Task 12: Move `generateCueSamples` to shared if needed

> **Conditional task** — only needed if Task 9 import fails because `electron-vite` doesn't allow renderer importing from `src/main/`.

**Files:**
- Create: `src/shared/audio-cue.ts`
- Modify: `src/main/audio/cue.ts` (re-export from shared)
- Modify: `src/renderer/components/general/GeneralPanel.tsx` (import from shared)
- Modify: `tests/main/audio/cue.test.ts` (import from shared)

**Step 1: Move the pure function**

Create `src/shared/audio-cue.ts` with the content of `generateCueSamples` and its helpers (same code from Task 5 Step 3).

**Step 2: Update `src/main/audio/cue.ts`**

```typescript
export { generateCueSamples } from "../../shared/audio-cue";
```

**Step 3: Update renderer import**

```typescript
import { generateCueSamples } from "../../../shared/audio-cue";
```

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All pass

**Step 5: Commit**

```bash
git add src/shared/audio-cue.ts src/main/audio/cue.ts src/renderer/components/general/GeneralPanel.tsx tests/main/audio/cue.test.ts
git commit -m "refactor: move generateCueSamples to shared for renderer access"
```
