#!/usr/bin/env bash
# Generate WAV audio files for pipeline test scenarios using macOS TTS.
# Usage: ./scripts/generate-pipeline-audio.sh
#
# Requires: macOS `say` command, python3 (for JSON parsing)
# Output: tests/pipeline/audio/<category>/<NNN>.wav (16kHz, 32-bit float)

set -euo pipefail

SCENARIOS_DIR="tests/pipeline/scenarios"
AUDIO_DIR="tests/pipeline/audio"
VOICE="${VOX_TTS_VOICE:-Samantha}"
RATE="${VOX_TTS_RATE:-180}"

if ! command -v say &>/dev/null; then
  echo "Error: 'say' command not found. This script requires macOS."
  exit 1
fi

scenario_files=$(find "$SCENARIOS_DIR" -name '*.json' -type f | sort)
total=0
generated=0

for file in $scenario_files; do
  category=$(basename "$file" .json)
  mkdir -p "$AUDIO_DIR/$category"

  count=$(python3 -c "import json; print(len(json.load(open('$file'))))")

  for i in $(seq 0 $((count - 1))); do
    id=$(python3 -c "import json; print(json.load(open('$file'))[$i]['id'])")
    spoken=$(python3 -c "import json; print(json.load(open('$file'))[$i]['spokenText'])")
    audio_file=$(python3 -c "import json; print(json.load(open('$file'))[$i]['audioFile'])")
    output_path="$AUDIO_DIR/$audio_file"
    total=$((total + 1))

    if [ -f "$output_path" ]; then
      echo "  skip: $id (already exists)"
      continue
    fi

    say -v "$VOICE" -r "$RATE" -o "$output_path" --data-format=LEF32@16000 "$spoken"
    generated=$((generated + 1))
    echo "  done: $id -> $audio_file"
  done
done

echo ""
echo "Generated $generated new files ($total total scenarios)."
echo "Audio directory: $AUDIO_DIR"
