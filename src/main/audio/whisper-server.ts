import { spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as net from "net";
import * as path from "path";
import * as os from "os";
import { app } from "electron";
import log from "electron-log/main";

const slog = log.scope("WhisperServer");

const appRoot = app.getAppPath().replace("app.asar", "app.asar.unpacked");
const WHISPER_CPP_DIR = path.join(appRoot, "node_modules/whisper-node/lib/whisper.cpp");
const SERVER_BIN = path.join(WHISPER_CPP_DIR, "whisper-server.exe");

const STARTUP_TIMEOUT_MS = 15_000;
const INFERENCE_TIMEOUT_MS = 30_000;

// On Windows/Linux (CPU-only), using ~75% of cores gives the best throughput
// without starving the OS. Minimum 4 to avoid slowdowns on low-core machines.
const WHISPER_THREADS = Math.max(4, Math.floor(os.cpus().length * 0.75));

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as net.AddressInfo;
      server.close(() => resolve(addr.port));
    });
    server.on("error", reject);
  });
}

export class WhisperServer {
  private proc: ChildProcess | null = null;
  private port = 0;
  private modelPath = "";
  private ready = false;
  private starting = false;

  async start(modelPath: string): Promise<void> {
    if (this.proc && this.modelPath === modelPath) return;
    if (this.proc) await this.stop();

    this.modelPath = modelPath;

    if (!fs.existsSync(SERVER_BIN)) {
      throw new Error(`whisper-server binary not found: ${SERVER_BIN}`);
    }
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Whisper model not found: ${modelPath}`);
    }

    this.starting = true;
    this.ready = false;
    this.port = await findFreePort();

    slog.info("Starting whisper-server", { port: this.port, model: path.basename(modelPath), threads: WHISPER_THREADS });

    this.proc = spawn(SERVER_BIN, [
      "--host", "127.0.0.1",
      "--port", String(this.port),
      "-m", modelPath,
      "-t", String(WHISPER_THREADS),
      "--no-gpu",
    ], {
      cwd: WHISPER_CPP_DIR,
      stdio: "ignore",
      windowsHide: true,
    });

    this.proc.on("exit", (code, signal) => {
      // Guard: during app shutdown the console transport may already be torn
      // down, causing EPIPE if we try to log here.
      try { slog.warn("whisper-server exited", { code, signal }); } catch { /* ignore */ }
      this.proc = null;
      this.ready = false;
      this.starting = false;
    });

    this.proc.on("error", (err) => {
      try { slog.error("whisper-server spawn error", err); } catch { /* ignore */ }
      this.proc = null;
      this.ready = false;
      this.starting = false;
    });

    await this.waitForReady();
  }

  async stop(): Promise<void> {
    if (!this.proc) return;

    try { slog.info("Stopping whisper-server"); } catch { /* ignore */ }
    const proc = this.proc;
    this.proc = null;
    this.ready = false;
    this.starting = false;

    proc.kill("SIGTERM");

    // Give it a moment to exit gracefully, then force kill
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        try { proc.kill("SIGKILL"); } catch { /* already dead */ }
        resolve();
      }, 2000);
      proc.on("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  isReady(): boolean {
    return this.ready && this.proc !== null;
  }

  async transcribe(wavPath: string, language: string, prompt: string): Promise<string> {
    if (!this.ready || !this.proc) {
      throw new Error("whisper-server is not running");
    }

    const fileBuffer = fs.readFileSync(wavPath);
    const boundary = `----VoxBoundary${Date.now()}`;

    const fields: Record<string, string> = {
      response_format: "json",
    };
    if (language && language !== "auto") {
      fields.language = language;
    }
    if (prompt) {
      fields.prompt = prompt;
    }

    // Build multipart body
    const parts: Buffer[] = [];

    for (const [key, value] of Object.entries(fields)) {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      ));
    }

    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`
    ));
    parts.push(fileBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const responseBody = await new Promise<string>((resolve, reject) => {
      const req = http.request({
        hostname: "127.0.0.1",
        port: this.port,
        path: "/inference",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
        timeout: INFERENCE_TIMEOUT_MS,
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode !== 200) {
            reject(new Error(`whisper-server returned ${res.statusCode}: ${text}`));
            return;
          }
          resolve(text);
        });
      });

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy(new Error("whisper-server inference timed out"));
      });

      req.write(body);
      req.end();
    });

    const parsed = JSON.parse(responseBody) as { text?: string };
    return (parsed.text ?? "").trim();
  }

  private async waitForReady(): Promise<void> {
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    const POLL_INTERVAL_MS = 300;

    while (Date.now() < deadline) {
      if (!this.proc) {
        throw new Error("whisper-server exited during startup");
      }

      const alive = await this.httpProbe();
      if (alive) {
        this.ready = true;
        this.starting = false;
        slog.info("whisper-server is ready", { port: this.port });
        return;
      }

      await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    this.starting = false;
    throw new Error(`whisper-server failed to start within ${STARTUP_TIMEOUT_MS}ms`);
  }

  /** Send a lightweight HTTP request to check if the server is accepting connections. */
  private httpProbe(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const req = http.get({
        hostname: "127.0.0.1",
        port: this.port,
        path: "/",
        timeout: 500,
      }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
    });
  }
}
