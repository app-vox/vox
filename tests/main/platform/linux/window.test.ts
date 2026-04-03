import { describe, it, expect } from "vitest";
import {
  homeWindowOptions,
  hudWindowOptions,
  appMenuPlatformItems,
  supportsHideOnClose,
  defaultShortcuts,
  supportsMouseForward,
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

  it("uses DoubleTap:Ctrl shortcuts to avoid GNOME Alt interception", () => {
    expect(defaultShortcuts.hold).toBe("DoubleTap:Ctrl");
    expect(defaultShortcuts.toggle).toBe("DoubleTap:Ctrl");
  });

  it("does not support mouse forward (Linux limitation)", () => {
    expect(supportsMouseForward).toBe(false);
  });
});
