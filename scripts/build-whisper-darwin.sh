#!/usr/bin/env bash
# Build whisper.cpp from source and place the binary under vendor/whisper.cpp/
# Skips rebuild if the cached version matches the target version.
set -euo pipefail

WHISPER_VERSION="1.8.3"
VENDOR_DIR="$(cd "$(dirname "$0")/.." && pwd)/vendor/whisper.cpp"
VERSION_FILE="${VENDOR_DIR}/.version"
BINARY="${VENDOR_DIR}/whisper-cli"

# ── Skip if already built ────────────────────────────────────────────
if [[ -f "$VERSION_FILE" && "$(cat "$VERSION_FILE")" == "$WHISPER_VERSION" && -x "$BINARY" ]]; then
  echo "whisper.cpp v${WHISPER_VERSION} already built — skipping."
  exit 0
fi

echo "Building whisper.cpp v${WHISPER_VERSION}..."

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

TARBALL_URL="https://github.com/ggerganov/whisper.cpp/archive/refs/tags/v${WHISPER_VERSION}.tar.gz"
SRC_DIR="${TMPDIR}/whisper.cpp-${WHISPER_VERSION}"
BUILD_DIR="${TMPDIR}/build"

# ── Download ─────────────────────────────────────────────────────────
echo "Downloading whisper.cpp v${WHISPER_VERSION}..."
curl -fSL "$TARBALL_URL" | tar xz -C "$TMPDIR"

# ── Configure ────────────────────────────────────────────────────────
CMAKE_FLAGS=(
  -DCMAKE_BUILD_TYPE=Release
  -DBUILD_SHARED_LIBS=OFF
  -DWHISPER_BUILD_TESTS=OFF
  -DWHISPER_BUILD_EXAMPLES=ON
)

# Enable Metal acceleration on macOS
if [[ "$(uname -s)" == "Darwin" ]]; then
  CMAKE_FLAGS+=(-DGGML_METAL=ON)
fi

echo "Configuring with CMake..."
cmake -S "$SRC_DIR" -B "$BUILD_DIR" "${CMAKE_FLAGS[@]}"

# ── Build ────────────────────────────────────────────────────────────
NPROC=$(sysctl -n hw.logicalcpu 2>/dev/null || nproc 2>/dev/null || echo 4)
echo "Compiling with ${NPROC} threads..."
cmake --build "$BUILD_DIR" --config Release --target whisper-cli -j "$NPROC"

# ── Install ──────────────────────────────────────────────────────────
mkdir -p "$VENDOR_DIR"

# Copy the binary
cp "$BUILD_DIR/bin/whisper-cli" "$BINARY"
chmod +x "$BINARY"

# Copy Metal shader files if present (macOS)
if [[ "$(uname -s)" == "Darwin" ]]; then
  find "$BUILD_DIR" -name "*.metal" -exec cp {} "$VENDOR_DIR/" \; 2>/dev/null || true
  find "$BUILD_DIR" -name "default.metallib" -exec cp {} "$VENDOR_DIR/" \; 2>/dev/null || true
fi

# Write version marker
echo "$WHISPER_VERSION" > "$VERSION_FILE"

echo "whisper.cpp v${WHISPER_VERSION} built successfully at ${BINARY}"
