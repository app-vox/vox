# Recording Feedback Overlay Improvement — Design

**Issue:** [#150](https://github.com/app-vox/vox/issues/150)
**Date:** 2026-02-14

## Problem

When users press the recording shortcut, the overlay immediately shows a red pulsing dot ("Listening..."), but the microphone takes ~300-700ms to initialize (`getUserMedia` + `AudioContext`). Users start speaking during this gap and lose their first words.

## Solution Overview

Introduce an `initializing` state to the indicator overlay, add a real-time waveform visualization during recording, and play a configurable audio cue when recording actually begins.

## Overlay State Machine

### New State Flow

```
[shortcut pressed]
    → indicator.show("initializing")    — spinner, gray, no label
    → recorder.start() begins async

[mic actually capturing]
    → indicator.show("listening")       — red waveform bars (morph from spinner), audio cue plays
    → audio levels stream via IPC

[shortcut released / toggle pressed]
    → indicator.show("transcribing")    — orange dot, "Transcribing..." (unchanged)
```

### Visual States

| State | Indicator | Color | Label | Interactive |
|-------|-----------|-------|-------|-------------|
| `initializing` | Spinning loader | Gray (`#888`) | None | Cancel button |
| `listening` | 7 waveform bars | Red (`#ff4444`) | None | Cancel button |
| `transcribing` | Pulsing dot | Orange (`#ffaa00`) | "Transcribing..." | Cancel button |
| `enhancing` | Pulsing dot | Blue (`#44aaff`) | "Enhancing..." | No |
| `error` | X icon | Yellow (`#fbbf24`) | Error text | No |
| `canceled` | X icon | Yellow | "Canceled" | No |

## Waveform Visualization

- **Bar count:** 7 vertical rounded-rectangle bars
- **Color:** Red (`#ff4444`) with glow (`box-shadow: 0 0 8px #ff4444`)
- **Data source:** `AnalyserNode` FFT data from the recorder's hidden BrowserWindow
- **Update rate:** ~30fps via IPC
- **Idle behavior:** Minimal movement when user is silent (mic still live)
- **Morph transition:** Spinner morphs into center bar, remaining bars fan out with CSS transition

### Audio Data Pipeline

1. Recorder creates `AnalyserNode` (FFT size 64 → 32 frequency bins)
2. `setInterval` at ~33ms reads and averages into 7 frequency bands
3. Sends to main process: `ipcRenderer.send('audio:levels', number[])`
4. Main process forwards to indicator: `indicatorWindow.webContents.send('audio:levels', data)`
5. Indicator renders bars using CSS `scaleY` transforms

## Audio Cue

- Plays when state transitions from `initializing` → `listening`
- Short sound played on the system output device (not through recording mic)
- Configurable in settings with preview on selection

### Sound Options

| Option | Duration | Description |
|--------|----------|-------------|
| Click (default) | ~50ms | Subtle click/snap |
| Beep | ~150ms | Clean tone |
| Chime | ~300ms | Gentle ding |
| None | — | Disabled |

Sound files are bundled as small audio assets in app resources.

## Settings

### New Config Field

```typescript
recordingAudioCue: "click" | "beep" | "chime" | "none"  // default: "click"
```

### UI

New "Recording Feedback" section in the General settings panel with a dropdown selector for the audio cue. Selecting an option plays a preview immediately.

### i18n Keys

- `general.recordingFeedback.title`
- `general.recordingFeedback.audioCue`
- `general.recordingFeedback.audioCue.description`
- `general.recordingFeedback.audioCue.click`
- `general.recordingFeedback.audioCue.beep`
- `general.recordingFeedback.audioCue.chime`
- `general.recordingFeedback.audioCue.none`

All 9 locale files must be updated.

## Architecture

### IPC Channels (New)

| Channel | Direction | Data | Purpose |
|---------|-----------|------|---------|
| `audio:levels` | Recorder → Main | `number[]` (7 values, 0-1) | Real-time audio amplitude for waveform |
| `audio:levels` | Main → Indicator | `number[]` (7 values, 0-1) | Forward levels to overlay |
| `audio:cue-play` | Main → System | Sound identifier | Play audio cue on recording start |

### Modified Files (Expected)

- `src/main/indicator.ts` — New `initializing` state, waveform rendering, audio level forwarding
- `src/main/audio/recorder.ts` — Add `AnalyserNode`, send audio levels via IPC
- `src/main/shortcuts/manager.ts` — Show `initializing` before `start()`, show `listening` after
- `src/shared/config.ts` — New `recordingAudioCue` field
- `src/renderer/components/general/GeneralPanel.tsx` — New Recording Feedback section
- `src/shared/i18n/locales/*.json` — All 9 locale files
- `src/preload/index.ts` — Expose audio cue preview if needed

## Risks

- **Mic pickup of audio cue:** The click sound is ~50ms and plays before the user speaks. The first audio buffer is ~256ms, so overlap is negligible.
- **IPC performance:** 7 float values at 30fps is minimal data. No performance concern.
- **ScriptProcessor deprecation:** Already used in current recorder. No additional deprecation risk from adding `AnalyserNode`.
