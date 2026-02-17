import { PostHog } from "posthog-node";
import ElectronStore from "electron-store";
import { app } from "electron";
import { randomUUID } from "crypto";
import { platform, release, arch } from "os";
import log from "electron-log/main";

const slog = log.scope("Analytics");

interface AnalyticsStoreSchema {
  analyticsDeviceId: string;
}

interface TypedStore {
  get<K extends keyof AnalyticsStoreSchema>(key: K): AnalyticsStoreSchema[K] | undefined;
  set<K extends keyof AnalyticsStoreSchema>(key: K, value: AnalyticsStoreSchema[K]): void;
}

const POSTHOG_API_KEY = "phc_xKMWJw3NXHbfxhW10c3QG3nKTFRGio4PtVeJVfo0lNu";
const POSTHOG_HOST = "https://us.i.posthog.com";

const SENSITIVE_PATTERNS = [
  "key", "token", "secret", "password", "text", "content", "prompt",
];

function sanitizeProperties(
  properties: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_PATTERNS.some((p) => lower.includes(p))) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

export interface AnalyticsInitOptions {
  enabled: boolean;
  locale: string;
}

export class AnalyticsService {
  private posthog: PostHog | null = null;
  private deviceId = "";
  private enabled = false;
  private locale = "en";
  private store: TypedStore | null = null;

  get isDevMode(): boolean {
    return !app.isPackaged;
  }

  init(options: AnalyticsInitOptions): void {
    this.enabled = this.isDevMode ? false : options.enabled;
    this.locale = options.locale;

    try {
      this.store = new ElectronStore({ name: "analytics" }) as unknown as TypedStore;
      const existingId = this.store.get("analyticsDeviceId");
      if (existingId) {
        this.deviceId = existingId;
      } else {
        this.deviceId = randomUUID();
        this.store.set("analyticsDeviceId", this.deviceId);
      }

      this.posthog = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST });

      slog.info("Analytics initialized", {
        enabled: this.enabled,
        devMode: this.isDevMode,
        deviceId: this.deviceId.slice(0, 8) + "...",
      });
    } catch (err) {
      slog.error("Failed to initialize analytics", err);
    }
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.enabled || !this.posthog) return;

    try {
      const baseProps: Record<string, unknown> = {
        app_version: app.getVersion(),
        os_version: `${platform()} ${release()}`,
        arch: arch(),
        locale: this.locale,
        $ip: null,
      };

      const userProps = properties ? sanitizeProperties(properties) : {};

      const msg = {
        distinctId: this.deviceId,
        event,
        properties: { ...baseProps, ...userProps },
      };

      if (this.isDevMode) {
        void this.posthog.captureImmediate(msg).catch((err) => {
          slog.warn("Failed to send analytics event", { event, error: err });
        });
      } else {
        this.posthog.capture(msg);
      }

      slog.debug("Event captured", { event });
    } catch (err) {
      slog.warn("Failed to capture analytics event", { event, error: err });
    }
  }

  captureError(error: Error, context?: Record<string, unknown>): void {
    if (!this.enabled || !this.posthog) return;

    try {
      const props = {
        $ip: null,
        app_version: app.getVersion(),
        os_version: `${platform()} ${release()}`,
        arch: arch(),
        locale: this.locale,
        ...(context ?? {}),
      };

      if (this.isDevMode) {
        void this.posthog.captureExceptionImmediate(error, this.deviceId, props).catch((err) => {
          slog.warn("Failed to send exception", { error: err });
        });
      } else {
        this.posthog.captureException(error, this.deviceId, props);
      }

      slog.debug("Exception captured", { error: error.message });
    } catch (err) {
      slog.warn("Failed to capture error event", err);
    }
  }

  identify(): void {
    if (!this.enabled || !this.posthog) return;
    try {
      this.posthog.identify({
        distinctId: this.deviceId,
        properties: {
          app_version: app.getVersion(),
          os_version: `${platform()} ${release()}`,
          arch: arch(),
          locale: this.locale,
        },
      });
    } catch (err) {
      slog.warn("Failed to identify device", err);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    slog.info("Analytics enabled:", enabled);
  }

  async shutdown(): Promise<void> {
    try {
      await this.posthog?._shutdown();
    } catch (err) {
      slog.warn("Failed to shutdown analytics", err);
    }
  }
}
