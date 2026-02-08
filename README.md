# Vox

Open-source macOS voice-to-text app with local Whisper transcription and LLM-powered correction.

[![CI](https://github.com/rodrigoluizs/vox/actions/workflows/ci.yml/badge.svg)](https://github.com/rodrigoluizs/vox/actions/workflows/ci.yml)
[![Release](https://github.com/rodrigoluizs/vox/actions/workflows/release.yml/badge.svg)](https://github.com/rodrigoluizs/vox/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## About

Vox is a macOS menu bar app that converts speech to text. Hold a keyboard shortcut, speak, and Vox records your voice, transcribes it locally using [whisper.cpp](https://github.com/ggerganov/whisper.cpp), sends the raw transcription through an LLM to fix grammar and remove filler words, then pastes the corrected text directly into your active application.

Transcription runs entirely on-device. Only the text correction step calls an external LLM provider.

## How It Works

```
  Hold shortcut     Local whisper.cpp     LLM correction      Auto-paste
  ┌──────────┐      ┌──────────────┐      ┌─────────────┐     ┌──────────┐
  │  Record  │ ───> │  Transcribe  │ ───> │   Correct   │ ──> │  Paste   │
  │  (sox)   │      │  (on-device) │      │  (optional)  │     │ (Cmd+V)  │
  └──────────┘      └──────────────┘      └─────────────┘     └──────────┘
```

A floating indicator pill shows the current stage (Listening, Transcribing, Correcting) so you always know what Vox is doing.

## Features

- **Local transcription** — Powered by whisper.cpp, no audio leaves your machine
- **LLM correction** — Fixes speech recognition errors, removes filler words, corrects grammar
- **Two recording modes** — Hold-to-record or toggle on/off
- **Auto-paste** — Transcribed text is pasted directly into the focused app via simulated Cmd+V
- **Configurable shortcuts** — Customize hold and toggle key combinations
- **Multiple Whisper models** — Choose from tiny (~75 MB) to large (~3 GB) based on your accuracy/speed needs
- **Multiple LLM providers** — Foundry (OpenAI-compatible) or AWS Bedrock
- **Menu bar app** — Runs as a tray icon, no dock clutter
- **Light/dark/system theme** — Settings UI follows your macOS appearance preference

## Requirements

- **macOS** (Apple Silicon or Intel)
- **Node.js** >= 22
- **sox** — for audio recording (`brew install sox`)
- **LLM provider** — one of:
  - An OpenAI-compatible API endpoint (Foundry)
  - AWS Bedrock credentials with access to a supported model

## Getting Started

### Install dependencies

```bash
brew install sox
git clone https://github.com/rodrigoluizs/vox.git
cd vox
npm install
```

### Run in development mode

```bash
npm run dev
```

This starts electron-vite in dev mode with hot reload for the renderer.

### Grant permissions

Vox requires two macOS permissions:

1. **Microphone** — for recording audio (prompted automatically)
2. **Accessibility** — for simulating Cmd+V paste (must be granted manually in System Settings > Privacy & Security > Accessibility)

The Settings window has a Permissions tab that shows the status of each permission.

### Configure an LLM provider

Open the Vox settings window from the tray icon and configure your LLM provider in the LLM tab:

**Foundry (OpenAI-compatible)**
- Endpoint URL (e.g. `https://your-endpoint.com`)
- API key
- Model name (e.g. `gpt-4o`)

**AWS Bedrock**
- AWS region
- Authentication: explicit access key + secret, named AWS profile, or default credential chain
- Model ID (e.g. `anthropic.claude-3-5-sonnet-20241022-v2:0`)

### Download a Whisper model

In the Whisper tab of settings, download at least one model. The **small** model (~460 MB) is recommended as a good balance of speed and accuracy.

| Model  | Size   | Description                              |
|--------|--------|------------------------------------------|
| tiny   | ~75 MB | Fastest, lower accuracy                  |
| base   | ~140 MB| Light, decent accuracy                   |
| small  | ~460 MB| Good balance, recommended                |
| medium | ~1.5 GB| Better accuracy, needs decent hardware   |
| large  | ~3 GB  | Best accuracy, significant resources     |

## Usage

Once configured, Vox runs in the background as a menu bar icon.

- **Hold mode** (default: `Alt+Space`) — Hold the shortcut to record, release to transcribe and paste
- **Toggle mode** (default: `Alt+Shift+Space`) — Press once to start recording, press again to stop

The floating indicator shows the current state:
- **Red dot** — Listening (recording)
- **Yellow dot** — Transcribing (whisper.cpp running)
- **Blue dot** — Correcting (LLM processing)

If the LLM correction fails, Vox falls back to the raw transcription. If whisper.cpp produces no usable text (background noise, silence), nothing is pasted.

## Building

### Production build

```bash
npm run dist
```

This compiles the Electron app and packages it with electron-builder. The build is code-signed and notarized using your local keychain profile.

### Install locally

```bash
make release
```

This builds, removes any existing `/Applications/Vox.app`, and installs the new build.

### Release workflow

The project includes a manually-triggered GitHub Actions workflow that builds, signs, notarizes, and publishes a GitHub Release with DMG and zip artifacts.

To trigger a release:

1. Go to **Actions > Release** in the GitHub repo
2. Click **Run workflow**
3. Optionally enter a version tag (e.g., `v1.0.0`) or leave blank to use the version from `package.json`
4. Enable **Dry run** to test the build without creating a release

The workflow requires GitHub secrets for the Apple Developer ID certificate and App Store Connect API key. See [docs/release-workflow-setup.md](docs/release-workflow-setup.md) for setup instructions.

## Scripts

| Command           | Description                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Start in development mode with hot reload|
| `npm run build`   | Build the Electron app                   |
| `npm run start`   | Preview the built app                    |
| `npm run dist`    | Build + package with electron-builder    |
| `npm run typecheck` | Run TypeScript type checking           |
| `npm run lint`    | Run ESLint                               |
| `npm test`        | Run tests with Vitest                    |
| `npm run test:watch` | Run tests in watch mode               |

## Project Structure

```
src/
├── main/                  # Electron main process
│   ├── app.ts             # Entry point, app lifecycle
│   ├── pipeline.ts        # Record → Transcribe → Correct pipeline
│   ├── audio/
│   │   ├── recorder.ts    # Audio recording via sox
│   │   └── whisper.ts     # whisper.cpp transcription
│   ├── llm/
│   │   ├── provider.ts    # LLM provider interface
│   │   ├── factory.ts     # Provider factory
│   │   ├── foundry.ts     # OpenAI-compatible provider
│   │   └── bedrock.ts     # AWS Bedrock provider
│   ├── input/
│   │   └── paster.ts      # Clipboard + Cmd+V simulation via CoreGraphics FFI
│   ├── shortcuts/
│   │   ├── manager.ts     # Global shortcut registration
│   │   └── listener.ts    # Hold/toggle state machine
│   ├── config/            # JSON config persistence
│   ├── models/            # Whisper model download/management
│   ├── indicator.ts       # Floating status pill window
│   ├── tray.ts            # Menu bar tray icon
│   └── windows/           # BrowserWindow management
├── preload/               # Electron preload (context bridge)
├── renderer/              # React UI (settings window)
│   ├── components/        # UI panels (LLM, Whisper, Shortcuts, Permissions, Appearance)
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand state management
│   └── utils/             # Renderer utilities
├── shared/                # Types and constants shared between main/renderer
└── types/                 # Module type declarations
```

## Tech Stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/) — Desktop app framework and build tooling
- [React](https://react.dev/) + [Zustand](https://zustand.docs.pmnd.rs/) — Settings UI and state management
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- [whisper-node](https://github.com/ChetanXpro/whisper-node) / [whisper.cpp](https://github.com/ggerganov/whisper.cpp) — Local speech-to-text
- [koffi](https://koffi.dev/) — FFI for macOS CoreGraphics (paste simulation)
- [uiohook-napi](https://github.com/SergioRt1/uiohook-napi) — Global keyboard hook for shortcut detection
- [AWS SDK](https://aws.amazon.com/sdk-for-javascript/) — Bedrock LLM provider
- [Vitest](https://vitest.dev/) — Testing framework
- [ESLint](https://eslint.org/) — Linting

## Contributing

Contributions are welcome. To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run checks: `npm run typecheck && npm run lint && npm test`
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/) format (e.g. `feat(audio): add noise gate`)
6. Open a pull request

CI runs typecheck, lint, test, and build on every pull request.

## License

[MIT](LICENSE)
