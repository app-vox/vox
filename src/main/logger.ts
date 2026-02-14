import log from "electron-log/main";

const TEN_MB = 10 * 1024 * 1024;
const VALID_LEVELS = new Set(["error", "warn", "info", "verbose", "debug", "silly"]);

type LogLevel = "error" | "warn" | "info" | "verbose" | "debug" | "silly";

log.transports.file.maxSize = TEN_MB;

const rawLevel = process.env.VOX_LOG_LEVEL;
const envLevel: LogLevel | undefined = rawLevel && VALID_LEVELS.has(rawLevel)
  ? (rawLevel as LogLevel)
  : undefined;
const isDev = process.env.NODE_ENV !== "production";

if (envLevel) {
  log.transports.file.level = envLevel;
  log.transports.console.level = envLevel;
} else if (isDev) {
  log.transports.file.level = "debug";
  log.transports.console.level = "debug";
} else {
  log.transports.file.level = "info";
  log.transports.console.level = "warn";
}

log.errorHandler.startCatching();

export default log;
