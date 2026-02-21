#!/usr/bin/env bash
# Record WAV audio files for pipeline test scenarios using your microphone.
# Usage: ./scripts/record-pipeline-audio.sh [category] [id]
#
# Examples:
#   ./scripts/record-pipeline-audio.sh                    # all scenarios
#   ./scripts/record-pipeline-audio.sh filler-removal     # one category
#   ./scripts/record-pipeline-audio.sh filler-removal 003 # one scenario
#
# Requires: sox (brew install sox), python3
# Output: tests/pipeline/audio/<category>/<NNN>.wav (16kHz, mono, 32-bit float)
#
# Controls:
#   Enter  — start recording (after reading the prompt)
#   Enter  — stop recording
#   r      — re-record the last file
#   b      — go back to previous scenario
#   s      — skip this scenario
#   q      — quit

set -euo pipefail

SCENARIOS_DIR="tests/pipeline/scenarios"
AUDIO_DIR="tests/pipeline/audio"
FILTER_CATEGORY="${1:-}"
FILTER_ID="${2:-}"

if ! command -v rec &>/dev/null; then
  echo "Error: 'rec' command not found. Install sox: brew install sox"
  exit 1
fi

TMP_FILE=$(mktemp /tmp/vox-record-XXXXXX.wav)
TMP_TRIMMED="${TMP_FILE%.wav}-trimmed.wav"
trap 'rm -f "$TMP_FILE" "$TMP_TRIMMED"' EXIT

# Build flat arrays of all matching scenarios
IDS=()
SPOKEN=()
AUDIO_FILES=()
OUTPUT_PATHS=()

scenario_files=$(find "$SCENARIOS_DIR" -name '*.json' -type f | sort)

for file in $scenario_files; do
  category=$(basename "$file" .json)

  if [ -n "$FILTER_CATEGORY" ] && [ "$category" != "$FILTER_CATEGORY" ]; then
    continue
  fi

  count=$(python3 -c "import json; print(len(json.load(open('$file'))))")

  for i in $(seq 0 $((count - 1))); do
    id=$(python3 -c "import json; print(json.load(open('$file'))[$i]['id'])")
    scenario_num="${id##*-}"

    if [ -n "$FILTER_ID" ] && [ "$scenario_num" != "$FILTER_ID" ]; then
      continue
    fi

    IDS+=("$id")
    SPOKEN+=("$(python3 -c "import json; print(json.load(open('$file'))[$i]['spokenText'])")")
    audio_file=$(python3 -c "import json; print(json.load(open('$file'))[$i]['audioFile'])")
    AUDIO_FILES+=("$audio_file")
    OUTPUT_PATHS+=("$AUDIO_DIR/$audio_file")
  done
done

total=${#IDS[@]}
if [ "$total" -eq 0 ]; then
  echo "No matching scenarios found."
  exit 0
fi

recorded=0
skipped=0
idx=0

while [ "$idx" -lt "$total" ]; do
  id="${IDS[$idx]}"
  spoken="${SPOKEN[$idx]}"
  output_path="${OUTPUT_PATHS[$idx]}"

  mkdir -p "$(dirname "$output_path")"

  while true; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  [$((idx + 1))/$total] $id"
    if [ -f "$output_path" ]; then
      echo "  * File exists — recording will overwrite"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Read this:"
    echo ""
    echo "    \"$spoken\""
    echo ""
    if [ "$idx" -gt 0 ]; then
      echo "  Enter to record, s to skip, b to go back, q to quit"
    else
      echo "  Enter to record, s to skip, q to quit"
    fi
    read -r action

    if [ "$action" = "q" ]; then
      echo ""
      echo "Quit. Recorded $recorded, skipped $skipped out of $total."
      exit 0
    fi

    if [ "$action" = "b" ] && [ "$idx" -gt 0 ]; then
      idx=$((idx - 1))
      break
    fi

    if [ "$action" = "s" ]; then
      skipped=$((skipped + 1))
      echo "  skipped: $id"
      idx=$((idx + 1))
      break
    fi

    echo "  🔴 RECORDING — press Enter to stop"
    rec -q -r 16000 -c 1 -e floating-point -b 32 "$TMP_FILE" &
    REC_PID=$!
    read -r

    kill "$REC_PID" 2>/dev/null || true
    wait "$REC_PID" 2>/dev/null || true

    # Trim silence from start and end
    sox "$TMP_FILE" "$TMP_TRIMMED" \
      silence 1 0.3 0.1% \
      reverse \
      silence 1 0.3 0.1% \
      reverse \
      pad 0.2 0.2
    mv "$TMP_TRIMMED" "$TMP_FILE"

    # Normalize audio to -1dB peak to prevent Whisper hallucinations on quiet input
    sox "$TMP_FILE" "$TMP_TRIMMED" norm -1
    mv "$TMP_TRIMMED" "$TMP_FILE"

    duration=$(sox "$TMP_FILE" -n stat 2>&1 | grep "Length" | awk '{print $3}')
    rms=$(sox "$TMP_FILE" -n stat 2>&1 | grep "RMS     amplitude" | head -1 | awk '{print $3}')
    echo "  Duration: ${duration}s — playing back..."
    if python3 -c "exit(0 if float('$rms') < 0.02 else 1)" 2>/dev/null; then
      echo "  ** Warning: very low volume — consider speaking louder or moving closer to mic"
    fi
    play -q "$TMP_FILE"
    echo ""
    echo "  Enter to accept, r to re-record, p to play again"
    read -r confirm

    while [ "$confirm" = "p" ]; do
      play -q "$TMP_FILE"
      echo "  Enter to accept, r to re-record, p to play again"
      read -r confirm
    done

    if [ "$confirm" = "r" ]; then
      echo "  Re-recording..."
      continue
    fi

    cp "$TMP_FILE" "$output_path"
    recorded=$((recorded + 1))
    echo "  saved: $output_path"
    idx=$((idx + 1))
    break
  done
done

echo ""
echo "Done. Recorded $recorded, skipped $skipped ($total total)."
echo "Audio directory: $AUDIO_DIR"
