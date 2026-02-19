import { vi } from "vitest";

// Globally mock koffi (native FFI addon) to prevent tests from posting real
// macOS CGEvent keystrokes (Cmd+V) to the system.  Without this, any test
// that transitively imports src/main/input/paster.ts can trigger an actual
// system-wide paste via CoreGraphics — even outside the terminal.
vi.mock("koffi", () => ({
  load: vi.fn().mockReturnValue({
    func: vi.fn().mockReturnValue(vi.fn().mockReturnValue({})),
  }),
}));
