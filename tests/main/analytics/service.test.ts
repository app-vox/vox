import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock electron-log
vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock electron-store
const mockStoreGet = vi.fn();
const mockStoreSet = vi.fn();
vi.mock("electron-store", () => {
  const MockStore = vi.fn().mockImplementation(function () {
    (this as Record<string, unknown>).get = mockStoreGet;
    (this as Record<string, unknown>).set = mockStoreSet;
  });
  return { default: MockStore };
});

// Mock posthog-node
const mockCapture = vi.fn();
const mockIdentify = vi.fn();
const mockShutdown = vi.fn().mockResolvedValue(undefined);
vi.mock("posthog-node", () => {
  const MockPostHog = class {
    capture = mockCapture;
    identify = mockIdentify;
    shutdown = mockShutdown;
  };
  return { PostHog: MockPostHog };
});

// Mock electron app
vi.mock("electron", () => ({
  app: {
    getVersion: vi.fn().mockReturnValue("0.6.1"),
    isPackaged: true,
  },
}));

import { AnalyticsService } from "../../../src/main/analytics/service";
import { app } from "electron";
import ElectronStore from "electron-store";

describe("AnalyticsService", () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreGet.mockReturnValue(undefined);
    service = new AnalyticsService();
  });

  afterEach(() => {
    service.shutdown();
  });

  describe("init", () => {
    it("should generate and store a new device ID on first init", () => {
      service.init({ enabled: true, locale: "en" });
      expect(mockStoreSet).toHaveBeenCalledWith(
        "analyticsDeviceId",
        expect.stringMatching(/^[0-9a-f-]{36}$/)
      );
    });

    it("should reuse existing device ID on subsequent inits", () => {
      const existingId = "existing-uuid-1234";
      mockStoreGet.mockReturnValue(existingId);
      service.init({ enabled: true, locale: "en" });
      expect(mockStoreSet).not.toHaveBeenCalledWith("analyticsDeviceId", expect.anything());
    });
  });

  describe("track", () => {
    it("should capture events when enabled", () => {
      service.init({ enabled: true, locale: "en" });
      service.track("test_event", { foo: "bar" });
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "test_event",
          properties: expect.objectContaining({
            foo: "bar",
            app_version: "0.6.1",
            locale: "en",
          }),
        })
      );
    });

    it("should not capture events when disabled", () => {
      service.init({ enabled: false, locale: "en" });
      service.track("test_event", { foo: "bar" });
      expect(mockCapture).not.toHaveBeenCalled();
    });

    it("should strip sensitive properties", () => {
      service.init({ enabled: true, locale: "en" });
      service.track("test_event", {
        safe_field: "ok",
        apiKey: "secret123",
        token: "abc",
        password: "hunter2",
        text: "some content",
        content: "body",
        prompt: "my prompt",
        secretAccessKey: "aws-key",
      });
      const capturedProps = mockCapture.mock.calls[0][0].properties;
      expect(capturedProps.safe_field).toBe("ok");
      expect(capturedProps.apiKey).toBeUndefined();
      expect(capturedProps.token).toBeUndefined();
      expect(capturedProps.password).toBeUndefined();
      expect(capturedProps.text).toBeUndefined();
      expect(capturedProps.content).toBeUndefined();
      expect(capturedProps.prompt).toBeUndefined();
      expect(capturedProps.secretAccessKey).toBeUndefined();
    });

    it("should attach automatic properties to every event", () => {
      service.init({ enabled: true, locale: "pt-BR" });
      service.track("test_event");
      const capturedProps = mockCapture.mock.calls[0][0].properties;
      expect(capturedProps.app_version).toBe("0.6.1");
      expect(capturedProps.locale).toBe("pt-BR");
      expect(capturedProps.os_version).toBeDefined();
      expect(capturedProps.arch).toBeDefined();
      expect(capturedProps.$ip).toBeNull();
    });
  });

  describe("captureError", () => {
    it("should capture error events with stack trace", () => {
      service.init({ enabled: true, locale: "en" });
      const error = new Error("test error");
      service.captureError(error, { scope: "Pipeline" });
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "error_uncaught",
          properties: expect.objectContaining({
            error_message: "test error",
            stack_trace: expect.stringContaining("Error: test error"),
            scope: "Pipeline",
          }),
        })
      );
    });

    it("should not capture errors when disabled", () => {
      service.init({ enabled: false, locale: "en" });
      service.captureError(new Error("test"));
      expect(mockCapture).not.toHaveBeenCalled();
    });
  });

  describe("identify", () => {
    it("should call posthog identify with device properties", () => {
      service.init({ enabled: true, locale: "en" });
      service.identify();
      expect(mockIdentify).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            app_version: "0.6.1",
            locale: "en",
          }),
        })
      );
    });
  });

  describe("setEnabled", () => {
    it("should toggle analytics on and off at runtime", () => {
      service.init({ enabled: true, locale: "en" });
      service.setEnabled(false);
      service.track("should_not_send");
      expect(mockCapture).not.toHaveBeenCalled();
      service.setEnabled(true);
      service.track("should_send");
      expect(mockCapture).toHaveBeenCalledTimes(1);
    });
  });

  describe("shutdown", () => {
    it("should call posthog shutdown", async () => {
      service.init({ enabled: true, locale: "en" });
      await service.shutdown();
      expect(mockShutdown).toHaveBeenCalled();
    });
  });

  describe("dev mode", () => {
    it("should force disable analytics when app is not packaged", () => {
      Object.defineProperty(app, "isPackaged", { value: false, configurable: true });
      service.init({ enabled: true, locale: "en" });
      service.track("test_event");
      expect(mockCapture).not.toHaveBeenCalled();
      Object.defineProperty(app, "isPackaged", { value: true, configurable: true });
    });

    it("should allow enabling analytics in dev mode via setEnabled", () => {
      Object.defineProperty(app, "isPackaged", { value: false, configurable: true });
      service.init({ enabled: true, locale: "en" });
      service.setEnabled(true);
      service.track("test_event");
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({ event: "test_event" })
      );
      Object.defineProperty(app, "isPackaged", { value: true, configurable: true });
    });
  });

  describe("error resilience", () => {
    it("should not throw when PostHog capture fails", () => {
      service.init({ enabled: true, locale: "en" });
      mockCapture.mockImplementation(() => { throw new Error("network error"); });
      expect(() => service.track("test_event")).not.toThrow();
    });

    it("should not throw when ElectronStore constructor fails", () => {
      vi.mocked(ElectronStore).mockImplementationOnce(() => { throw new Error("store error"); });
      const failService = new AnalyticsService();
      expect(() => failService.init({ enabled: true, locale: "en" })).not.toThrow();
    });
  });
});
