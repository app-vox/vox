#!/usr/bin/env bash
# Replaces the default Electron icon with the Vox dev icon so the dock/taskbar
# shows the correct branding during development.

set -euo pipefail

ELECTRON_DIR="node_modules/electron/dist"

case "$(uname -s)" in
  Darwin)
    cp build/icon-dev.icns "$ELECTRON_DIR/Electron.app/Contents/Resources/electron.icns"
    touch "$ELECTRON_DIR/Electron.app"
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$ELECTRON_DIR/Electron.app"
    ;;
  MINGW*|MSYS*|CYGWIN*|Windows_NT)
    # electron.exe embeds its icon at build time; rcedit can swap it at dev time
    if command -v npx &>/dev/null && npx rcedit --help &>/dev/null 2>&1; then
      npx rcedit "$ELECTRON_DIR/electron.exe" --set-icon build/icon-dev.ico
    else
      echo "warning: rcedit not available, skipping dev icon on Windows" >&2
    fi
    ;;
  *)
    # Linux: no reliable way to change the dock icon at runtime; skip silently
    ;;
esac
