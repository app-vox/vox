// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen, cleanup } from "@testing-library/react";
import { TranscriptionsPanel } from "../../../src/renderer/components/transcriptions/TranscriptionsPanel";
import { installVoxApiMock, resetStores, renderWithI18n } from "../helpers/setup";
import type { TranscriptionEntry } from "../../../src/shared/types";
import type { VoxAPI } from "../../../src/preload/index";

// The svgr transform of `?react` imports does not run under vitest: icons render as plain svg.
vi.mock("../../../src/shared/icons", () => ({
  ...Object.fromEntries(
    [
      "SearchIcon", "CheckIcon", "CopyIcon", "TrashAltIcon", "ChevronsLeftIcon", "ChevronLeftIcon",
      "ChevronRightIcon", "ChevronsRightIcon", "InfoCircleIcon", "PlayIcon", "PauseIcon", "DownloadIcon",
      "RefreshIcon", "AlertTriangleIcon", "EllipsisVerticalIcon", "ChevronDownIcon",
    ].map((name) => [name, (props: Record<string, unknown>) => <svg data-testid={name} {...props} />]),
  ),
}));

function entry(extra: Partial<TranscriptionEntry> = {}): TranscriptionEntry {
  return {
    id: "e1",
    timestamp: new Date().toISOString(),
    text: "Hello there.",
    originalText: "Hello there.",
    wordCount: 2,
    audioDurationMs: 2000,
    whisperModel: "small",
    llmEnhanced: false,
    status: "success",
    audioFilePath: "/audio/a.wav",
    ...extra,
  };
}

describe("TranscriptionsPanel incomplete badge", () => {
  let api: VoxAPI;

  beforeEach(() => {
    api = installVoxApiMock();
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  function listing(e: TranscriptionEntry) {
    api.history.get = () => Promise.resolve({ entries: [e], total: 1 });
  }

  it("panel shows the badge", async () => {
    listing(entry({ incomplete: true }));
    renderWithI18n(<TranscriptionsPanel />);

    expect(await screen.findByText("Incomplete")).toBeInTheDocument();
    expect(screen.getByText("Hello there.")).toBeInTheDocument();
    expect(screen.getByTitle("Play audio")).toBeInTheDocument();
    expect(screen.getByTitle("Copy to clipboard")).toBeInTheDocument();
  });

  it("entry without the field shows no badge", async () => {
    listing(entry());
    renderWithI18n(<TranscriptionsPanel />);

    expect(await screen.findByText("Hello there.")).toBeInTheDocument();
    expect(screen.queryByText("Incomplete")).toBeNull();
  });
});
