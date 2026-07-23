import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  readOfflineSnapshot,
  writeOfflineSnapshot,
} from "@/hooks/use-offline-snapshot";

describe("useOfflineSnapshot", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists a bounded read-only snapshot and restores it on reload", () => {
    expect(writeOfflineSnapshot("mxshare:test:snapshot", [{ id: "project-1" }])).toBe(true);
    expect(
      readOfflineSnapshot<Array<{ id: string }>>("mxshare:test:snapshot"),
    ).toEqual([{ id: "project-1" }]);
  });

  it("drops snapshots after their retention window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T10:00:00Z"));
    writeOfflineSnapshot("mxshare:test:expired", { message: "cached" });

    vi.setSystemTime(new Date("2026-08-23T10:00:01Z"));

    expect(
      readOfflineSnapshot<{ message: string }>("mxshare:test:expired"),
    ).toBeNull();
    expect(window.localStorage.getItem("mxshare:test:expired")).toBeNull();
  });
});
