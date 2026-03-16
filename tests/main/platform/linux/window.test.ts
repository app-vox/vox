import { describe, it, expect } from "vitest";
import {
  homeWindowOptions,
  hudWindowOptions,
  appMenuPlatformItems,
  supportsHideOnClose,
} from "../../../../src/main/platform/linux/window";

describe("linux display", () => {
  it("uses frameless window for home", () => {
    expect(homeWindowOptions).toEqual({ frame: false });
  });

  it("has no special HUD window options", () => {
    expect(hudWindowOptions).toEqual({});
  });

  it("has no platform menu items", () => {
    expect(appMenuPlatformItems).toEqual([]);
  });

  it("does not support hide-on-close", () => {
    expect(supportsHideOnClose).toBe(false);
  });
});
