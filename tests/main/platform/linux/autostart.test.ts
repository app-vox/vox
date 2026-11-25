import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/usr/bin/vox"),
    getName: vi.fn().mockReturnValue("Vox"),
  },
}));

vi.mock("electron-log/main", () => ({
  default: { scope: () => ({ info: vi.fn(), warn: vi.fn() }) },
}));

describe("linux autostart", () => {
  let tmpDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vox-autostart-"));
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = tmpDir;
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates .desktop file when enabled", async () => {
    const { setEnabled, isEnabled } = await import("../../../../src/main/platform/linux/autostart");
    setEnabled(true);
    const desktopFile = path.join(tmpDir, "autostart", "vox.desktop");
    expect(fs.existsSync(desktopFile)).toBe(true);
    const content = fs.readFileSync(desktopFile, "utf-8");
    expect(content).toContain("[Desktop Entry]");
    expect(content).toContain("Name=Vox");
    expect(content).toContain("--hidden");
    expect(isEnabled()).toBe(true);
  });

  it("removes .desktop file when disabled", async () => {
    const { setEnabled, isEnabled } = await import("../../../../src/main/platform/linux/autostart");
    setEnabled(true);
    setEnabled(false);
    const desktopFile = path.join(tmpDir, "autostart", "vox.desktop");
    expect(fs.existsSync(desktopFile)).toBe(false);
    expect(isEnabled()).toBe(false);
  });
});
