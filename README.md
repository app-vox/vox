# Vox

Open-source voice-to-text app with local Whisper transcription and AI-powered correction.

[![Website](https://img.shields.io/badge/Website-usevox.app-6366f1?style=flat&logo=safari&logoColor=white)](https://usevox.app/)
[![CI](https://github.com/app-vox/vox/actions/workflows/ci.yml/badge.svg)](https://github.com/app-vox/vox/actions/workflows/ci.yml)
[![Release](https://github.com/app-vox/vox/actions/workflows/release.yml/badge.svg)](https://github.com/app-vox/vox/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/app-vox/vox/graph/badge.svg)](https://codecov.io/gh/app-vox/vox)
[![License: FSL-1.1-ALv2](https://img.shields.io/badge/License-FSL--1.1--ALv2-blue.svg)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-12.0+-000000?logo=apple&logoColor=white)](https://www.apple.com/macos/)
[![Windows](https://img.shields.io/badge/Windows-10+-0078D4?logo=windows&logoColor=white)](https://www.microsoft.com/windows/)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/rodrigoluizs)

Hold a keyboard shortcut, speak, and Vox transcribes your voice locally using [whisper.cpp](https://github.com/ggerganov/whisper.cpp), optionally corrects it with AI, and pastes the text into your active app.

## Demo

<div align="center">

![Vox Demo](docs/images/demo.gif)

</div>

> **Platform Support**
> Vox runs on **macOS** (Apple Silicon and Intel) and **Windows** (10+). Linux support is planned for future releases.

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Use Cases](#use-cases)
- [How Vox Compares](#how-vox-compares)
- [Requirements](#requirements)
- [Configuration](#configuration)
- [Usage](#usage)
- [FAQ](#faq)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

Download the latest version from the [releases page](https://github.com/app-vox/vox/releases/latest).

- **macOS**: Drag `Vox.app` to your Applications folder.
- **Windows**: Run the installer (`.exe`) and follow the setup wizard.

## First Launch

When you first launch Vox, you'll need to:

1. **Download a Whisper Model** — Go to Settings > Local Model and download at least one speech recognition model. The "small" model (Recommended) is a good starting point.

2. **Grant Permissions** — Vox needs:
   - **Microphone**: Required for voice recording
   - **Accessibility**: Required for keyboard shortcuts and auto-paste

3. **Configure Shortcuts** (optional) — Customize keyboard shortcuts in Settings > Shortcuts

4. **Enable AI Improvements** (optional) — Configure LLM provider in Settings > AI Improvements

Vox will guide you through this setup process with visual indicators showing what's incomplete.

Once configured, hold `Alt+Space` to start recording.

## Features

- **🔒 100% Local transcription** — Powered by whisper.cpp, audio stays on your device
- **🤖 AI correction** — Removes filler words and fixes grammar (optional)
- **⚙️ Custom prompts** — Keep several prompts for medical, technical, creative, or translation workflows, and switch from the tray or a shortcut
- **⌨️ Hold or toggle modes** — Press-and-hold or toggle recording on/off
- **📋 Auto-paste** — Text is pasted directly into your focused app
- **🎯 Multiple models** — Choose speed vs accuracy (tiny to large)
- **☁️ Multiple LLM providers** — OpenAI-compatible or AWS Bedrock
- **🎨 Menu bar app** — Runs quietly in the background with dark/light mode support

## Use Cases

### 👨‍⚕️ Medical Professionals
Preserve medical terminology and standard abbreviations. Vox understands context and won't autocorrect "OA" to "okay" or "PT" to "patient."

**Example custom prompt:**
> "Preserve medical terminology, standard abbreviations (e.g., OA, PT, BP), and format as clinical notes."

### 👨‍💻 Developers & Engineers
Format technical dictation as concise documentation. Remove filler words while keeping technical terms intact.

**Example custom prompt:**
> "Format as technical documentation. Be concise, remove filler words, preserve code terms and abbreviations."

### ✍️ Writers & Content Creators
Enhance prose while maintaining your unique voice. Turn spoken ideas into polished text ready for editing.

**Example custom prompt:**
> "Enhance prose for readability while maintaining the author's voice. Fix grammar but keep the casual tone."

### 🌍 Language Learners
Practice speaking by translating and correcting your speech in real-time.

**Example custom prompt:**
> "Translate to German and correct grammar. Output only the German translation."

### 📝 Note-Taking & Productivity
Capture thoughts quickly without typing. Perfect for meetings, brainstorming, or journaling.

## How Vox Compares

| Feature | Vox | Dragon NaturallySpeaking | macOS Dictation | Whisper Desktop Apps |
| ------- | --- | ------------------------ | --------------- | -------------------- |
| **Price** | Free & Open Source | $300+ | Free (limited) | Varies ($0-50) |
| **Privacy** | 100% Local | Cloud-based | Cloud-based | Mostly local |
| **Custom Prompts** | ✅ Full control, multiple prompts | ❌ Limited | ❌ None | ⚠️ Some apps |
| **AI Enhancement** | ✅ Your own API | ❌ None | ⚠️ Basic | ⚠️ Varies |
| **Offline Mode** | ✅ Full | ⚠️ Limited | ❌ Requires internet | ✅ Most |
| **Native App** | ✅ Menu bar / tray | ⚠️ Full app | ✅ Built-in | ✅ Varies |
| **Custom Shortcuts** | ✅ Configurable | ✅ Yes | ⚠️ Limited | ✅ Most |
| **Open Source** | ✅ FSL-1.1-ALv2 | ❌ Proprietary | ❌ Proprietary | ⚠️ Some |

**Why Vox?**
- **Privacy-first**: Your audio never leaves your device
- **Flexibility**: Use any OpenAI-compatible LLM or AWS Bedrock
- **Customization**: Tailor AI corrections to your exact needs
- **Free & Open**: No subscription, no cloud lock-in

## Requirements

- **macOS** (Apple Silicon or Intel) or **Windows** (10+)
- **LLM provider** (optional) — for text correction:
  - OpenAI-compatible endpoint with API key
  - Or AWS Bedrock credentials with model access

## Configuration

### Whisper Models

Download at least one model from the Whisper tab:

| Model  | Size    | Speed  | Accuracy |
|--------|---------|--------|----------|
| tiny   | ~75 MB  | Fastest| Lower    |
| base   | ~140 MB | Fast   | Decent   |
| small  | ~460 MB | Good   | Good     |
| medium | ~1.5 GB | Slow   | Better   |
| large  | ~3 GB   | Slowest| Best     |

### LLM Provider

**Foundry (OpenAI-compatible)**
- Endpoint URL
- API key
- Model name (e.g., `gpt-4o`)

**AWS Bedrock**
- AWS region
- Credentials (access key, profile, or default chain)
- Model ID (e.g., `anthropic.claude-3-5-sonnet-20241022-v2:0`)

### Shortcuts

Customize keyboard shortcuts in the Shortcuts tab:
- **Hold mode** (default: `Alt+Space`)
- **Toggle mode** (default: `Alt+Shift+Space`)
- **Next prompt** (unset by default) — switches to the next custom prompt, see [Custom Prompts](#custom-prompts)

### Custom Prompts

Custom prompts tell the AI enhancement how to treat your text. Manage them in Settings > AI Enhancement > Custom Prompt; this sub-tab appears once AI enhancement is turned on:
- **New** — adds a prompt with a name, a one-character icon, and instructions
- **From template** — adds an editable copy of *Translate to Portuguese*, *Translate to German*, *Translate to English*, *Translate to English and German* (the cleaned text plus both translations), or *Wikipedia-style answers* (say a topic, get a short encyclopedic answer); instructions are in English
- **Make active** — picks the prompt Vox applies; with **None** active, Vox uses only its default correction

One prompt is active at a time. Switch it from anywhere:
- **Tray menu** — the **Prompt** submenu lists None and every prompt; **Prompt Settings** opens the prompt list, or just the AI Enhancement tab while AI enhancement is off
- **Next prompt shortcut** — set it in the Shortcuts tab (**Clear** unsets it); each press moves to the next prompt and wraps back to None, and the floating indicator (or a notification) shows the new prompt

A prompt is just an instruction, so the list is as useful as you make it: translate whatever you say into one or more languages, turn speech into an encyclopedia-style answer, rewrite it in a formal or casual tone, format it as notes or a bulleted list, or keep one prompt per project or audience and switch between them with a key press.

Switching from the tray or the shortcut needs AI enhancement ready: turned on, with a passing **Test Connection** and no provider settings changed since that test. Until then the tray shows "Prompt: AI enhancement isn't ready" and the shortcut only shows a notification; **Make active** in settings still works. A switch applies to the next dictation, even one you are already recording.

#### Upgrading from a single custom prompt

If you had a custom prompt, it becomes a prompt named **Default** and stays active. Vox then keeps a one-time copy of your old settings as `config.json.pre-prompts.bak` next to `config.json` in its config folder; without earlier custom instructions there is no copy:
- **macOS**: `~/Library/Application Support/vox/` — Finder hides `~/Library`, so use **Go > Go to Folder…** and paste the path
- **Windows**: `%APPDATA%\vox\`

⚠️ The upgrade is one-way. An older Vox drops the prompt list the next time it saves its settings, and prompts created since the upgrade can't be recovered after a downgrade. Don't run an older Vox at the same time as this version.

To go back to an older Vox:
- **Keep one prompt** — before downgrading, copy the instructions of the prompt you want to keep from the Custom Prompt list, then paste them into the older Vox's single custom prompt field
- **Restore everything** — quit Vox from its tray menu (**Quit**), then copy `config.json.pre-prompts.bak` over `config.json`; every other setting also returns to how it was at the upgrade

## Usage

Once configured, Vox runs as a menu bar icon.

Press your shortcut to record. The floating indicator shows:
- **Red** — Recording
- **Yellow** — Transcribing
- **Blue** — Correcting (if LLM enabled)

Release (hold mode) or press again (toggle mode) to stop. Text is pasted automatically.

If correction fails, raw transcription is used. If transcription is empty (silence/noise), nothing is pasted.

## Development

### Setup

> Requires [cmake](https://cmake.org/download).

```bash
git clone https://github.com/app-vox/vox.git
cd vox
make install   # installs npm deps + builds whisper.cpp
```

### Run

```bash
make dev        # development with hot reload (also: make start)
npm test        # run tests
npm run dist    # build production app
make help       # list all available make targets
```

Built with Electron, React, TypeScript, and whisper.cpp.

## Contributing

Contributions welcome! To contribute:

1. Fork and create a feature branch
2. Make your changes
3. Run `npm run typecheck && npm run lint && npm test`
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat(audio): add noise gate`)
5. Open a pull request

⚠️ See more details in [CONTRIBUTING.md](CONTRIBUTING.md).

## FAQ

### Is Vox really free?
Yes, Vox is 100% free and open-source. Transcription runs locally using Whisper.cpp. If you use optional AI enhancement, you'll need your own API keys (OpenAI-compatible or AWS Bedrock), but there are no fees from Vox.

### Does my audio leave my device?
No. Transcription happens entirely on your device. Only if you enable AI enhancement does the *text* (not audio) get sent to your configured LLM provider for correction. Your audio recordings never leave your device.

### What's the difference between local transcription and AI enhancement?
- **Local transcription**: Whisper.cpp converts your speech to text on your device. Fast, accurate, 100% private.
- **AI enhancement** (optional): Sends the transcribed *text* to an LLM to remove filler words ("um", "uh"), fix grammar, or apply custom corrections based on your prompt.

### Which Whisper model should I use?
- **Small** (~460MB): Best balance of speed and accuracy. Recommended for most users.
- **Tiny/Base**: Faster but less accurate. Good for quick notes.
- **Medium/Large**: Slower but more accurate. Good for technical/medical content or noisy environments.

You can switch models anytime in Settings.

### Can I use Vox with Claude/ChatGPT/other LLMs?
Yes! Vox works with:
- **OpenAI-compatible APIs**: OpenAI, Anthropic (via Bedrock), OpenRouter, local LLMs with OpenAI-compatible endpoints
- **AWS Bedrock**: Claude, Llama, Mistral, and other Bedrock models

### Does Vox work offline?
Yes. Local transcription works 100% offline. AI enhancement requires internet (since it calls your LLM provider API), but you can disable it and use raw transcription offline.

### Why does Vox need Accessibility permissions?
Vox needs Accessibility access to:
1. Listen for your custom keyboard shortcuts globally
2. Simulate paste (`Cmd+V` on macOS, `Ctrl+V` on Windows) to insert transcribed text into your active app

Without this, Vox can't detect shortcuts or auto-paste text.

### Can I contribute to Vox?
Absolutely! Vox is open-source. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. We welcome bug reports, feature requests, and pull requests.

### What about Linux?
Vox runs on macOS and Windows. Linux support is planned — follow the repo for updates!

## License

This project is licensed under the [Functional Source License, Version 1.1, ALv2 Future License](LICENSE).

You can use, modify, and redistribute the code for any purpose **except** building a competing commercial product or service. After two years, each release automatically converts to the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

See [LICENSE](LICENSE) for full details.
