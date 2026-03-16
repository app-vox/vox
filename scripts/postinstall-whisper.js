#!/usr/bin/env node
// Dispatcher: delegates whisper.cpp installation to the platform-specific script.

const path = require("path");

const scripts = {
  darwin: "build-whisper-darwin.sh",
  linux: "build-whisper-darwin.sh",
  win32: "build-whisper-win32.js",
};

const script = scripts[process.platform];

if (!script) {
  console.error(`[postinstall] Unsupported platform: ${process.platform}`);
  process.exit(1);
}

const scriptPath = path.join(__dirname, script);
console.log(`[postinstall] ${process.platform} — delegating to ${script}`);

if (script.endsWith(".sh")) {
  const { execSync } = require("child_process");
  execSync(`bash "${scriptPath}"`, { stdio: "inherit" });
} else {
  require(scriptPath);
}
