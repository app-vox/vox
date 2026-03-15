#!/usr/bin/env node
// Windows whisper.cpp installer.
//
// Downloads the official MSVC-built binary from the whisper.cpp GitHub releases.
// MinGW GCC generates AVX code with incorrect stack alignment on Windows,
// causing segfaults during inference. The official MSVC release binaries
// handle AVX correctly.

const { execSync } = require("child_process");
const fs = require("fs");
const https = require("https");
const path = require("path");

const VENDOR_DIR = path.join(__dirname, "..", "vendor", "whisper.cpp");
const WHISPER_VERSION = "1.8.3";
const VERSION_FILE = path.join(VENDOR_DIR, ".version");

const WHISPER_ASSET = "whisper-bin-x64.zip";
const DOWNLOAD_URL = `https://github.com/ggerganov/whisper.cpp/releases/download/v${WHISPER_VERSION}/${WHISPER_ASSET}`;

async function main() {
  // Skip if already installed at the correct version
  const binary = path.join(VENDOR_DIR, "whisper-cli.exe");
  if (
    fs.existsSync(VERSION_FILE) &&
    fs.readFileSync(VERSION_FILE, "utf8").trim() === WHISPER_VERSION &&
    fs.existsSync(binary)
  ) {
    console.log(`[postinstall] whisper.cpp v${WHISPER_VERSION} already installed — skipping.`);
    return;
  }

  console.log(
    `[postinstall] Downloading pre-built whisper.cpp v${WHISPER_VERSION}...`
  );

  fs.mkdirSync(VENDOR_DIR, { recursive: true });

  const zipPath = path.join(VENDOR_DIR, WHISPER_ASSET);

  await downloadFile(DOWNLOAD_URL, zipPath);
  console.log("[postinstall] Download complete. Extracting...");

  // Extract using PowerShell (available on all modern Windows)
  const extractDir = path.join(VENDOR_DIR, "_whisper-bin");
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true });
  }

  execSync(
    `powershell.exe -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`,
    { stdio: "inherit" }
  );

  // Copy binaries from Release/ subfolder to vendor directory
  const releaseDir = path.join(extractDir, "Release");
  const files = fs.readdirSync(releaseDir);

  for (const file of files) {
    const src = path.join(releaseDir, file);
    const dest = path.join(VENDOR_DIR, file);
    fs.copyFileSync(src, dest);
  }

  if (!fs.existsSync(binary)) {
    throw new Error(`Expected binary not found: ${binary}`);
  }

  // Write version marker
  fs.writeFileSync(VERSION_FILE, WHISPER_VERSION);

  // Clean up
  fs.rmSync(extractDir, { recursive: true });
  fs.unlinkSync(zipPath);

  console.log("[postinstall] whisper.cpp binaries installed successfully.");
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (url) => {
      https
        .get(url, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            follow(res.headers.location);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${res.statusCode}`));
            return;
          }

          const fileStream = fs.createWriteStream(dest);
          res.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close(resolve);
          });
          fileStream.on("error", reject);
        })
        .on("error", reject);
    };
    follow(url);
  });
}

main().catch((err) => {
  console.error("[postinstall] Failed:", err.message);
  process.exit(1);
});
