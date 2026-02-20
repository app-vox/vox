# Pipeline Tests

End-to-end tests that evaluate the transcription pipeline (Whisper STT + LLM correction) against structured scenarios with similarity scoring and deterministic assertions.

These tests are **isolated** from the regular test suite and **never run** during `npm test`. They call external LLM APIs, so each run has a cost.

## Setup

1. Copy the example config and fill in your credentials:

```bash
cp pipeline-test-config.json.example pipeline-test-config.json
```

2. Edit `pipeline-test-config.json`:

```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini",
    "baseUrl": "https://api.openai.com/v1"
  },
  "whisper": {
    "modelPath": "/path/to/ggml-base.bin"
  }
}
```

Supported providers: `openai`, `anthropic`, `deepseek`, `glm`, `litellm`, `bedrock`, `custom`, `foundry`.

The `whisper.modelPath` is only needed for full pipeline tests with audio files. For LLM-only correction tests, it can be empty.

## Test modes

The tests run in one of two modes depending on your configuration:

| Mode | What runs | When |
|------|-----------|------|
| **Full pipeline** (default) | Audio file → Whisper STT → LLM correction | `whisper.modelPath` points to a valid model file |
| **LLM-only** (fallback) | `spokenText` → LLM correction | `whisper.modelPath` is empty or missing |

Full pipeline mode exercises the entire transcription chain, including how well Whisper handles the audio. LLM-only mode isolates the LLM correction stage using the scenario's `spokenText` as a simulated Whisper output.

## Running

```bash
# Run all pipeline tests (schema validation + integration)
VOX_PIPELINE_TEST_CONFIG=./pipeline-test-config.json npm run test:pipeline

# Run only schema validation (no LLM calls, no config needed)
npm run test:pipeline -- scenario-schema

# Run a specific scenario category
VOX_PIPELINE_TEST_CONFIG=./pipeline-test-config.json npm run test:pipeline -- filler-removal
```

Without `VOX_PIPELINE_TEST_CONFIG` set, integration tests skip automatically. Schema validation always runs.

## Scenario structure

Each category has its own JSON file under `tests/pipeline/scenarios/`. A scenario looks like:

```json
{
  "id": "filler-removal-003",
  "description": "The word 'like' used as a verb should be preserved",
  "spokenText": "I um really like the new design",
  "audioFile": "filler-removal/003.wav",
  "expectedOutput": "I really like the new design.",
  "minSimilarity": 0.85,
  "assertions": [
    { "type": "must_contain", "value": "like the new design" },
    { "type": "must_not_contain", "value": " um " }
  ]
}
```

A test passes when **both** conditions are met:
- Normalized similarity between actual output and `expectedOutput` is >= `minSimilarity`
- All assertions pass

## Categories

| Category | Count | What it tests |
|----------|-------|---------------|
| filler-removal | 6 | Removing fillers while preserving "like" as verb, "you know" as question |
| self-corrections | 6 | "no wait", "I meant", "actually" as emphasis vs correction |
| false-starts | 6 | Stutters, repetitions, abandoned sentence starts |
| speech-recognition-errors | 7 | Homophones, technical terms, ambiguous words |
| punctuation-detection | 6 | Questions, exclamations, statements from context |
| content-preservation | 6 | Profanity, slang, jargon, unusual words kept as-is |
| prompt-injection-resistance | 6 | Speech about AI/prompts treated as literal content |
| spoken-punctuation | 6 | "period" → `.`, "comma" → `,`, literal vs command |
| number-date-formatting | 7 | Dates, times, currency, casual numbers |
| contextual-repair | 5 | Semantically broken phrases reconstructed |
| mixed-complexity | 6 | Multiple issues combined in realistic passages |
| dictionary-terms | 6 | Custom dictionary terms corrected to exact spelling |

## Audio files

Each scenario has a corresponding WAV file under `tests/pipeline/audio/`. These are generated via macOS TTS from the `spokenText` field and serve as baseline input for the Whisper stage.

To regenerate all audio files (skips existing ones):

```bash
./scripts/generate-pipeline-audio.sh
```

Environment variables:
- `VOX_TTS_VOICE` — macOS voice name (default: `Samantha`)
- `VOX_TTS_RATE` — speech rate in words per minute (default: `180`)

TTS-generated audio is a starting point. For more realistic testing, replace individual WAVs with human recordings — the pipeline runner uses the same files regardless of how they were created.

## CI

The GitHub Actions workflow (`.github/workflows/pipeline-test.yml`) runs pipeline tests automatically when `src/shared/constants.ts` or `tests/pipeline/**` change. It can also be triggered manually via `workflow_dispatch`.

Required GitHub configuration:
- **Secret**: `PIPELINE_TEST_LLM_API_KEY`
- **Variables**: `PIPELINE_TEST_LLM_PROVIDER`, `PIPELINE_TEST_LLM_MODEL`, `PIPELINE_TEST_LLM_BASE_URL`
